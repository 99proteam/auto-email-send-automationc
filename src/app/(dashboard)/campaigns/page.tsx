'use client';

import { useState, useEffect } from 'react';
import { Send, Plus, Pause, Play, Trash2, X, Users, Mail, CheckCircle, AlertTriangle, PlayCircle, BarChart2, Eye, Calendar, ArrowRight } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [leadLists, setLeadLists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', productId: '', listName: '' });

  const [runningCampaignId, setRunningCampaignId] = useState<string | null>(null);
  
  // Analytics State
  const [detailsModalData, setDetailsModalData] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [threadModalData, setThreadModalData] = useState<any | null>(null);

  const fetchCampaigns = () => {
    fetch('/api/campaigns').then(r => r.json()).then(data => {
      if (data.success) setCampaigns(data.campaigns);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchCampaigns();
    fetch('/api/products').then(r => r.json()).then(data => {
      if (data.success) setProducts(data.products);
    });
    fetch('/api/leads/lists').then(r => r.json()).then(data => {
      if (data.success) setLeadLists(data.lists);
    });
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.productId || !form.listName) return alert('Please fill all fields');
    setCreating(true);
    const selectedProduct = products.find(p => p.id === form.productId);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          subject: form.subject,
          productId: form.productId,
          productInfo: `${selectedProduct?.name}: ${selectedProduct?.description}. Features: ${selectedProduct?.features?.join(', ')}. Pricing: ${selectedProduct?.pricing_info || 'Contact us'}`,
          listName: form.listName,
          status: 'ACTIVE'
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm({ name: '', subject: '', productId: '', listName: '' });
        fetchCampaigns();
      }
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await fetch('/api/campaigns', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus })
    });
    fetchCampaigns();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign? Leads will NOT be deleted.')) return;
    await fetch(`/api/campaigns?id=${id}`, { method: 'DELETE' });
    fetchCampaigns();
  };

  const handleRunNow = async (id: string) => {
    setRunningCampaignId(id);
    try {
      const res = await fetch('/api/campaign/run', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: id }) 
      });
      const data = await res.json();
      fetchCampaigns(); // Refresh stats
      alert(data.message || 'Campaign triggered!');
    } catch (e) {
      console.error(e);
      alert('Error triggering campaign');
    } finally {
      setRunningCampaignId(null);
    }
  };

  const handleViewAnalytics = async (id: string) => {
    setLoadingDetails(true);
    setDetailsModalData({ id, loading: true });
    try {
      const res = await fetch(`/api/campaigns/details?id=${id}`);
      const data = await res.json();
      if (data.success) {
        setDetailsModalData(data);
      } else {
        alert('Error fetching details: ' + data.error);
        setDetailsModalData(null);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
      setDetailsModalData(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-400 mt-2">Manage automated email sequences.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium">
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <h2 className="text-lg font-bold text-white">Create New Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Campaign Name</label>
                <input type="text" placeholder="e.g. Q1 Product Launch" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Email Subject Line</label>
                <input type="text" placeholder="e.g. Exclusive offer for your business" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Product</label>
                <select value={form.productId} onChange={e => setForm({...form, productId: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                  <option value="">Select a product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Target Lead List</label>
                <select value={form.listName} onChange={e => setForm({...form, listName: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500">
                  <option value="">Select a list...</option>
                  {leadLists.map(list => <option key={list} value={list}>{list}</option>)}
                </select>
                {leadLists.length === 0 && <p className="text-xs text-amber-500 mt-1">No lists found. Please upload leads first.</p>}
              </div>
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button onClick={handleCreate} disabled={creating} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50">
                {creating ? 'Creating...' : 'Create Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center bg-gray-900/50">
          <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mb-4">
            <Send className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Active Campaigns</h3>
          <p className="text-gray-400 mt-2 max-w-sm">Create a new campaign by selecting a product and a list of leads.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(c => (
            <div key={c.id} className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white">{c.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm mt-1 flex gap-4">
                    <span>Subject: {c.subject}</span>
                    <span>Target List: <span className="text-gray-300 font-medium">{c.listName || 'All'}</span></span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleViewAnalytics(c.id)} 
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20 rounded-lg transition-colors text-sm font-medium"
                  >
                    <BarChart2 className="w-4 h-4" /> Analytics & Emails
                  </button>
                  <button 
                    onClick={() => handleRunNow(c.id)}
                    disabled={runningCampaignId === c.id || c.status !== 'ACTIVE'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/20 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4" /> {runningCampaignId === c.id ? 'Running...' : 'Run Now'}
                  </button>
                  <button onClick={() => handleToggleStatus(c.id, c.status)} className={`p-2 rounded-lg transition-colors ${c.status === 'ACTIVE' ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`} title={c.status === 'ACTIVE' ? 'Pause' : 'Resume'}>
                    {c.status === 'ACTIVE' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-4">
                <div className="p-3 bg-gray-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-white">{c.leadCounts?.total || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Total Leads</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-400">{c.leadCounts?.contacted || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Contacted</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-emerald-400">{c.leadCounts?.replied || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Replied</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-red-400">{c.leadCounts?.bounced || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Bounced</p>
                </div>
                <div className="p-3 bg-gray-800 rounded-xl text-center">
                  <p className="text-2xl font-bold text-gray-500">{c.leadCounts?.dead || 0}</p>
                  <p className="text-xs text-gray-400 mt-1">Dead</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics Modal */}
      {detailsModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-400" /> 
                {detailsModalData.loading ? 'Loading Analytics...' : `Campaign Analytics: ${detailsModalData.campaign?.name}`}
              </h2>
              <button onClick={() => setDetailsModalData(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-950">
              {detailsModalData.loading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="text-gray-400">Fetching lead data and email history...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                      <p className="text-sm text-gray-400">Total List Size</p>
                      <p className="text-2xl font-bold text-white mt-1">{detailsModalData.leads?.length || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                      <p className="text-sm text-gray-400">Pending</p>
                      <p className="text-2xl font-bold text-gray-500 mt-1">{detailsModalData.leads?.filter((l: any) => l.status === 'PENDING').length || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                      <p className="text-sm text-gray-400">Contacted (Waiting Reply)</p>
                      <p className="text-2xl font-bold text-blue-400 mt-1">{detailsModalData.leads?.filter((l: any) => l.status === 'CONTACTED').length || 0}</p>
                    </div>
                    <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
                      <p className="text-sm text-gray-400">Replied / Engaging</p>
                      <p className="text-2xl font-bold text-emerald-400 mt-1">{detailsModalData.leads?.filter((l: any) => l.status === 'REPLIED' || l.status === 'AI_RESPONDED').length || 0}</p>
                    </div>
                  </div>

                  {/* Leads Table */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-gray-300">
                      <thead className="bg-gray-800/50 text-gray-400 border-b border-gray-800">
                        <tr>
                          <th className="px-4 py-3 font-medium">Lead</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Follow Ups</th>
                          <th className="px-4 py-3 font-medium">Last Contacted</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {detailsModalData.leads?.map((lead: any) => (
                          <tr key={lead.id} className="hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-medium text-white">{lead.name || 'Unknown'}</div>
                              <div className="text-xs text-gray-500">{lead.email}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                lead.status === 'PENDING' ? 'bg-gray-800 text-gray-400' :
                                lead.status === 'CONTACTED' ? 'bg-blue-500/20 text-blue-400' :
                                ['REPLIED', 'AI_RESPONDED'].includes(lead.status) ? 'bg-emerald-500/20 text-emerald-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {lead.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-400">{lead.followUpCount || 0}</td>
                            <td className="px-4 py-3 text-gray-400">
                              {lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button 
                                onClick={() => setThreadModalData({ lead, campaignName: detailsModalData.campaign?.name })}
                                disabled={lead.status === 'PENDING'}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-30 disabled:hover:bg-gray-800"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Thread
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(!detailsModalData.leads || detailsModalData.leads.length === 0) && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No leads found in this campaign's target list.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Thread View Modal */}
      {threadModalData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/80">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" /> 
                  Email Thread: {threadModalData.lead.email}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Campaign: {threadModalData.campaignName}</p>
              </div>
              <button onClick={() => setThreadModalData(null)} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-950 space-y-6">
              {threadModalData.lead.history && threadModalData.lead.history.length > 0 ? (
                threadModalData.lead.history.map((msg: any, idx: number) => (
                  <div key={idx} className={`flex flex-col ${msg.type === 'SENT' ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      <span className="text-xs font-semibold text-gray-400">
                        {msg.type === 'SENT' ? 'You (Auto AI)' : threadModalData.lead.name || 'Lead'}
                      </span>
                      <span className="text-xs text-gray-600">•</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(msg.sentAt || msg.receivedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className={`max-w-[85%] rounded-2xl p-4 ${
                      msg.type === 'SENT' 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-sm'
                    }`}>
                      <div className="font-medium text-sm mb-2 pb-2 border-b border-white/10 opacity-90">
                        Subject: {msg.subject}
                      </div>
                      <div className="text-sm whitespace-pre-wrap leading-relaxed opacity-95" dangerouslySetInnerHTML={{ __html: msg.body }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <Mail className="w-8 h-8 mb-2 opacity-20" />
                  <p>Email sent via SMTP but history tracking was not enabled when this campaign ran.</p>
                  <p className="text-xs mt-1">Future emails will be logged here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
