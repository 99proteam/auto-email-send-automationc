import { GoogleGenAI } from '@google/genai';
import { db } from './firebaseAdmin';

export async function callWithRetry(fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> {
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

export async function getGeminiClient() {
  let apiKey = process.env.GEMINI_API_KEY;

  if (db) {
    const doc = await db.collection('settings').doc('gemini').get();
    if (doc.exists && doc.data()?.apiKey) {
      apiKey = doc.data()?.apiKey;
    }
  }

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment or database.');
  }

  return new GoogleGenAI({ apiKey });
}

function buildProductContext(product: any): string {
  let context = '';
  if (product.name) context += `Product Name: ${product.name}\n`;
  if (product.url) context += `Product URL: ${product.url}\n`;
  if (product.description) context += `Description: ${product.description}\n`;
  if (product.pricing_info) context += `Pricing: ${product.pricing_info}\n`;
  if (product.target_audience) context += `Target Audience: ${product.target_audience}\n`;
  if (product.features && Array.isArray(product.features)) {
    context += `Features: ${product.features.join(', ')}\n`;
  }
  // Custom fields added by user (coupon, payment link, etc.)
  if (product.customFields && Array.isArray(product.customFields)) {
    for (const field of product.customFields) {
      context += `${field.title}: ${field.value || ''}${field.link ? ' — Link: ' + field.link : ''}\n`;
    }
  }
  return context;
}

export async function getFullProductContext(productId: string): Promise<string> {
  if (!db || !productId) return '';
  try {
    const doc = await db.collection('products').doc(productId).get();
    if (!doc.exists) return '';
    return buildProductContext({ id: doc.id, ...doc.data() });
  } catch {
    return '';
  }
}

export async function generateEmailDraft(productContext: string, leadInfo: any) {
  const ai = await getGeminiClient();
  const prompt = `You are a professional sales representative. Write a compelling, personalized cold outreach email to ${leadInfo.name || leadInfo.email}.

IMPORTANT RULES:
- NEVER write placeholder text like "[Link to Product Page]" or "[Your Name]" or "[Company]".
- If a Product URL is provided below, use that EXACT URL in the email.
- If pricing is provided, mention the actual price.
- If a coupon code is provided, you may mention it as a special offer.
- Keep the email concise, professional, and persuasive.
- Include a clear call to action with the actual product link.
- Write the email body only, no subject line.

Product Information:
${productContext}

The goal is to convert them to a customer.`;

  const response = await callWithRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }));

  return response.text;
}

export async function analyzeReplyAndRespond(replyBody: string, threadHistory: string, productContext: string) {
  const ai = await getGeminiClient();
  const prompt = `You are a professional sales representative handling an ongoing email conversation with a potential customer.

IMPORTANT RULES:
- NEVER write placeholder text like "[Link to Product Page]" or "[Your Name]" or "[Company]".
- If a Product URL is provided, use that EXACT URL when they ask for links.
- If pricing info is provided, give the ACTUAL price when asked.
- If a coupon/discount code is available, offer it when appropriate.
- If a payment link is available, share it when they want to buy.
- Write naturally and professionally. No brackets or placeholders.
- If the question is COMPLETELY unrelated to the product or you genuinely cannot answer it from the provided context, reply EXACTLY with: "REQUIRES_MANUAL_INTERVENTION"

CRITICAL ANTI-SPAM RULES (MUST FOLLOW):
- Keep your response SHORT. Maximum 2 or 3 short paragraphs.
- DO NOT list more than 1 or 2 products, even if the context has many. Suggest the single best fit.
- DO NOT include more than 1 or 2 URLs total. Too many links trigger spam filters.
- Sound conversational, human, and concise. Do NOT sound like an aggressive marketer or a massive catalog.

Product Information:
${productContext}

Conversation History:
${threadHistory}

Latest Reply from Lead:
${replyBody}

Write a polite, helpful, and concise response. Use actual links and prices from the product info above, but strictly follow the anti-spam rules.`;

  const response = await callWithRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }));

  return response.text;
}

export async function generateFollowUpDraft(productContext: string, leadInfo: any, followUpCount: number) {
  const ai = await getGeminiClient();
  const prompt = `You are a professional sales representative. You previously emailed ${leadInfo.name || leadInfo.email} about a product but they haven't replied.

IMPORTANT RULES:
- NEVER write placeholder text like "[Link to Product Page]" or "[Your Name]".
- Use the actual product URL and pricing from the info below.
- This is follow-up email number ${followUpCount}.
- Keep it short, polite, and add a little more value each time.
- Include the actual product link.

Product Information:
${productContext}

Write a concise follow-up email.`;

  const response = await callWithRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }));

  return response.text;
}
