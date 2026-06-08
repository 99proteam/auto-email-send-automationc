import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { simpleParser } from 'mailparser';
import * as imaps from 'imap-simple';
import { analyzeReplyAndRespond } from '@/lib/gemini';
import { sendEmail } from '@/lib/email';

export async function POST() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    // 1. Fetch IMAP Settings (multiple servers)
    const imapDoc = await db.collection('settings').doc('imap').get();
    const imapServers = imapDoc.exists ? imapDoc.data()?.servers || [] : [];
    
    if (imapServers.length === 0) {
      return NextResponse.json({ success: false, message: 'No IMAP servers configured in settings.' });
    }

    // 2. Fetch SMTP Settings for replying
    const smtpDoc = await db.collection('settings').doc('smtp').get();
    const smtpServers = smtpDoc.exists ? smtpDoc.data()?.servers || [] : [];
    if (smtpServers.length === 0) {
      return NextResponse.json({ success: false, message: 'No SMTP servers configured for replies.' });
    }

    let totalProcessed = 0;
    const errors: string[] = [];
    const diagnostics: string[] = [];

    for (const imapConfig of imapServers) {
      if (!imapConfig.host || !imapConfig.user || !imapConfig.pass) {
        errors.push(`Skipping incomplete IMAP config for ${imapConfig.user || 'unknown'}`);
        continue;
      }

      try {
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
        const searchCriteria = ['UNSEEN'];
        const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true, markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        diagnostics.push(`Found ${messages.length} UNSEEN messages on ${imapConfig.user}`);
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
               senderEmail = headerPart.body.from[0].match(/<([^>]+)>/)?.[1] || headerPart.body.from[0];
            }

            if (!senderEmail) {
              diagnostics.push(`Skipped MSG ${id}: No sender email found`);
              continue;
            }

            // Clean up email
            senderEmail = senderEmail.toLowerCase().trim();
            diagnostics.push(`MSG ${id}: Sender=${senderEmail}`);

            // Check if it's a BOUNCE
            const isBounce = 
              senderEmail.includes('mailer-daemon') || 
              senderEmail.includes('postmaster') || 
              parsed.subject?.toLowerCase().includes('delivery status notification') ||
              parsed.subject?.toLowerCase().includes('undeliverable') ||
              parsed.subject?.toLowerCase().includes('failure notice');

            if (isBounce) {
              const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
              const textBody = parsed.text || '';
              const matches = [...textBody.matchAll(emailRegex)].map(m => m[1].toLowerCase());
              
              let bouncedLeadFound = false;
              for (const potentialEmail of matches) {
                if (potentialEmail.includes('mailer-daemon') || potentialEmail.includes('postmaster')) continue;
                
                const clSnapshot = await db.collection('campaign_leads').where('email', '==', potentialEmail).get();
                if (!clSnapshot.empty) {
                  const batch = db.batch();
                  clSnapshot.docs.forEach(doc => batch.update(doc.ref, { status: 'BOUNCED' }));
                  await batch.commit();
                  bouncedLeadFound = true;
                }
              }

              await connection.addFlags(id, ['\\Seen']);
              processedCount++;
              diagnostics.push(`MSG ${id}: Handled as Bounce`);
              continue;
            }

            // Find the most recently contacted campaign for this lead
            const clSnapshot = await db.collection('campaign_leads')
              .where('email', '==', senderEmail)
              .where('status', 'in', ['CONTACTED', 'AI_RESPONDED', 'REPLIED'])
              .orderBy('lastContactedAt', 'desc')
              .limit(1)
              .get();

            if (!clSnapshot.empty) {
              diagnostics.push(`MSG ${id}: Lead found, processing reply`);
              const clDoc = clSnapshot.docs[0];
              const clData = clDoc.data();
              const newHistory = clData.history || [];
              
              // Append received message
              newHistory.push({ type: 'RECEIVED', subject: parsed.subject || '', body: parsed.text || '', receivedAt: new Date().toISOString() });

              await clDoc.ref.update({ status: 'REPLIED', history: newHistory });

              const campaignDoc = await db.collection('campaigns').doc(clData.campaignId).get();
              
              if (campaignDoc.exists) {
                 const campaign = campaignDoc.data();
                 
                 const aiReply = await analyzeReplyAndRespond(
                   parsed.text || 'No text content', 
                   "Previous email thread",
                   campaign?.productInfo || ''
                 );

                 if (aiReply && !aiReply.includes('REQUIRES_MANUAL_INTERVENTION')) {
                    const smtpConfig = smtpServers[0];
                    const replySubject = `Re: ${campaign?.subject || 'Special Offer'}`;
                    await sendEmail(smtpConfig, senderEmail, replySubject, aiReply || '');
                    
                    newHistory.push({ type: 'SENT', subject: replySubject, body: aiReply, sentAt: new Date().toISOString() });

                    await clDoc.ref.update({ 
                      status: 'AI_RESPONDED',
                      lastContactedAt: new Date(),
                      followUpCount: (clData.followUpCount || 0) + 1,
                      history: newHistory
                    });
                 }
              }
              await connection.addFlags(id, ['\\Seen']);
              processedCount++;
            } else {
              // Not found or not in right status
              const checkAny = await db.collection('campaign_leads').where('email', '==', senderEmail).get();
              if (checkAny.empty) {
                 diagnostics.push(`MSG ${id}: Ignored - Email ${senderEmail} not found in any campaign`);
              } else {
                 const stats = checkAny.docs.map(d => d.data().status).join(',');
                 diagnostics.push(`MSG ${id}: Ignored - Email ${senderEmail} exists but status is [${stats}], needs to be CONTACTED, AI_RESPONDED, or REPLIED`);
              }
              // Do we mark it as seen? Let's leave it unseen so they don't lose it if it's important manual mail
            }

          } catch (innerErr: any) {
            console.error('Error processing individual email:', innerErr);
            diagnostics.push(`MSG Error: ${innerErr.message}`);
          }
        }

        connection.end();
        totalProcessed += processedCount;

      } catch (serverErr: any) {
        console.error(`IMAP error for ${imapConfig.user}:`, serverErr);
        errors.push(`${imapConfig.user}: ${serverErr.message}`);
      }
    }

    const message = `Processed ${totalProcessed} new replies across ${imapServers.length} IMAP server(s).` + (errors.length > 0 ? ` Errors: ${errors.join('; ')}` : '');
    return NextResponse.json({ success: true, message, diagnostics });

  } catch (err: any) {
    console.error('Inbox Check Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
