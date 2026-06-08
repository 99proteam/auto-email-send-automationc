import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

export async function checkEmails(imapConfig: any, processEmailCallback: (from: string, subject: string, body: string) => Promise<void>) {
  const config = {
    imap: {
      user: imapConfig.user,
      password: imapConfig.password,
      host: imapConfig.host,
      port: imapConfig.port,
      tls: imapConfig.tls !== false,
      authTimeout: 3000,
    },
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    // Search for unread emails
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: ['HEADER', 'TEXT'], struct: true };

    const messages = await connection.search(searchCriteria, fetchOptions);

    for (const item of messages) {
      const all = item.parts.find((part: any) => part.which === 'TEXT');
      const id = item.attributes.uid;
      const idHeader = "Imap-Id: "+id+"\r\n";

      if (all) {
        const mail = await simpleParser(idHeader + all.body);
        const from = mail.from?.value[0].address || '';
        const subject = mail.subject || '';
        const body = mail.text || '';

        // Process the email through our AI callback
        await processEmailCallback(from, subject, body);

        // Mark as read
        await connection.addFlags(id, ['\\Seen']);
      }
    }

    connection.end();
  } catch (error) {
    console.error("IMAP Error: ", error);
  }
}
