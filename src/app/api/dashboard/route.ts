import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';

export async function GET() {
  if (!db) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  
  try {
    const leadsSnapshot = await db.collection('leads').get();
    const totalLeads = leadsSnapshot.size;

    const clSnapshot = await db.collection('campaign_leads').get();
    let contacted = 0;
    let replied = 0;
    let bounced = 0;
    let dead = 0;

    clSnapshot.docs.forEach(doc => {
      const status = doc.data().status;
      if (status === 'CONTACTED' || status === 'AI_RESPONDED') contacted++;
      else if (status === 'REPLIED') replied++;
      else if (status === 'BOUNCED') bounced++;
      else if (status === 'DEAD') dead++;
    });

    const recentActivitySnapshot = await db.collection('campaign_leads')
      .where('status', 'in', ['CONTACTED', 'AI_RESPONDED', 'REPLIED'])
      .orderBy('lastContactedAt', 'desc')
      .limit(5)
      .get();
      
    const recentActivity = recentActivitySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        status: data.status,
        date: data.lastContactedAt?.toDate ? data.lastContactedAt.toDate().toISOString() : data.lastContactedAt
      };
    });

    return NextResponse.json({ 
      success: true, 
      stats: {
        totalLeads,
        emailsSent: contacted + replied + bounced + dead,
        replied,
        bounced,
        dead
      },
      recentActivity
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
