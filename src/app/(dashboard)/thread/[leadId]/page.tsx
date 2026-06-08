'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Bot, Calendar, Eye } from 'lucide-react';

export default function ThreadViewPage() {
  const { leadId } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We need to fetch the lead from an API. Let's assume we can fetch it via api/leads?id=
    // Actually wait, let's create a quick API route for this if it doesn't exist.
    fetch(`/api/leads/thread?id=${leadId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setLead(data.lead);
        }
      })
      .finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading thread...</div>;
  }

  if (!lead) {
    return <div className="p-8 text-center text-gray-400">Thread not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            Thread: {lead.email}
          </h1>
          <p className="text-gray-400 mt-1">Status: <span className="text-blue-400 font-medium">{lead.status}</span></p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-3">
          <User className="w-5 h-5 text-gray-400" />
          <span className="text-white font-medium">{lead.name || 'Unknown'}</span>
          <span className="text-gray-500 text-sm">({lead.email})</span>
        </div>
        
        <div className="p-6">
          {(!lead.history || lead.history.length === 0) ? (
            <div className="text-center py-12 text-gray-500">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No email history found for this lead.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {lead.history.map((msg: any, i: number) => (
                <div key={i} className={`flex ${msg.type === 'RECEIVED' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-5 ${
                    msg.type === 'RECEIVED' 
                      ? 'bg-gray-800 text-gray-200 rounded-tl-sm' 
                      : 'bg-purple-600 text-white rounded-tr-sm'
                  }`}>
                    <div className="flex items-center gap-2 mb-3 text-sm opacity-80 border-b border-white/10 pb-2">
                      {msg.type === 'RECEIVED' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      <span className="font-semibold">{msg.type === 'RECEIVED' ? 'Lead' : 'AI Agent'}</span>
                      <span className="text-xs ml-auto flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(msg.sentAt || msg.receivedAt || Date.now()).toLocaleString()}
                      </span>
                    </div>
                    {msg.subject && (
                      <div className="font-medium mb-2 text-sm border-b border-white/10 pb-2">
                        Subject: {msg.subject}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
