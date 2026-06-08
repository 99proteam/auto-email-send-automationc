'use client';

import { useState, useEffect } from 'react';
import { Send, Plus, Pause, Play, Trash2, X, Users, Mail, CheckCircle, AlertTriangle } from 'lucide-react';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [leadLists, setLeadLists] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', productId: '', listName: '' });

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
    </div>
  );
}
