import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { generateEmailDraft, generateFollowUpDraft } from '@/lib/gemini';
import { sendEmail } from '@/lib/email';

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });

  try {
    // 1. Fetch settings
    const smtpSnapshot = await db.collection('settings').doc('smtp').get();
    const smtpServers = smtpSnapshot.exists ? smtpSnapshot.data()?.servers || [] : [];
    if (smtpServers.length === 0) return NextResponse.json({ success: false, message: 'No SMTP servers configured.' });

    const automationSnapshot = await db.collection('settings').doc('automation').get();
    const automationSettings = automationSnapshot.exists ? automationSnapshot.data() : { followUpDelayDays: 3, maxFollowUps: 3, globalDailyLimit: 500 };
    const followUpDelayDays = automationSettings?.followUpDelayDays || 3;
    const maxFollowUps = automationSettings?.maxFollowUps || 3;
    const globalDailyLimit = automationSettings?.globalDailyLimit || 500;

    // 2. Fetch today's stats
    const today = new Date().toISOString().split('T')[0];
    const statsRef = db.collection('stats').doc(today);
    const statsSnapshot = await statsRef.get();
    const statsData = statsSnapshot.exists ? statsSnapshot.data() : { globalSent: 0, servers: {} };
    
    let globalSent = statsData?.globalSent || 0;
    let serverStats = statsData?.servers || {};

    // 3. Fetch active campaigns
    const campaignsSnapshot = await db.collection('campaigns').where('status', '==', 'ACTIVE').get();
    let smtpIndex = 0;
    let limitReached = false;

    for (const doc of campaignsSnapshot.docs) {
      if (limitReached) break;
      const campaign = doc.data();
      
      const leadsSnapshot = await db.collection('leads')
        .where('campaignId', '==', doc.id)
        .where('status', 'in', ['PENDING', 'CONTACTED', 'AI_RESPONDED'])
        .get();

      for (const leadDoc of leadsSnapshot.docs) {
        if (globalSent >= globalDailyLimit) {
          limitReached = true;
          break;
        }

        // Find an available SMTP server that hasn't hit its limit
        let availableSmtp = null;
        let smtpId = '';
        let attempts = 0;
        
        while (attempts < smtpServers.length) {
          const candidate = smtpServers[smtpIndex % smtpServers.length];
          smtpId = `${candidate.host}-${candidate.user}`;
          const currentSent = serverStats[smtpId] || 0;
          const maxLimit = candidate.dailyLimit || 50;
          
          if (currentSent < maxLimit) {
            availableSmtp = candidate;
            break;
          }
          smtpIndex++;
          attempts++;
        }

        // If no servers have remaining limit, stop sending completely
        if (!availableSmtp) {
          limitReached = true;
          break;
        }

        const lead = leadDoc.data();
        const now = new Date();
        let emailSent = false;
        
        if (lead.status === 'PENDING') {
          // INITIAL OUTREACH
          const draft = await generateEmailDraft(campaign.productInfo, lead);
          await sendEmail(availableSmtp, lead.email, campaign.subject || 'Special Offer', draft || '');
          emailSent = true;

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
              await sendEmail(availableSmtp, lead.email, `Re: ${campaign.subject || 'Special Offer'}`, followUpDraft || '');
              emailSent = true;

              await leadDoc.ref.update({
                lastContactedAt: now,
                followUpCount: currentFollowUpCount + 1,
                status: 'CONTACTED'
              });
            } else {
              await leadDoc.ref.update({ status: 'DEAD' });
            }
          }
        }

        if (emailSent) {
          globalSent++;
          serverStats[smtpId] = (serverStats[smtpId] || 0) + 1;
          smtpIndex++;
        }
      }
    }

    // 4. Save updated stats
    await statsRef.set({ globalSent, servers: serverStats }, { merge: true });

    return NextResponse.json({ 
      success: true, 
      message: limitReached ? 'Stopped early due to daily limits.' : 'Campaign batch processed.',
      stats: { globalSent, globalDailyLimit }
    });
  } catch (error: any) {
    console.error('Campaign Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
