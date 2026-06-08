import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET(req: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing campaign ID' }, { status: 400 });

    const campaignDoc = await db.collection('campaigns').doc(id).get();
    if (!campaignDoc.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaignData = { id: campaignDoc.id, ...campaignDoc.data() } as any;

    // Fetch all campaign_leads for this campaign
    const clSnapshot = await db.collection('campaign_leads').where('campaignId', '==', id).get();
    
    // We also need the base lead details (name, email)
    // To avoid fetching N separate lead documents, we can fetch all leads in chunks or we can fetch them individually if the list is small.
    // For simplicity, let's fetch individually but using Promise.all
    const leadsPromises = clSnapshot.docs.map(async (clDoc) => {
      const clData = clDoc.data();
      let email = 'Unknown';
      let name = '';
      
      if (clData.leadId) {
        const leadDoc = await db!.collection('leads').doc(clData.leadId).get();
        if (leadDoc.exists) {
          const lData = leadDoc.data();
          email = lData?.email || '';
          name = lData?.name || '';
        }
      }

      return {
        id: clDoc.id,
        leadId: clData.leadId,
        email,
        name,
        status: clData.status,
        lastContactedAt: clData.lastContactedAt?.toDate ? clData.lastContactedAt.toDate().toISOString() : clData.lastContactedAt,
        followUpCount: clData.followUpCount || 0,
        history: clData.history || []
      };
    });

    const detailedLeads = await Promise.all(leadsPromises);

    // Also fetch leads that belong to this campaign's target list but aren't in campaign_leads yet (PENDING)
    if (campaignData.listName) {
      const listLeadsSnapshot = await db.collection('leads').where('listName', '==', campaignData.listName).get();
      for (const leadDoc of listLeadsSnapshot.docs) {
        // If they don't have a record in campaign_leads for this campaign, they are implicitly PENDING.
        const alreadyTracked = detailedLeads.find(dl => dl.leadId === leadDoc.id);
        if (!alreadyTracked) {
          const lData = leadDoc.data();
          detailedLeads.push({
            id: `pending_${leadDoc.id}`,
            leadId: leadDoc.id,
            email: lData.email,
            name: lData.name,
            status: 'PENDING',
            lastContactedAt: null,
            followUpCount: 0,
            history: []
          });
        }
      }
    }

    // Sort: CONTACTED / REPLIED first, then PENDING
    detailedLeads.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return 1;
      if (b.status === 'PENDING' && a.status !== 'PENDING') return -1;
      const dateA = a.lastContactedAt ? new Date(a.lastContactedAt).getTime() : 0;
      const dateB = b.lastContactedAt ? new Date(b.lastContactedAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({ 
      success: true, 
      campaign: campaignData,
      leads: detailedLeads
    });
  } catch (err: any) {
    console.error('Campaign Details Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
