import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const doc = await db.collection('settings').doc('automation').get();
    if (doc.exists) {
      return NextResponse.json({ success: true, settings: doc.data() });
    } else {
      return NextResponse.json({ success: true, settings: { followUpDelayDays: 3, maxFollowUps: 3 } });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { followUpDelayDays, maxFollowUps, globalDailyLimit } = await req.json();
    await db.collection('settings').doc('automation').set({ 
      followUpDelayDays: parseInt(followUpDelayDays) || 3,
      maxFollowUps: parseInt(maxFollowUps) || 3,
      globalDailyLimit: parseInt(globalDailyLimit) || 500,
      updatedAt: new Date()
    }, { merge: true });
    return NextResponse.json({ success: true, message: 'Automation settings saved!' });
  } catch (err: any) {
    console.error('Automation Settings Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
