import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  try {
    const { leadId, body } = await request.json();
    if (!leadId || !body) {
      return NextResponse.json({ error: 'Missing leadId or body' }, { status: 400 });
    }

    // Get lead
    const leadDoc = await db.collection('campaign_leads').doc(leadId).get();
    if (!leadDoc.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const leadData = leadDoc.data() as any;

    // Get SMTP config
    const smtpDoc = await db.collection('settings').doc('smtp').get();
    const smtpServers = smtpDoc.exists ? smtpDoc.data()?.servers || [] : [];
    if (smtpServers.length === 0) {
      return NextResponse.json({ error: 'No SMTP servers configured' }, { status: 500 });
    }

    // Get campaign for subject
    let subject = 'Re: Follow Up';
    if (leadData.campaignId) {
      const campDoc = await db.collection('campaigns').doc(leadData.campaignId).get();
      if (campDoc.exists) {
        subject = `Re: ${campDoc.data()?.subject || 'Follow Up'}`;
      }
    }

    // Send email
    await sendEmail(smtpServers[0], leadData.email, subject, body);

    // Update history
    const history = leadData.history || [];
    history.push({
      type: 'MANUAL_SENT',
      subject,
      body,
      sentAt: new Date().toISOString()
    });

    await leadDoc.ref.update({
      status: 'AI_RESPONDED',
      lastContactedAt: new Date(),
      history
    });

    return NextResponse.json({ success: true, message: 'Reply sent successfully' });
  } catch (err: any) {
    console.error('Manual reply error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
