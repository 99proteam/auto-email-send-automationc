import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  if (!db) {
    return NextResponse.json({ success: false, message: 'Firebase not configured in environment.' }, { status: 500 });
  }

  try {
    let targetEmail = '';
    try {
      const body = await req.json();
      targetEmail = body.email || '';
    } catch (e) {
      // ignore JSON parse error if body is empty
    }

    const smtpSnapshot = await db.collection('settings').doc('smtp').get();
    const data = smtpSnapshot.data();
    const servers = data?.servers || [];

    if (servers.length === 0) {
      return NextResponse.json({ success: false, message: 'No SMTP servers configured in database.' }, { status: 400 });
    }

    // Try sending with the first server
    const smtpConfig = servers[0];
    const emailToSendTo = targetEmail || smtpConfig.user;
    
    // We send a test email
    await sendEmail(
      smtpConfig,
      emailToSendTo,
      'Auto Email Lead Gen: Test Connection Successful',
      '<p>Your SMTP integration is working correctly. You are ready to start sending campaigns.</p>'
    );

    return NextResponse.json({ success: true, message: 'Test email sent successfully!' });
  } catch (error: any) {
    console.error('SMTP Test Error:', error);
    return NextResponse.json({ success: false, message: `Failed: ${error.message}` }, { status: 500 });
  }
}
