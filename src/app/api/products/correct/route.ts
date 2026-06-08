import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { productId, correction } = await req.json();
    if (!productId || !correction) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const docRef = db.collection('products').doc(productId);
    const doc = await docRef.get();
    if (!doc.exists) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    
    const product = doc.data();
    const existingCorrections = product?.corrections || '';
    const newCorrections = existingCorrections + '\n- ' + correction;

    await docRef.update({ corrections: newCorrections });

    return NextResponse.json({ success: true, message: 'Correction saved permanently!' });
  } catch (err: any) {
    console.error('Correction Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
