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

export async function generateEmailDraft(productInfo: string, leadInfo: any) {
  const ai = await getGeminiClient();
  const prompt = `You are a professional sales representative. Write a compelling, personalized email to ${leadInfo.name || leadInfo.email}. 
Product context: ${productInfo}
The goal is to convert them to a customer. Include a call to action. Keep it concise.`;

  const response = await callWithRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }));

  return response.text;
}

export async function analyzeReplyAndRespond(replyBody: string, previousContext: string, productInfo: string) {
  const ai = await getGeminiClient();
  const prompt = `You are a professional sales representative. A lead has replied to our promotional email.
Previous Context: ${previousContext}
Product Info: ${productInfo}
Lead Reply: ${replyBody}

Analyze the reply. If they are asking a question, answer it based on the Product Info. If they ask for a discount, you can offer a 10% coupon: "WELCOME10". If the question is entirely unrelated or unanswerable based on the context, reply exactly with: "REQUIRES_MANUAL_INTERVENTION". Otherwise, write a polite and persuasive response to convert them to a customer.`;

  const response = await callWithRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }));

  return response.text;
}

export async function generateFollowUpDraft(productInfo: string, leadInfo: any, followUpCount: number) {
  const ai = await getGeminiClient();
  const prompt = `You are a professional sales representative. You previously emailed ${leadInfo.name || leadInfo.email} about the following product but they haven't replied.
Product context: ${productInfo}
This is follow-up email number ${followUpCount}.
Write a polite, concise follow-up email to check in. Try to provide a little more value or a quick question to prompt a response. Keep it short.`;

  const response = await callWithRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  }));

  return response.text;
}
