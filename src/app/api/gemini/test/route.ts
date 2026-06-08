import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { db } from '@/lib/firebaseAdmin';

export async function POST() {
  try {
    let apiKey = process.env.GEMINI_API_KEY;

    if (db) {
      const doc = await db.collection('settings').doc('gemini').get();
      if (doc.exists && doc.data()?.apiKey) {
        apiKey = doc.data()?.apiKey;
      }
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'API Key not found. Please save it in settings.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Simple prompt to test if the connection works
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Reply exactly with: Connection Successful',
    });

    if (response.text?.includes('Connection Successful')) {
      return NextResponse.json({ success: true, message: 'Gemini API is connected successfully!' });
    } else {
      return NextResponse.json({ success: false, message: 'Received unexpected response from Gemini.' }, { status: 500 });
    }
  } catch (error: any) {
    let errorMessage = error.message || String(error);
    if (errorMessage.includes('fetch failed')) {
      errorMessage = 'Fetch failed (TLS/Network error). If running locally, set NODE_TLS_REJECT_UNAUTHORIZED="0".';
    } else if (errorMessage.includes('403') || errorMessage.includes('billing')) {
      errorMessage = 'Billing is not enabled or key is invalid.';
    } else if (errorMessage.includes('400')) {
      errorMessage = 'Invalid API Key format.';
    } else if (errorMessage.includes('503')) {
      errorMessage = 'Google API is temporarily down (503 Service Unavailable). Check Google AI Studio.';
    }
    
    console.error('Gemini Test Error:', error);
    return NextResponse.json({ success: false, message: `Failed: ${errorMessage}` }, { status: 500 });
  }
}
