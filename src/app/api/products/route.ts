import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { GoogleGenAI } from '@google/genai';
import { callWithRetry } from '@/lib/gemini';

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

    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    }));

    let jsonStr = (response.text || '').trim();
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();

    const products = JSON.parse(jsonStr);
    
    // Save to Firestore
    for (const product of products) {
      await db.collection('products').add({
        ...product,
        createdAt: new Date()
      });
    }

    return NextResponse.json({ success: true, count: products.length });
  } catch (err: any) {
    console.error('Upload Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const body = await req.json();
    const { id, fileContent, name, description, features, pricing_info, target_audience, url } = body;
    
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    if (fileContent) {
      let apiKey = process.env.GEMINI_API_KEY;
      const doc = await db.collection('settings').doc('gemini').get();
      if (doc.exists && doc.data()?.apiKey) apiKey = doc.data()?.apiKey;

      if (!apiKey) return NextResponse.json({ error: 'Missing Gemini key.' }, { status: 400 });
      const ai = new GoogleGenAI({ apiKey });
      
      const productDoc = await db.collection('products').doc(id).get();
      const existingProduct = productDoc.data() || {};

      const prompt = `
        You are an expert product analyst. The user has uploaded new documentation for an existing product.
        Your task is to MERGE the new information from the text with the existing product knowledge below.
        DO NOT replace the existing features; APPEND any new features you find in the text to the existing array.
        Update the description, pricing_info, and target_audience if the new text provides better or more up-to-date information.
        
        Existing Knowledge:
        ${JSON.stringify({
          description: existingProduct.description,
          features: existingProduct.features,
          pricing_info: existingProduct.pricing_info,
          target_audience: existingProduct.target_audience
        }, null, 2)}
        
        New Text to Merge:
        ${fileContent.substring(0, 30000)}
        
        Return ONLY a raw JSON object with: "description", "features" (array of strings), "pricing_info", and "target_audience".
      `;

      const response = await callWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      }));

      let jsonStr = (response.text || '').trim();
      if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '').trim();
      if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '').trim();
      
      const parsedData = JSON.parse(jsonStr);
      await db.collection('products').doc(id).update(parsedData);
      return NextResponse.json({ success: true, updatedData: parsedData });
    } else {
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (features !== undefined) updateData.features = features;
      if (pricing_info !== undefined) updateData.pricing_info = pricing_info;
      if (target_audience !== undefined) updateData.target_audience = target_audience;
      if (url !== undefined) updateData.url = url;
      if (body.customFields !== undefined) updateData.customFields = body.customFields;
      
      await db.collection('products').doc(id).update(updateData);
      return NextResponse.json({ success: true });
    }
  } catch (err: any) {
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
