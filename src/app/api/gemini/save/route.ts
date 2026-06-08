import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { apiKey } = await req.json();
    if (!apiKey) return NextResponse.json({ error: 'Missing API Key' }, { status: 400 });

    await db.collection('settings').doc('gemini').set({ apiKey }, { merge: true });

    return NextResponse.json({ success: true, message: 'API Key saved successfully!' });
  } catch (err: any) {
    console.error('Save API Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
