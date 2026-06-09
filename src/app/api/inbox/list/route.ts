import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });

  try {
    // Fetch leads that have received replies (any status with history)
    const snapshot = await db.collection('campaign_leads')
      .where('status', 'in', ['NEEDS_REVIEW', 'REPLIED', 'AI_RESPONDED', 'CONTACTED'])
      .orderBy('lastContactedAt', 'desc')
      .limit(100)
      .get();

    const leads = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Only include leads that have at least one RECEIVED message in history
      const hasReceived = (data.history || []).some((h: any) => h.type === 'RECEIVED');
      if (!hasReceived) continue;

      let campaignName = 'Unknown';
      if (data.campaignId) {
        const cDoc = await db.collection('campaigns').doc(data.campaignId).get();
        if (cDoc.exists) campaignName = cDoc.data()?.name || 'Unknown';
      }

      leads.push({
        id: doc.id,
        ...data,
        campaignName
      });
    }

    return NextResponse.json({ success: true, leads });
  } catch (error: any) {
    console.error('Error fetching inbox leads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
