import { useState, useEffect } from 'react';
import { 
  Facebook, RefreshCw, CheckCircle2, AlertCircle, Send, BarChart3, 
  Plus, Trash2, ExternalLink, Copy, Check, Settings, Zap, Users, MessageSquare
} from 'lucide-react';
import Parse from '../config/parse';

interface FacebookApp {
  objectId: string;
  appId: string;
  appName: string;
  pageId: string;
  pageName: string;
  webhookUrl: string;
  verifyToken: string;
  status: 'active' | 'error' | 'pending';
  permissions: string[];
  lastVerified: string | null;
  createdAt: string;
  business: { objectId: string; name: string } | null;
}

interface AppStats {
  contacts: number;
  conversations: number;
  messagesLast30Days: number;
  leads: number;
  webhookEventsLast7Days: number;
}

const WEBHOOK_BASE = 'https://webhook.innoserver.cloud';

export default function FacebookApps() {
  const [apps, setApps] = useState<FacebookApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<FacebookApp | null>(null);
  const [stats, setStats] = useState<AppStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [testPsid, setTestPsid] = useState('');
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    loadApps();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${WEBHOOK_BASE}/api/facebook-apps`);
      const data = await res.json();
      if (data.success) {
        setApps(data.apps);
        if (data.apps.length > 0 && !selectedApp) {
          setSelectedApp(data.apps[0]);
          loadStats(data.apps[0].objectId);
        }
      }
    } catch (err) {
      console.error('Failed to load apps:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (appId: string) => {
    try {
      setLoadingStats(true);
      const res = await fetch(`${WEBHOOK_BASE}/api/facebook-apps/${appId}/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const verifyApp = async (appId: string) => {
    try {
      setVerifying(appId);
      const res = await fetch(`${WEBHOOK_BASE}/api/facebook-apps/${appId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Verified! Page: ${data.page?.name || 'Unknown'}`);
        loadApps();
      } else {
        alert(`Verification failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setVerifying(null);
    }
  };

  const sendTestMessage = async () => {
    if (!selectedApp || !testPsid || !testMessage) {
      alert('Please select an app, enter a PSID, and a message');
      return;
    }
    try {
      setSending(true);
      setTestResult(null);
      const res = await fetch(`${WEBHOOK_BASE}/api/test/e2e-flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: selectedApp.pageId,
          recipientPsid: testPsid,
          testMessage: testMessage
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-400 bg-emerald-400/10';
      case 'error': return 'text-red-400 bg-red-400/10';
      default: return 'text-amber-400 bg-amber-400/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 size={14} />;
      case 'error': return <AlertCircle size={14} />;
      default: return <RefreshCw size={14} className="animate-spin" />;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Facebook className="text-blue-500" size={28} />
            Facebook Apps
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage your connected Facebook applications and pages</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadApps}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <a
            href="https://developers.facebook.com/apps"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={14} /> Add New App
          </a>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <Facebook className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-white mb-2">No Facebook Apps Configured</h3>
          <p className="text-slate-400 mb-4">Get started by connecting your first Facebook app.</p>
          <a
            href="/facebook-setup"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            <Settings size={16} /> Setup Facebook Integration
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* App List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Connected Apps</h3>
            {apps.map(app => (
              <div
                key={app.objectId}
                onClick={() => { setSelectedApp(app); loadStats(app.objectId); }}
                className={`bg-slate-800 border rounded-xl p-4 cursor-pointer transition-all ${
                  selectedApp?.objectId === app.objectId 
                    ? 'border-blue-500 ring-1 ring-blue-500/50' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <Facebook className="text-blue-400" size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{app.appName}</h4>
                      <p className="text-sm text-slate-400">{app.pageName || 'Page ' + app.pageId}</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(app.status)}`}>
                    {getStatusIcon(app.status)}
                    {app.status}
                  </span>
                </div>
                {app.business && (
                  <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-500">
                    Business: {app.business.name}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* App Details */}
          <div className="lg:col-span-2">
            {selectedApp ? (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Contacts', value: stats?.contacts ?? '—', icon: Users, color: 'text-blue-400' },
                    { label: 'Conversations', value: stats?.conversations ?? '—', icon: MessageSquare, color: 'text-emerald-400' },
                    { label: 'Messages (30d)', value: stats?.messagesLast30Days ?? '—', icon: Send, color: 'text-purple-400' },
                    { label: 'Leads', value: stats?.leads ?? '—', icon: Zap, color: 'text-amber-400' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">{stat.label}</span>
                        <stat.icon className={stat.color} size={16} />
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {loadingStats ? '...' : stat.value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* App Configuration */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Settings size={18} /> Configuration
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-slate-500">App ID</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-sm text-emerald-400 font-mono">{selectedApp.appId}</code>
                          <button onClick={() => copyToClipboard(selectedApp.appId, 'appId')} className="p-2 rounded hover:bg-slate-600 text-slate-400">
                            {copied === 'appId' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Page ID</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-sm text-emerald-400 font-mono">{selectedApp.pageId}</code>
                          <button onClick={() => copyToClipboard(selectedApp.pageId, 'pageId')} className="p-2 rounded hover:bg-slate-600 text-slate-400">
                            {copied === 'pageId' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-slate-500">Webhook URL</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-sm text-blue-400 font-mono overflow-x-auto">{selectedApp.webhookUrl}</code>
                        <button onClick={() => copyToClipboard(selectedApp.webhookUrl, 'webhookUrl')} className="p-2 rounded hover:bg-slate-600 text-slate-400">
                          {copied === 'webhookUrl' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500">Verify Token</label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-sm text-amber-400 font-mono">{selectedApp.verifyToken}</code>
                        <button onClick={() => copyToClipboard(selectedApp.verifyToken, 'verifyToken')} className="p-2 rounded hover:bg-slate-600 text-slate-400">
                          {copied === 'verifyToken' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500">Permissions</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedApp.permissions.length > 0 ? selectedApp.permissions.map(perm => (
                          <span key={perm} className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs font-mono">{perm}</span>
                        )) : (
                          <span className="text-slate-500 text-sm">No permissions listed</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                      <div className="text-sm text-slate-400">
                        Last verified: {selectedApp.lastVerified ? formatDate(selectedApp.lastVerified) : 'Never'}
                      </div>
                      <button
                        onClick={() => verifyApp(selectedApp.objectId)}
                        disabled={verifying === selectedApp.objectId}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        {verifying === selectedApp.objectId ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        Verify Connection
                      </button>
                    </div>
                  </div>
                </div>

                {/* E2E Test */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <Zap size={18} className="text-amber-400" /> End-to-End Flow Test
                  </h3>
                  <p className="text-sm text-slate-400 mb-4">
                    Send a test message through the complete flow: Business → Token → Contact → Conversation → Send API
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-slate-500">Recipient PSID</label>
                      <input
                        type="text"
                        value={testPsid}
                        onChange={e => setTestPsid(e.target.value)}
                        placeholder="Facebook Page-Scoped User ID"
                        className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Get this from your Messenger contacts or webhook logs</p>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Message</label>
                      <textarea
                        value={testMessage}
                        onChange={e => setTestMessage(e.target.value)}
                        placeholder="Hello! This is a test message from InnovateHub."
                        rows={2}
                        className="w-full mt-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={sendTestMessage}
                      disabled={sending || !testPsid || !testMessage}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                      Send Test Message
                    </button>
                    
                    {testResult && (
                      <div className={`mt-4 p-4 rounded-lg ${testResult.success ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-red-900/30 border border-red-700'}`}>
                        <h4 className={`font-medium mb-2 ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                          {testResult.success ? '✓ E2E Flow Successful' : '✗ Flow Failed'}
                        </h4>
                        {testResult.e2eFlow && (
                          <div className="space-y-2 text-sm">
                            {Object.entries(testResult.e2eFlow).map(([step, data]: [string, any]) => (
                              <div key={step} className="flex items-start gap-2">
                                <span className="text-slate-400 whitespace-nowrap">{step.replace('_', ' ')}:</span>
                                <code className="text-emerald-300 text-xs">{JSON.stringify(data)}</code>
                              </div>
                            ))}
                          </div>
                        )}
                        {testResult.error && (
                          <p className="text-red-300 text-sm">{testResult.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Links */}
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Quick Links</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Facebook Page', url: `https://facebook.com/${selectedApp.pageId}` },
                      { label: 'App Dashboard', url: `https://developers.facebook.com/apps/${selectedApp.appId}` },
                      { label: 'Messenger Setup', url: `https://developers.facebook.com/apps/${selectedApp.appId}/messenger/settings/` },
                      { label: 'Webhook Logs', url: '/webhook-logs' },
                    ].map(link => (
                      <a
                        key={link.label}
                        href={link.url}
                        target={link.url.startsWith('http') ? '_blank' : undefined}
                        rel={link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                      >
                        <ExternalLink size={14} /> {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
                <p className="text-slate-400">Select an app from the list to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
