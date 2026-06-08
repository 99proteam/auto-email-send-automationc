import { Send, Plus } from 'lucide-react';

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Campaigns</h1>
          <p className="text-gray-400 mt-2">Manage automated email sequences.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium">
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      <div className="p-12 border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center text-center bg-gray-900/50">
        <div className="w-16 h-16 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center mb-4">
          <Send className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">No Active Campaigns</h3>
        <p className="text-gray-400 mt-2 max-w-sm">Create a new campaign by selecting a product and a list of leads.</p>
      </div>
    </div>
  );
}
