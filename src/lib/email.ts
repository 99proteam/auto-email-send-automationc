import nodemailer from 'nodemailer';

export async function sendEmail(smtpConfig: any, to: string, subject: string, htmlBody: string) {
  // smtpConfig should look like: { host, port, user, pass }
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465, // true for 465, false for other ports
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  const info = await transporter.sendMail({
    from: `"Sales Team" <${smtpConfig.user}>`,
    to,
    subject,
    html: htmlBody,
  });

  return info;
}
