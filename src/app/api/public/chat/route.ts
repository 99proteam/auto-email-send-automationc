import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { GoogleGenAI } from '@google/genai';
import { getFullProductContext, callWithRetry } from '@/lib/gemini';

// 10 messages per 24 hours
const RATE_LIMIT_COUNT = 10;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const body = await req.json();
    const { message, history } = body;
    if (!message) return NextResponse.json({ error: 'Missing message' }, { status: 400 });

    // 1. Get Client IP Address securely
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown-ip';
    
    // 2. Rate Limiting Check
    const rateLimitRef = db.collection('chat_rate_limits').doc(ip);
    const rateLimitDoc = await rateLimitRef.get();
    
    let currentCount = 0;
    let resetAt = Date.now() + RATE_LIMIT_WINDOW_MS;

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data()!;
      if (Date.now() < data.resetAt) {
        currentCount = data.count || 0;
        resetAt = data.resetAt;
      }
    }

    if (currentCount >= RATE_LIMIT_COUNT && ip !== 'unknown-ip') {
      return NextResponse.json({ 
        error: 'Rate limit exceeded. You can send a maximum of 10 messages per 24 hours.',
        rateLimited: true
      }, { status: 429 });
    }

    // 3. Setup Gemini
    let apiKey = process.env.GEMINI_API_KEY;
    const settingsDoc = await db.collection('settings').doc('gemini').get();
    if (settingsDoc.exists && settingsDoc.data()?.apiKey) {
      apiKey = settingsDoc.data()?.apiKey;
    }

    if (!apiKey) return NextResponse.json({ error: 'AI not configured.' }, { status: 500 });
    const ai = new GoogleGenAI({ apiKey });

    // 4. Build Master Context from all active products
    const productsSnap = await db.collection('products').get();
    let masterContext = 'Master Product Catalog:\n\n';
    for (const pDoc of productsSnap.docs) {
      masterContext += `--- PRODUCT: ${pDoc.data().name} ---\n`;
      const ctx = await getFullProductContext(pDoc.id);
      masterContext += ctx + '\n\n';
    }

    // 5. Format Conversation History
    const threadHistory = Array.isArray(history) 
      ? history.map((h: any) => `[${h.role === 'user' ? 'LEAD' : 'US'}] ${h.content}`).join('\n---\n')
      : '';

    // 6. Generate Reply
    const prompt = `You are a helpful AI Sales Assistant on our company's public knowledge base website.
You are chatting live with a visitor.

CRITICAL ANTI-SPAM & CONVERSATION RULES:
- Keep your response SHORT. Maximum 1 or 2 short paragraphs.
- Do NOT list all products. Suggest the single best product that fits their question.
- Do NOT include more than 1 or 2 URLs. 
- Sound conversational, human, and concise. 
- If they ask a general question, ask them to clarify what they need help with.
- You have a strict limit on how much you can say. Be helpful but brief.
- If they want to buy, provide the exact Product URL or Payment Link.
- If they ask for discounts, check the custom fields for coupon codes.

Product Information:
${masterContext}

Conversation History:
${threadHistory}

Latest Message from Visitor:
${message}

Write a polite, helpful, and concise response.`;

    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }));

    // 7. Increment Rate Limit (only if AI succeeds)
    await rateLimitRef.set({
      ip,
      count: currentCount + 1,
      resetAt
    }, { merge: true });

    return NextResponse.json({ success: true, reply: response.text, remaining: RATE_LIMIT_COUNT - (currentCount + 1) });
  } catch (err: any) {
    console.error('Public Chat Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
