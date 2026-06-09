import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

interface SendEmailOptions {
  smtpConfig: any;
  to: string;
  subject: string;
  htmlBody: string;
  senderName?: string;
  replyTo?: string;
  inReplyTo?: string;
}

export async function sendEmail(
  smtpConfigOrOptions: any,
  to?: string,
  subject?: string,
  htmlBody?: string
) {
  // Support both old signature and new options object
  let smtpConfig: any;
  let recipientEmail: string;
  let emailSubject: string;
  let body: string;
  let senderName = 'Sales Team';
  let replyTo: string | undefined;
  let inReplyTo: string | undefined;

  if (to !== undefined) {
    // Old-style call: sendEmail(smtpConfig, to, subject, htmlBody)
    smtpConfig = smtpConfigOrOptions;
    recipientEmail = to;
    emailSubject = subject || '';
    body = htmlBody || '';
  } else {
    // New-style call: sendEmail({ smtpConfig, to, subject, htmlBody, senderName })
    const opts = smtpConfigOrOptions as SendEmailOptions;
    smtpConfig = opts.smtpConfig;
    recipientEmail = opts.to;
    emailSubject = opts.subject;
    body = opts.htmlBody;
    senderName = opts.senderName || 'Sales Team';
    replyTo = opts.replyTo;
    inReplyTo = opts.inReplyTo;
  }

  const domain = smtpConfig.user.split('@')[1] || 'localhost';
  const messageId = `<${uuidv4()}@${domain}>`;

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  const mailOptions: any = {
    from: `"${senderName}" <${smtpConfig.user}>`,
    to: recipientEmail,
    subject: emailSubject,
    html: body,
    messageId: messageId,
    headers: {
      'X-Mailer': 'AutoLead AI Mailer',
      'List-Unsubscribe': `<mailto:${smtpConfig.user}?subject=unsubscribe>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'Precedence': 'bulk',
    },
  };

  if (replyTo) mailOptions.replyTo = replyTo;
  if (inReplyTo) mailOptions.inReplyTo = inReplyTo;

  const info = await transporter.sendMail(mailOptions);
  return info;
}
