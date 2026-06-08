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
      const campaignId = doc.id;
      if (!campaign.listName) continue;
      
      const leadsSnapshot = await db.collection('leads')
        .where('listName', '==', campaign.listName)
        .get();

      for (const leadDoc of leadsSnapshot.docs) {
        if (globalSent >= globalDailyLimit) {
          limitReached = true;
          break;
        }

        const lead = leadDoc.data();
        const clId = `${campaignId}_${leadDoc.id}`;
        const clRef = db.collection('campaign_leads').doc(clId);
        const clSnapshot = await clRef.get();
        
        let clData: any = clSnapshot.exists ? clSnapshot.data() : {
          campaignId,
          leadId: leadDoc.id,
          email: lead.email,
          status: 'PENDING',
          followUpCount: 0
        };

        if (['REPLIED', 'BOUNCED', 'DEAD'].includes(clData.status)) {
          continue; // Skip leads that have reached a terminal state in this campaign
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

        const now = new Date();
        let emailSent = false;
        
        if (clData.status === 'PENDING') {
          // INITIAL OUTREACH
          const draft = await generateEmailDraft(campaign.productInfo, lead);
          await sendEmail(availableSmtp, lead.email, campaign.subject || 'Special Offer', draft || '');
          emailSent = true;

          await clRef.set({
            ...clData,
            status: 'CONTACTED',
            firstContactedAt: now,
            lastContactedAt: now,
            threadId: lead.email
          });
        } 
        else if (clData.status === 'CONTACTED' || clData.status === 'AI_RESPONDED') {
          // FOLLOW UP LOGIC
          const lastContact = clData.lastContactedAt?.toDate ? clData.lastContactedAt.toDate() : new Date(clData.lastContactedAt);
          const diffTime = Math.abs(now.getTime() - lastContact.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

          if (diffDays >= followUpDelayDays) {
            const currentFollowUpCount = clData.followUpCount || 0;
            
            if (currentFollowUpCount < maxFollowUps) {
              const followUpDraft = await generateFollowUpDraft(campaign.productInfo, lead, currentFollowUpCount + 1);
              await sendEmail(availableSmtp, lead.email, `Re: ${campaign.subject || 'Special Offer'}`, followUpDraft || '');
              emailSent = true;

              await clRef.update({
                lastContactedAt: now,
                followUpCount: currentFollowUpCount + 1,
                status: 'CONTACTED'
              });
            } else {
              await clRef.update({ status: 'DEAD' });
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
