import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const snapshot = await db.collection('leads').select('listName').get();
    const lists = new Set();
    snapshot.docs.forEach(doc => {
      const name = doc.data().listName;
      if (name) lists.add(name);
    });
    
    return NextResponse.json({ success: true, lists: Array.from(lists).sort() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
