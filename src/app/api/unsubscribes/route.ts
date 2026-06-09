import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  try {
    const snapshot = await db.collection('unsubscribes').orderBy('unsubscribedAt', 'desc').get();
    const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ success: true, unsubscribes: list });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  try {
    const { emails } = await request.json();
    if (!emails || !Array.isArray(emails)) {
      return NextResponse.json({ error: 'Missing emails array' }, { status: 400 });
    }

    // Check which of these emails are in the unsubscribe list
    const unsubscribed: string[] = [];
    for (const email of emails) {
      const doc = await db.collection('unsubscribes').doc(email.toLowerCase().trim()).get();
      if (doc.exists) {
        unsubscribed.push(email);
      }
    }

    return NextResponse.json({ success: true, unsubscribed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
