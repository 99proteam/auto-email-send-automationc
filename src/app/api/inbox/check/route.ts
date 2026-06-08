import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { simpleParser } from 'mailparser';
import * as imaps from 'imap-simple';
import { analyzeReplyAndRespond } from '@/lib/gemini';
import { sendEmail } from '@/lib/email';

export async function POST() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    // 1. Fetch IMAP Settings
    const imapDoc = await db.collection('settings').doc('imap').get();
    const imapConfig = imapDoc.exists ? imapDoc.data() : null;
    
    if (!imapConfig || !imapConfig.host || !imapConfig.user || !imapConfig.pass) {
      return NextResponse.json({ success: false, message: 'IMAP not configured in settings.' });
    }

    // 2. Fetch SMTP Settings for replying
    const smtpDoc = await db.collection('settings').doc('smtp').get();
    const smtpServers = smtpDoc.exists ? smtpDoc.data()?.servers || [] : [];
    if (smtpServers.length === 0) {
      return NextResponse.json({ success: false, message: 'No SMTP servers configured for replies.' });
    }

    // Connect to IMAP
    const config = {
      imap: {
        user: imapConfig.user,
        password: imapConfig.pass,
        host: imapConfig.host,
        port: parseInt(imapConfig.port || '993'),
        tls: imapConfig.tls,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    // Search for UNREAD emails
    const searchCriteria = ['UNREAD'];
    const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true, markSeen: false };
    const messages = await connection.search(searchCriteria, fetchOptions);

    let processedCount = 0;

    for (const item of messages) {
      try {
        const all = item.parts.find(part => part.which === 'TEXT') || item.parts[0];
        const id = item.attributes.uid;
        const idHeader = "Imap-Id: "+id+"\r\n";
        
        // Parse email using mailparser
        const parsed = await simpleParser(idHeader + all.body);
        
        // Extract sender email (to look up the lead)
        const headerPart = item.parts.find(part => part.which === 'HEADER');
        let senderEmail = '';
        if (headerPart && headerPart.body && headerPart.body.from && headerPart.body.from.length > 0) {
           senderEmail = headerPart.body.from[0].match(/<(.+)>/)?.[1] || headerPart.body.from[0];
        }

        if (!senderEmail) continue;

        // Clean up email to prevent duplicates or weird formats
        senderEmail = senderEmail.toLowerCase().trim();

        // Check if it's a BOUNCE
        const isBounce = 
          senderEmail.includes('mailer-daemon') || 
          senderEmail.includes('postmaster') || 
          parsed.subject?.toLowerCase().includes('delivery status notification') ||
          parsed.subject?.toLowerCase().includes('undeliverable') ||
          parsed.subject?.toLowerCase().includes('failure notice');

        if (isBounce) {
          // Extract all email addresses from the bounce message body
          const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
          const textBody = parsed.text || '';
          const matches = [...textBody.matchAll(emailRegex)].map(m => m[1].toLowerCase());
          
          let bouncedLeadFound = false;
          for (const potentialEmail of matches) {
            // Avoid our own email addresses
            if (potentialEmail.includes('mailer-daemon') || potentialEmail.includes('postmaster')) continue;
            
            const bounceLeadsSnapshot = await db.collection('leads').where('email', '==', potentialEmail).limit(1).get();
            if (!bounceLeadsSnapshot.empty) {
              const bouncedLeadDoc = bounceLeadsSnapshot.docs[0];
              await bouncedLeadDoc.ref.update({ status: 'BOUNCED' });
              bouncedLeadFound = true;
              break;
            }
          }

          // Mark bounce email as read and skip normal processing
          await connection.addFlags(id, ['\\Seen']);
          processedCount++;
          continue;
        }

        // Find the lead in our database
        const leadsSnapshot = await db.collection('leads')
          .where('email', '==', senderEmail)
          .limit(1)
          .get();

        if (!leadsSnapshot.empty) {
          const leadDoc = leadsSnapshot.docs[0];
          const leadData = leadDoc.data();

          // Mark lead as REPLIED so campaign runner doesn't keep hitting them with generic follow-ups
          await leadDoc.ref.update({ status: 'REPLIED' });

          // Find the campaign to get product context
          const campaignDoc = await db.collection('campaigns').doc(leadData.campaignId).get();
          
          if (campaignDoc.exists) {
             const campaign = campaignDoc.data();
             
             // Prompt Gemini with the reply
             const aiReply = await analyzeReplyAndRespond(
               parsed.text || 'No text content', 
               "Previous email thread", // Could be expanded by pulling thread history
               campaign?.productInfo || ''
             );

             // If AI says REQUIRES_MANUAL_INTERVENTION, we stop and leave it for the human.
             if (aiReply && !aiReply.includes('REQUIRES_MANUAL_INTERVENTION')) {
                // Send the reply via SMTP
                const smtpConfig = smtpServers[0]; // just use the first one for now
                await sendEmail(smtpConfig, senderEmail, `Re: ${campaign?.subject || 'Special Offer'}`, aiReply || '');
                
                // Update lead status to AI_RESPONDED
                await leadDoc.ref.update({ 
                  status: 'AI_RESPONDED',
                  lastContactedAt: new Date(),
                  followUpCount: (leadData.followUpCount || 0) + 1
                });
             }
          }
        }

        // Finally, mark the email as SEEN on the IMAP server so we don't process it again next 10 mins
        await connection.addFlags(id, ['\\Seen']);
        processedCount++;

      } catch (innerErr) {
        console.error('Error processing individual email:', innerErr);
      }
    }

    connection.end();

    return NextResponse.json({ success: true, message: `Processed ${processedCount} new replies.` });

  } catch (err: any) {
    console.error('Inbox Check Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
