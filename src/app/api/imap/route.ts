import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const doc = await db.collection('settings').doc('imap').get();
    if (doc.exists) return NextResponse.json({ success: true, servers: doc.data()?.servers || [] });
    return NextResponse.json({ success: true, servers: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const body = await req.json();
    const { host, port, user, pass, tls } = body;
    if (!host || !user) return NextResponse.json({ error: 'Missing IMAP details' }, { status: 400 });

    const server = { host, port: parseInt(port) || 993, user, pass, tls: tls !== false };

    const docRef = db.collection('settings').doc('imap');
    const doc = await docRef.get();
    let servers = doc.exists ? doc.data()?.servers || [] : [];

    servers.push(server);
    await docRef.set({ servers }, { merge: true });

    return NextResponse.json({ success: true, message: 'IMAP server added successfully!', servers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { searchParams } = new URL(req.url);
    const index = searchParams.get('index');
    if (index === null) return NextResponse.json({ error: 'Missing index' }, { status: 400 });

    const docRef = db.collection('settings').doc('imap');
    const doc = await docRef.get();
    let servers = doc.exists ? doc.data()?.servers || [] : [];

    servers.splice(parseInt(index), 1);
    await docRef.set({ servers }, { merge: true });

    return NextResponse.json({ success: true, message: 'IMAP server removed.', servers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
