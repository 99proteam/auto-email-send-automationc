import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const campaignsSnapshot = await db.collection('campaigns').orderBy('createdAt', 'desc').get();
    const campaigns = [];

    for (const doc of campaignsSnapshot.docs) {
      const data = doc.data();
      
      const clSnapshot = await db.collection('campaign_leads').where('campaignId', '==', doc.id).get();
      const leadCounts = {
        total: clSnapshot.size,
        contacted: 0,
        replied: 0,
        bounced: 0,
        dead: 0
      };

      clSnapshot.docs.forEach(clDoc => {
        const status = clDoc.data().status;
        if (status === 'CONTACTED' || status === 'AI_RESPONDED') leadCounts.contacted++;
        else if (status === 'REPLIED') leadCounts.replied++;
        else if (status === 'BOUNCED') leadCounts.bounced++;
        else if (status === 'DEAD') leadCounts.dead++;
      });

      // If the campaign hasn't processed any leads yet, we should probably still show the potential total
      // from the targeted list to avoid it saying "0 Total Leads".
      if (leadCounts.total === 0 && data.listName) {
        const listSnapshot = await db.collection('leads').where('listName', '==', data.listName).get();
        leadCounts.total = listSnapshot.size;
      }

      campaigns.push({
        id: doc.id,
        name: data.name,
        subject: data.subject,
        productId: data.productId,
        listName: data.listName || '',
        status: data.status,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
        leadCounts
      });
    }

    return NextResponse.json({ success: true, campaigns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { name, subject, productId, productInfo, listName, status, includeChatLink } = await req.json();
    if (!name || !subject || !productId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const docRef = await db.collection('campaigns').add({
      name,
      subject,
      productId,
      productInfo,
      listName: listName || '',
      status: status || 'ACTIVE',
      includeChatLink: includeChatLink === true,
      createdAt: new Date()
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    await db.collection('campaigns').doc(id).update({ status });
    return NextResponse.json({ success: true });
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

    await db.collection('campaigns').doc(id).delete();
    // Ideally delete campaign_leads as well
    const clSnapshot = await db.collection('campaign_leads').where('campaignId', '==', id).get();
    const batch = db.batch();
    clSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
