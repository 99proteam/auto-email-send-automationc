import { Users, Mail, CheckCircle, AlertCircle } from 'lucide-react';

export default function DashboardHome() {
  const stats = [
    { name: 'Total Leads', value: '0', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'Emails Sent', value: '0', icon: Mail, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { name: 'Conversions', value: '0', icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Requires Action', value: '0', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
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
                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gray-900 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <p>No activity yet. Start a campaign!</p>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white transition-colors">
              + Upload Leads
            </button>
            <button className="w-full text-left px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium text-white transition-colors">
              + Add Product
            </button>
            <button className="w-full text-left px-4 py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 text-sm font-medium transition-colors">
              Start New Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
