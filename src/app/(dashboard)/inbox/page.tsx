'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, User, Eye, AlertTriangle, Filter, Calendar, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function InboxPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'needs_review' | 'replied' | 'ai_responded'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/inbox/list');
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
      } else {
        alert('Failed to load inbox: ' + data.error);
      }
    } catch (e: any) {
      alert('Error fetching inbox: ' + e.message);
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLeads().finally(() => setLoading(false));
  }, []);

  const handleCheckNow = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/inbox/check');
      await fetchLeads();
    } catch (e) {
      console.error(e);
    }
    setRefreshing(false);
  };

  // Filter and sort leads
  const uniqueCampaigns = Array.from(new Set(leads.map(l => l.campaignName || 'Unknown Campaign'))).sort();

  const filteredLeads = leads.filter((lead) => {
    // Status filter
    if (filter === 'needs_review' && lead.status !== 'NEEDS_REVIEW') return false;
    if (filter === 'replied' && lead.status !== 'REPLIED') return false;
    if (filter === 'ai_responded' && lead.status !== 'AI_RESPONDED') return false;

    // Campaign filter
    const cName = lead.campaignName || 'Unknown Campaign';
    if (filterCampaign !== 'all' && cName !== filterCampaign) return false;

    // Date filter
    const receivedMessages = (lead.history || []).filter((h: any) => h.type === 'RECEIVED');
    const lastMsg = receivedMessages[receivedMessages.length - 1];
    if (lastMsg?.receivedAt) {
      const msgDate = new Date(lastMsg.receivedAt);
      if (dateFrom && msgDate < new Date(dateFrom)) return false;
      if (dateTo && msgDate > new Date(dateTo + 'T23:59:59')) return false;
    }

    return true;
  }).sort((a, b) => {
    // NEEDS_REVIEW always at top
    if (a.status === 'NEEDS_REVIEW' && b.status !== 'NEEDS_REVIEW') return -1;
    if (b.status === 'NEEDS_REVIEW' && a.status !== 'NEEDS_REVIEW') return 1;
    
    // Then sort by most recent received date
    const aRecv = (a.history || []).filter((h: any) => h.type === 'RECEIVED');
    const bRecv = (b.history || []).filter((h: any) => h.type === 'RECEIVED');
    const aDate = aRecv.length > 0 ? new Date(aRecv[aRecv.length - 1].receivedAt || 0).getTime() : 0;
    const bDate = bRecv.length > 0 ? new Date(bRecv[bRecv.length - 1].receivedAt || 0).getTime() : 0;
    return bDate - aDate;
  });

  const needsReviewCount = leads.filter(l => l.status === 'NEEDS_REVIEW').length;

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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white">Manual Review Inbox</h1>
          <p className="text-gray-400 mt-2">Emails that need your attention or manual reply.</p>
        </div>
        <div className="flex gap-3">
          {needsReviewCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-semibold text-sm">{needsReviewCount} need{needsReviewCount === 1 ? 's' : ''} manual reply</span>
            </div>
          )}
          <button
            onClick={handleCheckNow}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Checking...' : 'Check Now'}
          </button>
        </div>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-900 border border-gray-800 rounded-xl text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-gray-300"><strong className="text-amber-400">Manual Reply Needed:</strong> AI couldn't answer. Needs your human reply.</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-gray-300"><strong className="text-emerald-400">AI Responded:</strong> AI successfully handled the reply automatically.</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          <span className="text-gray-300"><strong className="text-blue-400">Replied:</strong> General reply status (usually older threads).</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-gray-900 border border-gray-800 rounded-xl p-4">
        <Filter className="w-4 h-4 text-gray-400" />
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="needs_review">⚠️ Manual Reply Needed</option>
          <option value="replied">Replied</option>
          <option value="ai_responded">AI Responded</option>
        </select>

        <select
          value={filterCampaign}
          onChange={(e) => setFilterCampaign(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 max-w-[200px]"
        >
          <option value="all">All Campaigns</option>
          {uniqueCampaigns.map(c => (
            <option key={c as string} value={c as string}>{c}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="w-4 h-4" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
          />
          <span>to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <span className="text-sm text-gray-500 ml-auto">{filteredLeads.length} result{filteredLeads.length !== 1 ? 's' : ''}</span>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 border border-gray-800 rounded-2xl bg-gray-900">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Inbox Zero!</h3>
          <p className="text-gray-400 mt-2 text-center max-w-md">
            {filter === 'all' 
              ? 'The AI is handling everything perfectly. Any queries that need your attention will appear here.'
              : 'No emails match your current filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900/50">
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Lead Email</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Campaign</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Status</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400">Last Received</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredLeads.map((lead: any) => {
                const receivedMessages = (lead.history || []).filter((h: any) => h.type === 'RECEIVED');
                const lastMsg = receivedMessages[receivedMessages.length - 1];
                const isNeedsReview = lead.status === 'NEEDS_REVIEW';

                return (
                  <tr key={lead.id} className={`transition-colors ${isNeedsReview ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'hover:bg-gray-800/50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isNeedsReview ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {isNeedsReview ? <AlertTriangle className="w-4 h-4" /> : <User className="w-4 h-4" />}
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
                    <td className="px-6 py-4">
                      {isNeedsReview ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold rounded-full">
                          <AlertTriangle className="w-3 h-3" />
                          Manual Reply Needed
                        </span>
                      ) : lead.status === 'AI_RESPONDED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full">
                          AI Responded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold rounded-full">
                          {lead.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {lastMsg?.receivedAt ? new Date(lastMsg.receivedAt).toLocaleString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/thread/${lead.id}`}
                        target="_blank"
                        className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          isNeedsReview 
                            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/20'
                            : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20'
                        }`}
                      >
                        <Eye className="w-4 h-4" /> {isNeedsReview ? 'Reply Now' : 'View Thread'}
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
