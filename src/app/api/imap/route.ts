import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const doc = await db.collection('settings').doc('imap').get();
    if (doc.exists) return NextResponse.json({ success: true, imap: doc.data() });
    return NextResponse.json({ success: true, imap: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { imap } = await req.json();
    if (!imap || !imap.host || !imap.user) return NextResponse.json({ error: 'Missing IMAP details' }, { status: 400 });

    await db.collection('settings').doc('imap').set(imap, { merge: true });

    return NextResponse.json({ success: true, message: 'IMAP settings saved successfully!' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
