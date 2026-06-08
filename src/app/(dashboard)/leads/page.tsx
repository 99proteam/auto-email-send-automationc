'use client';

import { useState, useEffect } from 'react';
import { Users, UploadCloud, Clock, Mail } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/leads').then(r => r.json()).then(data => {
      if (data.success) setLeads(data.leads);
      setLoading(false);
    });
  }, []);

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
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium">
          <UploadCloud className="w-4 h-4" />
          Upload CSV
        </button>
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
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Follow-Ups</th>
                <th className="p-4 font-medium">Days Active</th>
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
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs">{lead.status}</span>
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
