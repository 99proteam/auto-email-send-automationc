'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, UploadCloud, Trash2, X, FileText, Filter } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState('');
  const [listName, setListName] = useState('');
  const [filterList, setFilterList] = useState('All');

  const fetchLeads = () => {
    fetch('/api/leads').then(r => r.json()).then(data => {
      if (data.success) setLeads(data.leads);
      setLoading(false);
    });
  };

  useEffect(() => { fetchLeads(); }, []);

  // Unique list names for the filter dropdown
  const uniqueLists = Array.from(new Set(leads.map(l => l.listName))).sort();
  const filteredLeads = filterList === 'All' ? leads : leads.filter(l => l.listName === filterList);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const firstLine = lines[0].toLowerCase();
    const startIndex = (firstLine.includes('email') || firstLine.includes('name')) ? 1 : 0;
    
    const parsed = lines.slice(startIndex).map(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      return { email: parts[0] || '', name: parts[1] || '', company: parts[2] || '' };
    }).filter(l => l.email && l.email.includes('@'));
    
    setParsedLeads(parsed);
    setListName(`List - ${new Date().toLocaleDateString()}`); // Default list name
    setShowPreview(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!listName.trim()) return alert("Please provide a List Name");
    setUploading(true);
    setUploadResult('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: parsedLeads, listName: listName.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult(`Added ${data.count} leads (${data.skipped} skipped as duplicates in this list)`);
        setShowPreview(false);
        setParsedLeads([]);
        fetchLeads();
      } else {
        setUploadResult('Error: ' + data.error);
      }
    } catch (err: any) {
      setUploadResult('Error: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lead?')) return;
    try {
      await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
      fetchLeads();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Leads Audience</h1>
          <p className="text-gray-400 mt-2">Manage your target audience lists.</p>
        </div>
        <div className="flex gap-3 items-center">
          {uploadResult && <span className="text-sm text-emerald-400">{uploadResult}</span>}
          <input type="file" accept=".csv,.txt" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium">
            <UploadCloud className="w-4 h-4" />
            Upload CSV
          </button>
        </div>
      </div>

      {/* CSV Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" /> Upload {parsedLeads.length} leads
              </h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-4 border-b border-gray-800">
              <label className="block text-sm font-medium text-gray-400 mb-1">Assign to List:</label>
              <input 
                type="text" 
                value={listName} 
                onChange={e => setListName(e.target.value)}
                placeholder="e.g. CEO Contacts Q3"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">You will select this List Name when creating a new campaign.</p>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-left text-sm">
                <thead><tr className="text-gray-400 border-b border-gray-800"><th className="p-2">Email</th><th className="p-2">Name</th><th className="p-2">Company</th></tr></thead>
                <tbody className="divide-y divide-gray-800">
                  {parsedLeads.slice(0, 50).map((l, i) => (
                    <tr key={i} className="text-gray-300"><td className="p-2">{l.email}</td><td className="p-2">{l.name}</td><td className="p-2">{l.company}</td></tr>
                  ))}
                  {parsedLeads.length > 50 && <tr><td colSpan={3} className="p-2 text-gray-500 text-center">...and {parsedLeads.length - 50} more</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !listName.trim()} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50">
                {uploading ? 'Uploading...' : `Upload to "${listName || '...'}"`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 items-center bg-gray-900 border border-gray-800 rounded-xl p-4">
        <Filter className="w-5 h-5 text-gray-400" />
        <span className="text-gray-300 text-sm font-medium">Filter by List:</span>
        <select 
          value={filterList} 
          onChange={e => setFilterList(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="All">All Leads</option>
          {uniqueLists.map(list => (
            <option key={list as string} value={list as string}>{list}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center bg-gray-900/50">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Leads Found</h3>
          <p className="text-gray-400 mt-2 max-w-sm">Upload a CSV file with email addresses to start targeting potential customers.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/50 text-gray-400 text-sm border-b border-gray-800">
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Company</th>
                <th className="p-4 font-medium">List Name</th>
                <th className="p-4 font-medium">Date Added</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="text-gray-300 text-sm hover:bg-gray-800/20">
                  <td className="p-4">{lead.email}</td>
                  <td className="p-4">{lead.name || '-'}</td>
                  <td className="p-4">{lead.company || '-'}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs border border-gray-700">
                      {lead.listName}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleDelete(lead.id)} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
