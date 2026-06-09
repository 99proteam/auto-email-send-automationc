import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { GoogleGenAI } from '@google/genai';

import { getFullProductContext } from '@/lib/gemini';

async function callWithRetry(fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRetryable = err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE') || err?.message?.includes('high demand');
      if (!isRetryable || i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
}

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { productId, message } = await req.json();
    if (!productId || !message) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const doc = await db.collection('products').doc(productId).get();
    if (!doc.exists) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    const product = doc.data();

    let apiKey = process.env.GEMINI_API_KEY;
    if (db) {
      const geminiDoc = await db.collection('settings').doc('gemini').get();
      if (geminiDoc.exists && geminiDoc.data()?.apiKey) {
        apiKey = geminiDoc.data()?.apiKey;
      }
    }

    if (!apiKey) return NextResponse.json({ error: 'Missing Gemini key. Please add it in settings.' }, { status: 400 });

    const ai = new GoogleGenAI({ apiKey });
    
    const productContext = await getFullProductContext(productId);
    
    const prompt = `
      You are an expert sales representative for a product.
      
      Product Information:
      ${productContext}
      
      Additional Instructions/Corrections from the user:
      ${product?.corrections || 'None.'}

      A potential customer asks: "${message}"
      
      Reply professionally, convincingly, and directly answer their question based ONLY on the provided information and instructions.
    `;

    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }));

    return NextResponse.json({ success: true, reply: response.text });
  } catch (err: any) {
    console.error('Chat Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

