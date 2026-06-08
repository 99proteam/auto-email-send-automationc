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

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { leads, campaignId } = await req.json();
    if (!leads || !Array.isArray(leads)) return NextResponse.json({ error: 'Invalid leads array' }, { status: 400 });

    let count = 0;
    let skipped = 0;

    let batch = db.batch();
    let batchCount = 0;

    for (const lead of leads) {
      if (!lead.email) continue;
      const email = lead.email.toLowerCase().trim();

      const existing = await db.collection('leads').where('email', '==', email).limit(1).get();
      if (!existing.empty) {
        skipped++;
        continue;
      }

      const docRef = db.collection('leads').doc();
      batch.set(docRef, {
        email,
        name: lead.name || '',
        company: lead.company || '',
        status: 'PENDING',
        campaignId: campaignId || null,
        createdAt: new Date(),
        followUpCount: 0
      });

      count++;
      batchCount++;

      if (batchCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, count, skipped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await db.collection('leads').doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
