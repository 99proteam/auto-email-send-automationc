'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, User, Bot, Calendar, Send, AlertTriangle, UserCheck, Loader2 } from 'lucide-react';

export default function ThreadViewPage() {
  const { leadId } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState('');

  const fetchLead = () => {
    fetch(`/api/leads/thread?id=${leadId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setLead(data.lead);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLead();
  }, [leadId]);

  const handleSendReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    setSendStatus('');

    try {
      const res = await fetch('/api/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, body: replyBody })
      });
      const data = await res.json();

      if (data.success) {
        setSendStatus('Reply sent successfully!');
        setReplyBody('');
        // Refresh thread
        fetchLead();
      } else {
        setSendStatus('Error: ' + (data.error || 'Failed to send'));
      }
    } catch (err: any) {
      setSendStatus('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-400">Loading thread...</div>;
  }

  if (!lead) {
    return <div className="p-8 text-center text-gray-400">Thread not found.</div>;
  }

  const isNeedsReview = lead.status === 'NEEDS_REVIEW';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            Thread: {lead.email}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            {isNeedsReview ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-full">
                <AlertTriangle className="w-3 h-3" />
                Waiting for Manual Reply
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-full">
                {lead.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Needs Review Banner */}
      {isNeedsReview && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-amber-400 font-semibold text-sm">Manual Reply Needed</h3>
            <p className="text-amber-400/70 text-sm mt-1">
              The AI could not answer this lead&apos;s question. Please review the conversation below and send a manual reply.
            </p>
          </div>
        </div>
      )}

      {/* Thread Messages */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center gap-3">
          <User className="w-5 h-5 text-gray-400" />
          <span className="text-white font-medium">{lead.name || 'Unknown'}</span>
          <span className="text-gray-500 text-sm">({lead.email})</span>
        </div>
        
        <div className="p-6">
          {(!lead.history || lead.history.length === 0) ? (
            <div className="text-center py-12 text-gray-500">
              <p>No email history found for this lead.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {lead.history.map((msg: any, i: number) => {
                const isReceived = msg.type === 'RECEIVED';
                const isManual = msg.type === 'MANUAL_SENT';
                
                return (
                  <div key={i} className={`flex ${isReceived ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-5 ${
                      isReceived 
                        ? 'bg-gray-800 text-gray-200 rounded-tl-sm' 
                        : isManual
                          ? 'bg-emerald-600 text-white rounded-tr-sm'
                          : 'bg-purple-600 text-white rounded-tr-sm'
                    }`}>
                      <div className="flex items-center gap-2 mb-3 text-sm opacity-80 border-b border-white/10 pb-2">
                        {isReceived ? (
                          <User className="w-4 h-4" />
                        ) : isManual ? (
                          <UserCheck className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                        <span className="font-semibold">
                          {isReceived ? 'Lead' : isManual ? 'You (Manual)' : 'AI Agent'}
                        </span>
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Manual Reply Box */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-800 bg-gray-900/50">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" />
            Send Manual Reply
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Type your reply here..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 h-32 resize-none placeholder-gray-500"
          />
          <div className="flex justify-between items-center">
            <span className={`text-sm ${sendStatus.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
              {sendStatus}
            </span>
            <button
              onClick={handleSendReply}
              disabled={sending || !replyBody.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Reply
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
