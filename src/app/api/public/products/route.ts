import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
    // Only return safe public info (no internal IDs if we don't want, but it's fine)
    const products = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      name: doc.data().name,
      description: doc.data().description,
      features: doc.data().features,
      pricing_info: doc.data().pricing_info,
      url: doc.data().url
    }));
    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
