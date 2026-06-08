import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const snapshot = await db.collection('leads').orderBy('createdAt', 'desc').limit(100).get();
    const leads = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        name: data.name,
        status: data.status,
        campaignId: data.campaignId,
        firstContactedAt: data.firstContactedAt?.toDate ? data.firstContactedAt.toDate().toISOString() : data.firstContactedAt,
        lastContactedAt: data.lastContactedAt?.toDate ? data.lastContactedAt.toDate().toISOString() : data.lastContactedAt,
        followUpCount: data.followUpCount || 0
      };
    });
    return NextResponse.json({ success: true, leads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
