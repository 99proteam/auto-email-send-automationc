import { Inbox, CheckCircle2 } from 'lucide-react';

export default function InboxPage() {
  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h1 className="text-3xl font-bold text-white">Manual Review Inbox</h1>
        <p className="text-gray-400 mt-2">Emails that the AI could not answer or require human intervention.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-12 border border-gray-800 rounded-2xl bg-gray-900">
        <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-white">Inbox Zero!</h3>
        <p className="text-gray-400 mt-2 text-center max-w-md">
          The AI is handling everything perfectly. Any queries that need your attention will appear here.
        </p>
      </div>
    </div>
  );
}
