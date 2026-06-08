import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  if (!db) return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing lead ID' });
  }

  try {
    const doc = await db.collection('campaign_leads').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Lead not found' });
    }

    const leadData = { id: doc.id, ...doc.data() };
    
    // Attempt to fetch name from leads collection if not present
    if (!leadData.name && leadData.leadId) {
       const globalLeadDoc = await db.collection('leads').doc(leadData.leadId).get();
       if (globalLeadDoc.exists) {
         leadData.name = globalLeadDoc.data()?.name || 'Unknown';
       }
    }

    return NextResponse.json({ success: true, lead: leadData });
  } catch (error: any) {
    console.error('Error fetching thread:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
