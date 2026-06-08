import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { generateEmailDraft, generateFollowUpDraft } from '@/lib/gemini';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });

  try {
    // Fetch settings
    const smtpSnapshot = await db.collection('settings').doc('smtp').get();
    const smtpServers = smtpSnapshot.exists ? smtpSnapshot.data()?.servers || [] : [];
    if (smtpServers.length === 0) return NextResponse.json({ success: false, message: 'No SMTP servers configured.' });

    const automationSnapshot = await db.collection('settings').doc('automation').get();
    const automationSettings = automationSnapshot.exists ? automationSnapshot.data() : { followUpDelayDays: 3, maxFollowUps: 3 };
    const followUpDelayDays = automationSettings?.followUpDelayDays || 3;
    const maxFollowUps = automationSettings?.maxFollowUps || 3;

    // Fetch active campaigns
    const campaignsSnapshot = await db.collection('campaigns').where('status', '==', 'ACTIVE').get();
    let smtpIndex = 0;

    for (const doc of campaignsSnapshot.docs) {
      const campaign = doc.data();
      
      // Fetch ALL leads for this campaign that aren't CONVERTED or REPLIED or DEAD
      const leadsSnapshot = await db.collection('leads')
        .where('campaignId', '==', doc.id)
        .where('status', 'in', ['PENDING', 'CONTACTED', 'AI_RESPONDED'])
        .get();

      for (const leadDoc of leadsSnapshot.docs) {
        const lead = leadDoc.data();
        const smtpConfig = smtpServers[smtpIndex % smtpServers.length];
        const now = new Date();
        
        if (lead.status === 'PENDING') {
          // INITIAL OUTREACH
          const draft = await generateEmailDraft(campaign.productInfo, lead);
          await sendEmail(smtpConfig, lead.email, campaign.subject || 'Special Offer', draft || '');
          smtpIndex++;

          await leadDoc.ref.update({
            status: 'CONTACTED',
            firstContactedAt: now,
            lastContactedAt: now,
            followUpCount: 0,
            threadId: lead.email
          });
        } 
        else if (lead.status === 'CONTACTED' || lead.status === 'AI_RESPONDED') {
          // FOLLOW UP LOGIC
          const lastContact = lead.lastContactedAt?.toDate ? lead.lastContactedAt.toDate() : new Date(lead.lastContactedAt);
          const diffTime = Math.abs(now.getTime() - lastContact.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

          if (diffDays >= followUpDelayDays) {
            const currentFollowUpCount = lead.followUpCount || 0;
            
            if (currentFollowUpCount < maxFollowUps) {
              const followUpDraft = await generateFollowUpDraft(campaign.productInfo, lead, currentFollowUpCount + 1);
              await sendEmail(smtpConfig, lead.email, `Re: ${campaign.subject || 'Special Offer'}`, followUpDraft || '');
              smtpIndex++;

              await leadDoc.ref.update({
                lastContactedAt: now,
                followUpCount: currentFollowUpCount + 1,
                status: 'CONTACTED' // Keep in contacted state until they reply
              });
            } else {
              // Reached max follow-ups
              await leadDoc.ref.update({ status: 'DEAD' });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Campaign batch processed with follow-ups' });
  } catch (error: any) {
    console.error('Campaign Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
