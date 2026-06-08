import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import * as imaps from 'imap-simple';

export async function POST() {
  if (!db) return NextResponse.json({ success: false, message: 'DB not configured' });
  
  try {
    const doc = await db.collection('settings').doc('imap').get();
    const servers = doc.exists ? doc.data()?.servers || [] : [];
    if (servers.length === 0) return NextResponse.json({ success: false, message: 'No IMAP servers configured.' });
    
    const results = [];
    let allSuccess = true;

    for (const imapConfig of servers) {
      if (!imapConfig.host || !imapConfig.user || !imapConfig.pass) {
        results.push(`${imapConfig.user || 'Unknown'}: Incomplete Config`);
        allSuccess = false;
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
        connection.end();
        results.push(`${imapConfig.user}: OK`);
      } catch (err: any) {
        allSuccess = false;
        results.push(`${imapConfig.user}: Error (${err.message})`);
      }
    }

    return NextResponse.json({ 
      success: allSuccess, 
      message: results.join(' | ') 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: `System Error: ${err.message}` });
  }
}

export async function GET() {
  return POST();
}
