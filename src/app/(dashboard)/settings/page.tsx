'use client';

import { useState, useEffect } from 'react';
import { Settings, Plus, Key, CheckCircle, XCircle, Bot, Timer, Clock, Trash2, Code } from 'lucide-react';

export default function SettingsPage() {
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpResult, setSmtpResult] = useState<{success: boolean, message: string} | null>(null);

  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiResult, setGeminiResult] = useState<{success: boolean, message: string} | null>(null);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [isSavingGemini, setIsSavingGemini] = useState(false);

  // Automation Settings
  const [followUpDelayDays, setFollowUpDelayDays] = useState(3);
  const [maxFollowUps, setMaxFollowUps] = useState(3);
  const [isSavingAutomation, setIsSavingAutomation] = useState(false);
  const [automationResult, setAutomationResult] = useState('');

  // SMTP Settings
  const [servers, setServers] = useState<any[]>([]);
  const [showAddServer, setShowAddServer] = useState(false);
  const [newServer, setNewServer] = useState({ host: '', port: '465', user: '', pass: '', secure: true });
  const [isSavingServer, setIsSavingServer] = useState(false);

  // IMAP Settings
  const [imapConfig, setImapConfig] = useState({ host: '', port: '993', user: '', pass: '', tls: true });
  const [isSavingImap, setIsSavingImap] = useState(false);
  const [imapResult, setImapResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    fetch('/api/settings/automation').then(r => r.json()).then(data => {
      if (data.success && data.settings) {
        setFollowUpDelayDays(data.settings.followUpDelayDays || 3);
        setMaxFollowUps(data.settings.maxFollowUps || 3);
      }
    });

    fetch('/api/smtp').then(r => r.json()).then(data => {
      if (data.success) setServers(data.servers);
    });

    fetch('/api/imap').then(r => r.json()).then(data => {
      if (data.success && data.imap) {
        setImapConfig({
          host: data.imap.host || '',
          port: data.imap.port?.toString() || '993',
          user: data.imap.user || '',
          pass: data.imap.pass || '',
          tls: data.imap.tls !== false
        });
      }
    });
  }, []);

  const handleSaveImap = async () => {
    if (!imapConfig.host || !imapConfig.user) return;
    setIsSavingImap(true);
    try {
      const res = await fetch('/api/imap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imap: { ...imapConfig, port: parseInt(imapConfig.port) } 
        })
      });
      const data = await res.json();
      setImapResult({ success: data.success, message: data.message || (data.success ? 'IMAP settings saved!' : 'Failed') });
    } catch (err: any) {
      setImapResult({ success: false, message: 'API request failed: ' + (err.message || String(err)) });
    } finally {
      setIsSavingImap(false);
    }
  };

  const handleTestSmtp = async () => {
    setIsTestingSmtp(true);
    setSmtpResult(null);
    try {
      const res = await fetch('/api/smtp/test', { method: 'POST' });
      const data = await res.json();
      setSmtpResult({ success: data.success, message: data.message || (data.success ? 'Email sent successfully!' : 'Connection failed') });
    } catch (err: any) {
      setSmtpResult({ success: false, message: 'API request failed: ' + (err.message || String(err)) });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKeyInput.trim()) return;
    setIsSavingGemini(true);
    try {
      const res = await fetch('/api/gemini/save', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiKeyInput })
      });
      const data = await res.json();
      setGeminiResult({ success: data.success, message: data.message || 'Saved successfully!' });
      if (data.success) setGeminiKeyInput('');
    } catch (err: any) {
      setGeminiResult({ success: false, message: 'Save failed: ' + (err.message || String(err)) });
    } finally {
      setIsSavingGemini(false);
    }
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiResult(null);
    try {
      const res = await fetch('/api/gemini/test', { method: 'POST' });
      const data = await res.json();
      setGeminiResult({ success: data.success, message: data.message || 'Test complete.' });
    } catch (err: any) {
      setGeminiResult({ success: false, message: 'API request failed: ' + (err.message || String(err)) });
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleSaveAutomation = async () => {
    setIsSavingAutomation(true);
    setAutomationResult('');
    try {
      const res = await fetch('/api/settings/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followUpDelayDays, maxFollowUps })
      });
      const data = await res.json();
      if (data.success) setAutomationResult('Saved successfully!');
      else setAutomationResult('Failed: ' + data.error);
    } catch (e: any) {
      setAutomationResult('Error: ' + (e.message || String(e)));
    } finally {
      setIsSavingAutomation(false);
    }
  };

  const handleAddServer = async () => {
    if (!newServer.host || !newServer.user) return;
    setIsSavingServer(true);
    try {
      const res = await fetch('/api/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: { ...newServer, port: parseInt(newServer.port) } })
      });
      const data = await res.json();
      if (data.success) {
        setServers(data.servers);
        setShowAddServer(false);
        setNewServer({ host: '', port: '465', user: '', pass: '', secure: true });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingServer(false);
    }
  };

  const handleDeleteServer = async (index: number) => {
    if (!confirm('Delete server?')) return;
    try {
      const res = await fetch(`/api/smtp?index=${index}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setServers(data.servers);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-2">Configure email servers and system preferences.</p>
      </div>

      <div className="grid gap-6">
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-400" />
              Gemini AI Integration
            </h2>
            <button 
              onClick={handleTestGemini}
              disabled={isTestingGemini}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/20 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isTestingGemini ? 'Testing...' : 'Test AI Connection'}
            </button>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-400 mb-2">Securely override Google Gemini API Key in Database:</label>
            <div className="flex gap-2">
              <input 
                type="password" 
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              />
              <button 
                onClick={handleSaveGeminiKey}
                disabled={isSavingGemini || !geminiKeyInput.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl disabled:opacity-50"
              >
                {isSavingGemini ? 'Saving...' : 'Save Key'}
              </button>
            </div>
          </div>
          
          {geminiResult && (
            <div className={`p-4 mb-4 rounded-xl flex items-center gap-3 ${geminiResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {geminiResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
              <span className="font-medium text-sm">{geminiResult.message}</span>
            </div>
          )}

          <div className="text-gray-500 text-sm">
            Ensures the Google Gemini API key is working so the system can generate emails and replies.
          </div>
        </div>

        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Timer className="w-5 h-5 text-blue-400" />
              Follow-Up Automation Rules
            </h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-emerald-400">{automationResult}</span>
              <button 
                onClick={handleSaveAutomation}
                disabled={isSavingAutomation}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {isSavingAutomation ? 'Saving...' : 'Save Rules'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Follow-Up Delay (Days):</label>
              <p className="text-xs text-gray-500 mb-2">How many days to wait before following up if the lead ignores you.</p>
              <input 
                type="number" 
                min="0"
                value={followUpDelayDays}
                onChange={(e) => setFollowUpDelayDays(parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Max Follow-Ups:</label>
              <p className="text-xs text-gray-500 mb-2">Maximum number of follow-up emails before marking the lead as dead.</p>
              <input 
                type="number" 
                min="0"
                value={maxFollowUps}
                onChange={(e) => setMaxFollowUps(parseInt(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Cron Job Guide Section inside Settings */}
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Clock className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              Automated Cron Job Setup
            </h2>
            <p className="text-gray-400 text-sm mb-6">Connect a free cron service to run your campaigns and check your inbox 24/7 on autopilot.</p>
            
            <div className="space-y-6">
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-2"><Code className="w-4 h-4 text-gray-400" /> 1. Create a Cron-Job.org Account</h3>
                <p className="text-gray-400 text-sm">Go to <a href="https://cron-job.org" target="_blank" className="text-blue-400 hover:underline">cron-job.org</a> and sign up for a free account. Click on <strong>Create Cronjob</strong>.</p>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-2"><Code className="w-4 h-4 text-emerald-400" /> 2. Setup Campaign Runner (Sends Emails)</h3>
                <p className="text-gray-400 text-sm mb-3">This endpoint generates and sends initial pitches and follow-up emails to your leads automatically.</p>
                <div className="bg-black/50 p-3 rounded-lg text-sm text-gray-300 font-mono select-all overflow-x-auto">
                  URL: <span className="text-emerald-400">https://your-vercel-domain.vercel.app/api/campaign/run</span>
                </div>
                <ul className="text-sm text-gray-400 mt-3 list-disc pl-5 space-y-1">
                  <li><strong>Schedule:</strong> Every 15 minutes</li>
                  <li><strong>HTTP Method:</strong> POST (Important! Must be POST in Advanced Settings)</li>
                </ul>
              </div>

              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <h3 className="text-white font-semibold flex items-center gap-2 mb-2"><Code className="w-4 h-4 text-purple-400" /> 3. Setup Inbox Checker (Reads Replies)</h3>
                <p className="text-gray-400 text-sm mb-3">This endpoint logs into your IMAP email server, reads unread replies, and uses Gemini to respond instantly.</p>
                <div className="bg-black/50 p-3 rounded-lg text-sm text-gray-300 font-mono select-all overflow-x-auto">
                  URL: <span className="text-purple-400">https://your-vercel-domain.vercel.app/api/inbox/check</span>
                </div>
                <ul className="text-sm text-gray-400 mt-3 list-disc pl-5 space-y-1">
                  <li><strong>Schedule:</strong> Every 10 minutes</li>
                  <li><strong>HTTP Method:</strong> POST</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-400" />
              SMTP Servers
            </h2>
            <div className="flex gap-3">
              <button 
                onClick={handleTestSmtp}
                disabled={isTestingSmtp}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isTestingSmtp ? 'Testing...' : 'Test Connection'}
              </button>
              <button onClick={() => setShowAddServer(!showAddServer)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-sm text-white rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                Add Server
              </button>
            </div>
          </div>
          
          {smtpResult && (
            <div className={`p-4 mb-4 rounded-xl flex items-center gap-3 ${smtpResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {smtpResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
              <span className="font-medium text-sm">{smtpResult.message}</span>
            </div>
          )}

          {showAddServer && (
            <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <h3 className="text-sm font-bold text-white mb-3">New SMTP Server</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder="Host (e.g., smtp.gmail.com)" value={newServer.host} onChange={e => setNewServer({...newServer, host: e.target.value})} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                <input type="number" placeholder="Port (e.g., 465)" value={newServer.port} onChange={e => setNewServer({...newServer, port: e.target.value})} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                <input type="email" placeholder="Username/Email" value={newServer.user} onChange={e => setNewServer({...newServer, user: e.target.value})} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                <input type="password" placeholder="Password / App Password" value={newServer.pass} onChange={e => setNewServer({...newServer, pass: e.target.value})} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddServer(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button onClick={handleAddServer} disabled={isSavingServer} className="px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50">
                  {isSavingServer ? 'Saving...' : 'Save Server'}
                </button>
              </div>
            </div>
          )}

          {servers.length === 0 ? (
            <div className="text-gray-500 text-sm">
              No SMTP servers configured. Add multiple servers to enable rotation.
            </div>
          ) : (
            <div className="grid gap-2">
              {servers.map((s, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-gray-800 rounded-xl border border-gray-700">
                  <div>
                    <span className="text-white font-medium text-sm">{s.host}:{s.port}</span>
                    <span className="text-gray-400 text-xs ml-3">{s.user}</span>
                  </div>
                  <button onClick={() => handleDeleteServer(i)} className="text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-gray-400" />
              IMAP Configuration (Inbox)
            </h2>
            <div className="flex gap-3">
              <button 
                onClick={handleSaveImap}
                disabled={isSavingImap}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-sm text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSavingImap ? 'Saving...' : 'Save IMAP Server'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">IMAP Host</label>
              <input type="text" placeholder="imap.gmail.com" value={imapConfig.host} onChange={e => setImapConfig({...imapConfig, host: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Port</label>
              <input type="number" placeholder="993" value={imapConfig.port} onChange={e => setImapConfig({...imapConfig, port: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Email / Username</label>
              <input type="email" placeholder="you@domain.com" value={imapConfig.user} onChange={e => setImapConfig({...imapConfig, user: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">App Password</label>
              <input type="password" placeholder="••••••••••••" value={imapConfig.pass} onChange={e => setImapConfig({...imapConfig, pass: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-2">
              <input type="checkbox" id="tlsCheckbox" checked={imapConfig.tls} onChange={e => setImapConfig({...imapConfig, tls: e.target.checked})} className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-purple-600 focus:ring-offset-gray-900" />
              <label htmlFor="tlsCheckbox" className="text-sm text-gray-300">Use TLS (Recommended for Port 993)</label>
            </div>
          </div>

          {imapResult && (
            <div className={`p-4 mt-4 rounded-xl flex items-center gap-3 ${imapResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {imapResult.success ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <XCircle className="w-5 h-5 flex-shrink-0" />}
              <span className="font-medium text-sm">{imapResult.message}</span>
            </div>
          )}

          <div className="mt-4 text-gray-500 text-sm">
            Save your IMAP connection so the system can read incoming replies and prompt the AI to respond automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
