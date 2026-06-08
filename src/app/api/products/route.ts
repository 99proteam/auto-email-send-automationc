import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { GoogleGenAI } from '@google/genai';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { fileContent } = await req.json();
    if (!fileContent) return NextResponse.json({ error: 'Missing file content' }, { status: 400 });

    let apiKey = process.env.GEMINI_API_KEY;
    if (db) {
      const doc = await db.collection('settings').doc('gemini').get();
      if (doc.exists && doc.data()?.apiKey) {
        apiKey = doc.data()?.apiKey;
      }
    }

    if (!apiKey) return NextResponse.json({ error: 'Missing Gemini key. Please add it in settings.' }, { status: 400 });

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      You are an expert product analyst. Extract product information from the following text into a JSON array of objects.
      Each object must have: "name", "url", "description", "features" (array of strings), "pricing_info", and "target_audience".
      Return ONLY raw JSON array.
      
      Text:
      ${fileContent.substring(0, 30000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let jsonStr = (response.text || '').trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();

    const products = JSON.parse(jsonStr);
    
    // Save to Firestore
    for (const product of products) {
      await db.collection('products').add({
        ...product,
        createdAt: new Date() // Since Admin FieldValue might have issues with imports here
      });
    }

    return NextResponse.json({ success: true, count: products.length });
  } catch (err: any) {
    console.error('Upload Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    await db.collection('products').doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
