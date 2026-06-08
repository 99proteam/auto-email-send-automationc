import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const doc = await db.collection('settings').doc('smtp').get();
    if (doc.exists) return NextResponse.json({ success: true, servers: doc.data()?.servers || [] });
    return NextResponse.json({ success: true, servers: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { server } = await req.json();
    if (!server || !server.host || !server.user) return NextResponse.json({ error: 'Missing server details' }, { status: 400 });

    const docRef = db.collection('settings').doc('smtp');
    const doc = await docRef.get();
    let servers = doc.exists ? doc.data()?.servers || [] : [];
    
    servers.push(server);
    await docRef.set({ servers }, { merge: true });

    return NextResponse.json({ success: true, message: 'Server added successfully!', servers });
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

    const docRef = db.collection('settings').doc('smtp');
    const doc = await docRef.get();
    let servers = doc.exists ? doc.data()?.servers || [] : [];
    
    servers.splice(parseInt(index), 1);
    await docRef.set({ servers }, { merge: true });

    return NextResponse.json({ success: true, message: 'Server removed.', servers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
