'use client';

import { useEffect, useState } from 'react';
import { Inbox, CheckCircle2, User, Mail, Eye } from 'lucide-react';
import Link from 'next/link';

export default function InboxPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/inbox/list')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setLeads(data.leads || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        <div>
          <h1 className="text-3xl font-bold text-white">Manual Review Inbox</h1>
          <p className="text-gray-400 mt-2">Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-white">Manual Review Inbox</h1>
        <p className="text-gray-400 mt-2">Emails that the AI could not answer or require human intervention.</p>
      </div>

      {leads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 border border-gray-800 rounded-2xl bg-gray-900">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Inbox Zero!</h3>
          <p className="text-gray-400 mt-2 text-center max-w-md">
            The AI is handling everything perfectly. Any queries that need your attention will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Lead Email</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Campaign</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Last Received</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leads.map((lead: any) => {
                const receivedMessages = (lead.history || []).filter((h: any) => h.type === 'RECEIVED');
                const lastMsg = receivedMessages[receivedMessages.length - 1];

                return (
                  <tr key={lead.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-medium text-white">{lead.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-400">{lead.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {lead.campaignName || 'Unknown Campaign'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {lastMsg?.receivedAt ? new Date(lastMsg.receivedAt).toLocaleString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/thread/${lead.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20 text-sm font-medium rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" /> View & Reply
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
