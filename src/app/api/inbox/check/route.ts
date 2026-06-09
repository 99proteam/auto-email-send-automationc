import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { simpleParser } from 'mailparser';
import * as imaps from 'imap-simple';
import { analyzeReplyAndRespond, getFullProductContext } from '@/lib/gemini';
import { sendEmail } from '@/lib/email';

export async function POST() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const imapDoc = await db.collection('settings').doc('imap').get();
    const imapServers = imapDoc.exists ? imapDoc.data()?.servers || [] : [];
    if (imapServers.length === 0) {
      return NextResponse.json({ success: false, message: 'No IMAP servers configured.' });
    }

    const smtpDoc = await db.collection('settings').doc('smtp').get();
    const smtpServers = smtpDoc.exists ? smtpDoc.data()?.servers || [] : [];
    if (smtpServers.length === 0) {
      return NextResponse.json({ success: false, message: 'No SMTP servers configured.' });
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

        const searchCriteria = ['UNSEEN'];
        const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], struct: true, markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        diagnostics.push(`Found ${messages.length} UNSEEN messages on ${imapConfig.user}`);
        let processedCount = 0;

        for (const item of messages) {
          try {
            const all = item.parts.find(part => part.which === 'TEXT') || item.parts[0];
            const uid = item.attributes.uid;
            const idHeader = "Imap-Id: " + uid + "\r\n";
            
            const parsed = await simpleParser(idHeader + all.body);
            
            const headerPart = item.parts.find(part => part.which === 'HEADER');
            let senderEmail = '';
            if (headerPart?.body?.from?.length > 0) {
              senderEmail = headerPart.body.from[0].match(/<([^>]+)>/)?.[1] || headerPart.body.from[0];
            }

            if (!senderEmail) {
              diagnostics.push(`Skipped MSG ${uid}: No sender email found`);
              await connection.addFlags(uid, ['\\Seen']);
              continue;
            }

            senderEmail = senderEmail.toLowerCase().trim();
            diagnostics.push(`MSG ${uid}: Sender=${senderEmail}`);

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
              
              for (const potentialEmail of matches) {
                if (potentialEmail.includes('mailer-daemon') || potentialEmail.includes('postmaster')) continue;
                const clSnapshot = await db.collection('campaign_leads').where('email', '==', potentialEmail).get();
                if (!clSnapshot.empty) {
                  const batch = db.batch();
                  clSnapshot.docs.forEach(doc => batch.update(doc.ref, { status: 'BOUNCED' }));
                  await batch.commit();
                }
              }
              await connection.addFlags(uid, ['\\Seen']);
              processedCount++;
              diagnostics.push(`MSG ${uid}: Handled as Bounce`);
              continue;
            }

            // Check for unsubscribe
            const bodyText = (parsed.text || '').toLowerCase();
            const subjectText = (parsed.subject || '').toLowerCase();
            if (subjectText.includes('unsubscribe') || bodyText.includes('unsubscribe me') || bodyText.includes('remove me from')) {
              // Add to unsubscribe list
              await db.collection('unsubscribes').doc(senderEmail).set({
                email: senderEmail,
                unsubscribedAt: new Date(),
                reason: 'email_reply'
              });
              // Update all campaign_leads for this email
              const clSnapshot = await db.collection('campaign_leads').where('email', '==', senderEmail).get();
              if (!clSnapshot.empty) {
                const batch = db.batch();
                clSnapshot.docs.forEach(doc => batch.update(doc.ref, { status: 'UNSUBSCRIBED' }));
                await batch.commit();
              }
              await connection.addFlags(uid, ['\\Seen']);
              processedCount++;
              diagnostics.push(`MSG ${uid}: Unsubscribe request from ${senderEmail}`);
              continue;
            }

            // Find the lead - accept ANY active status (not BOUNCED, DEAD, UNSUBSCRIBED)
            const clSnapshot = await db.collection('campaign_leads')
              .where('email', '==', senderEmail)
              .orderBy('lastContactedAt', 'desc')
              .limit(1)
              .get();

            if (!clSnapshot.empty) {
              const clDoc = clSnapshot.docs[0];
              const clData = clDoc.data();

              // Skip terminal statuses
              if (['BOUNCED', 'DEAD', 'UNSUBSCRIBED'].includes(clData.status)) {
                diagnostics.push(`MSG ${uid}: Skipped - terminal status ${clData.status}`);
                await connection.addFlags(uid, ['\\Seen']);
                continue;
              }

              const newHistory = clData.history || [];

              // DEDUP: Check if this UID was already processed
              const uidStr = String(uid);
              const alreadyProcessed = newHistory.some((h: any) => h.imapUid === uidStr);
              if (alreadyProcessed) {
                diagnostics.push(`MSG ${uid}: Skipped - already in history (dedup)`);
                await connection.addFlags(uid, ['\\Seen']);
                continue;
              }

              diagnostics.push(`MSG ${uid}: Lead found (status=${clData.status}), processing reply`);
              
              // Append received message
              newHistory.push({
                type: 'RECEIVED',
                subject: parsed.subject || '',
                body: parsed.text || '',
                receivedAt: new Date().toISOString(),
                imapUid: uidStr
              });

              // Build thread history string for AI context
              const threadHistoryStr = newHistory.map((h: any) => {
                const direction = h.type === 'RECEIVED' ? 'LEAD' : 'US';
                return `[${direction}] ${h.body || ''}`;
              }).join('\n---\n');

              // Get full product context
              const campaignDoc = await db.collection('campaigns').doc(clData.campaignId).get();
              let productContext = campaignDoc.exists ? (campaignDoc.data()?.productInfo || '') : '';
              
              if (campaignDoc.exists && campaignDoc.data()?.productId) {
                const fullCtx = await getFullProductContext(campaignDoc.data()?.productId);
                if (fullCtx) productContext = fullCtx;
              }

              // Try AI response
              try {
                const aiReply = await analyzeReplyAndRespond(
                  parsed.text || 'No text content',
                  threadHistoryStr,
                  productContext
                );

                if (aiReply && !aiReply.includes('REQUIRES_MANUAL_INTERVENTION')) {
                  const smtpConfig = smtpServers[0];
                  const campaign = campaignDoc.exists ? campaignDoc.data() : null;
                  const replySubject = `Re: ${campaign?.subject || 'Follow Up'}`;
                  await sendEmail(smtpConfig, senderEmail, replySubject, aiReply || '');
                  
                  newHistory.push({
                    type: 'SENT',
                    subject: replySubject,
                    body: aiReply,
                    sentAt: new Date().toISOString()
                  });

                  await clDoc.ref.update({
                    status: 'AI_RESPONDED',
                    lastContactedAt: new Date(),
                    history: newHistory
                  });
                  diagnostics.push(`MSG ${uid}: AI responded successfully`);
                } else {
                  // AI can't answer - mark for manual review
                  await clDoc.ref.update({
                    status: 'NEEDS_REVIEW',
                    lastContactedAt: new Date(),
                    history: newHistory
                  });
                  diagnostics.push(`MSG ${uid}: Marked NEEDS_REVIEW - AI requires manual intervention`);
                }
              } catch (aiErr: any) {
                // AI error - still save the received message, mark for review
                await clDoc.ref.update({
                  status: 'NEEDS_REVIEW',
                  lastContactedAt: new Date(),
                  history: newHistory
                });
                diagnostics.push(`MSG ${uid}: AI error (${aiErr.message}), marked NEEDS_REVIEW`);
              }

              await connection.addFlags(uid, ['\\Seen']);
              processedCount++;
            } else {
              diagnostics.push(`MSG ${uid}: Email ${senderEmail} not found in any campaign`);
              await connection.addFlags(uid, ['\\Seen']);
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
