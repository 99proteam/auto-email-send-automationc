'use client';

import { useState, useEffect, useRef } from 'react';
import { Users, UploadCloud, Clock, Mail, Trash2, X, FileText } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [parsedLeads, setParsedLeads] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState('');

  const fetchLeads = () => {
    fetch('/api/leads').then(r => r.json()).then(data => {
      if (data.success) setLeads(data.leads);
      setLoading(false);
    });
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Detect if first line is a header
    const firstLine = lines[0].toLowerCase();
    const startIndex = (firstLine.includes('email') || firstLine.includes('name')) ? 1 : 0;
    
    const parsed = lines.slice(startIndex).map(line => {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      return { email: parts[0] || '', name: parts[1] || '', company: parts[2] || '' };
    }).filter(l => l.email && l.email.includes('@'));
    
    setParsedLeads(parsed);
    setShowPreview(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    setUploading(true);
    setUploadResult('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: parsedLeads })
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult(`Added ${data.count} leads (${data.skipped} skipped as duplicates)`);
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

  const statusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-700 text-gray-300';
      case 'CONTACTED': return 'bg-blue-500/20 text-blue-400';
      case 'REPLIED': return 'bg-emerald-500/20 text-emerald-400';
      case 'AI_RESPONDED': return 'bg-purple-500/20 text-purple-400';
      case 'BOUNCED': return 'bg-red-500/20 text-red-400 font-bold border border-red-500/30';
      case 'DEAD': return 'bg-gray-800 text-gray-500';
      default: return 'bg-gray-800 text-gray-300';
    }
  };

  const calculateDaysActive = (firstContactedAt: string) => {
    if (!firstContactedAt) return null;
    const diffTime = Math.abs(new Date().getTime() - new Date(firstContactedAt).getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Leads</h1>
          <p className="text-gray-400 mt-2">Manage your target audience and track automations.</p>
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
                <FileText className="w-5 h-5 text-blue-400" /> Preview CSV — {parsedLeads.length} leads found
              </h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
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
              <button onClick={handleUpload} disabled={uploading} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50">
                {uploading ? 'Uploading...' : `Upload ${parsedLeads.length} Leads`}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Follow-Ups</th>
                <th className="p-4 font-medium">Days Active</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {leads.map(lead => {
                const daysActive = calculateDaysActive(lead.firstContactedAt);
                let daysColor = "text-gray-500";
                if (daysActive !== null) {
                  if (daysActive > 7) daysColor = "text-red-400 font-bold";
                  else if (daysActive > 3) daysColor = "text-yellow-400 font-medium";
                  else daysColor = "text-emerald-400";
                }
                return (
                  <tr key={lead.id} className="text-gray-300 text-sm hover:bg-gray-800/20">
                    <td className="p-4">{lead.email}</td>
                    <td className="p-4">{lead.name || '-'}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs ${statusColor(lead.status)}`}>{lead.status}</span>
                    </td>
                    <td className="p-4 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      {lead.followUpCount || 0}
                    </td>
                    <td className="p-4">
                      {daysActive !== null ? (
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${daysColor}`} />
                          <span className={daysColor}>{daysActive} days</span>
                        </div>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <button onClick={() => handleDelete(lead.id)} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
