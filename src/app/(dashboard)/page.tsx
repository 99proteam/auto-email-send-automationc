'use client';

import { useState, useEffect } from 'react';
import { Users, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardHome() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => {
        if (d.success) setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const stats = [
    { name: 'Total Leads', value: data?.stats?.totalLeads || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Active Campaign Leads', value: data?.stats?.emailsSent || 0, icon: Mail, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { name: 'Conversions (Replied)', value: data?.stats?.replied || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Requires Action (Bounced)', value: data?.stats?.bounced || 0, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-gray-400 mt-2">Welcome to your AI-powered email lead generation system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-400">{stat.name}</p>
                <p className="text-3xl font-bold text-white mt-1">{loading ? '...' : stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gray-900 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <p>Loading activity...</p>
            </div>
          ) : data?.recentActivity && data.recentActivity.length > 0 ? (
            <div className="space-y-4 mt-4">
              {data.recentActivity.map((activity: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl border border-gray-800">
                  <div>
                    <p className="text-white font-medium">{activity.email}</p>
                    <p className="text-sm text-gray-400">{new Date(activity.date).toLocaleString()}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                    activity.status === 'REPLIED' ? 'bg-emerald-500/20 text-emerald-400' :
                    activity.status === 'AI_RESPONDED' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <p>No activity yet. Start a campaign!</p>
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/leads" className="block w-full text-left px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white transition-colors">
              + Upload Leads
            </Link>
            <Link href="/products" className="block w-full text-left px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white transition-colors">
              + Add Product
            </Link>
            <Link href="/campaigns" className="block w-full text-center px-4 py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 text-sm font-medium transition-colors">
              Start New Campaign
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
