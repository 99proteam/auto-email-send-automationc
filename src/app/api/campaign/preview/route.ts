import { NextResponse } from 'next/server';
import { getFullProductContext, generateEmailDraft } from '@/lib/gemini';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { productId } = await req.json();
    if (!productId) return NextResponse.json({ error: 'Missing productId' }, { status: 400 });

    const productContext = await getFullProductContext(productId);
    if (!productContext) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const dummyLead = { name: 'John Doe', email: 'john@example.com' };
    const draft = await generateEmailDraft(productContext, dummyLead);

    return NextResponse.json({ success: true, draft });
  } catch (err: any) {
    console.error('Preview error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
