import { useState, useRef, useEffect } from 'react';
import { Wand2, Send, Loader2, Check, X, Rocket, Code2, FileCode, RotateCcw, Sparkles } from 'lucide-react';

const AI_PROXY = 'http://72.61.113.227:3456';

interface GeneratedFile {
  path: string;
  content: string;
  action: 'create' | 'modify';
}

interface GenerateResult {
  plan: string;
  files: GeneratedFile[];
  route?: { path: string; component: string; importPath: string };
  navItem?: { path: string; label: string; icon: string };
  schema?: { className: string; fields: Record<string, string> } | null;
}

interface HistoryEntry {
  id: string;
  prompt: string;
  plan: string;
  status: 'generated' | 'deployed' | 'failed';
  timestamp: number;
}

const TEMPLATES = [
  { label: 'CRM Contacts', prompt: 'Create a CRM Contacts page that displays a table of customer contacts with name, email, phone, company, status (lead/customer/churned), last contacted date, and notes. Include stats at the top showing total contacts, active customers, and new leads this month. Use a new Parse class called CRMContact with fields: name (String), email (String), phone (String), company (String), status (String), lastContactedAt (Date), notes (String), business (Pointer<Business>).' },
  { label: 'Email Campaigns', prompt: 'Create an Email Campaigns management page with a table showing campaign name, subject line, status (draft/scheduled/sent), recipients count, open rate, click rate, and sent date. Include stats: total campaigns, emails sent, average open rate. Use a new Parse class EmailCampaign with fields: name (String), subject (String), body (String), status (String), recipientCount (Number), openRate (Number), clickRate (Number), sentAt (Date), business (Pointer<Business>).' },
  { label: 'Analytics Dashboard', prompt: 'Create an Analytics & Reports page showing business metrics. Include line chart placeholders for: daily messages received, new leads per week, product views. Show stat cards for: total revenue, conversion rate, average response time, customer satisfaction. Display a table of top-performing products. No new schema needed - use existing Product, FbLead, Message, and Conversation classes.' },
  { label: 'Payment Processing', prompt: 'Create a Payment Processing page for PlataPay integration. Show stat cards: total transactions, revenue today, pending payouts, failed transactions. Include a transactions table with: transaction ID, customer name, amount, currency (PHP), status (completed/pending/failed/refunded), payment method, date. Use a new Parse class PaymentTransaction with fields: transactionId (String), customerName (String), amount (Number), currency (String), status (String), paymentMethod (String), business (Pointer<Business>).' },
  { label: 'Inventory Manager', prompt: 'Create an Inventory Management page. Show stat cards: total SKUs, low stock items, out of stock, total inventory value. Include a products table with: SKU, product name, category, quantity in stock, reorder level, unit cost, total value, status (in-stock/low/out). Highlight low stock in yellow and out of stock in red. Use existing Product class but add inventory fields: sku (String), quantityInStock (Number), reorderLevel (Number), unitCost (Number).' },
  { label: 'Telegram Integration', prompt: 'Create a Telegram Bot Integration page. Show configuration section for: bot token input, webhook URL display, connected status indicator. Show stat cards: messages received, messages sent, active users, bot uptime. Display a recent messages table with: user, message, direction (in/out), timestamp. Use a new Parse class TelegramMessage with fields: chatId (String), userName (String), message (String), direction (String), business (Pointer<Business>).' },
];

interface AIWorkshopProps {
  businessId: string;
}

export default function AIWorkshop({ businessId }: AIWorkshopProps) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState('');
  const [activeFileIdx, setActiveFileIdx] = useState(0);
  const [deployLog, setDeployLog] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ai_workshop_history') || '[]');
    } catch { return []; }
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem('ai_workshop_history', JSON.stringify(history.slice(-20)));
  }, [history]);

  const generate = async (text?: string) => {
    const p = text || prompt.trim();
    if (!p || generating) return;
    setGenerating(true);
    setError('');
    setResult(null);
    setDeployLog([]);

    try {
      const res = await fetch(`${AI_PROXY}/agent/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      if (data.error) throw new Error(data.error);

      setResult(data);
      setActiveFileIdx(0);
      setHistory(prev => [...prev, {
        id: Date.now().toString(),
        prompt: p,
        plan: data.plan,
        status: 'generated',
        timestamp: Date.now(),
      }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const deploy = async () => {
    if (!result || deploying) return;
    setDeploying(true);
    setDeployLog(['Starting deployment...']);

    try {
      const res = await fetch(`${AI_PROXY}/agent/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: result.files,
          route: result.route,
          navItem: result.navItem,
          schema: result.schema,
        }),
      });
      const data = await res.json();

      const logs: string[] = [];
      for (const entry of (data.log || [])) {
        if (entry.step === 'schema') logs.push(`Schema: ${entry.success ? 'Created' : 'Failed'}`);
        if (entry.step === 'write') logs.push(`Files: ${entry.files?.length || 0} written`);
        if (entry.step === 'route') logs.push(`Route: ${entry.path} added`);
        if (entry.step === 'nav') logs.push(`Nav: "${entry.label}" added`);
        if (entry.step === 'build') logs.push(`Build: ${entry.success ? 'Success' : 'FAILED'}`);
        if (entry.step === 'deploy') logs.push(`Deploy: ${entry.success ? 'Live!' : 'FAILED'}`);
      }
      setDeployLog(logs);

      if (data.success) {
        setHistory(prev => prev.map((h, i) =>
          i === prev.length - 1 ? { ...h, status: 'deployed' } : h
        ));
      } else {
        setHistory(prev => prev.map((h, i) =>
          i === prev.length - 1 ? { ...h, status: 'failed' } : h
        ));
      }
    } catch (err: any) {
      setDeployLog(prev => [...prev, `Error: ${err.message}`]);
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wand2 className="text-purple-400" size={28} />
            AI Workshop
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Describe a feature and Claude will generate the code, build it, and deploy it live
          </p>
        </div>
        {result && (
          <button onClick={() => { setResult(null); setPrompt(''); setError(''); setDeployLog([]); }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700">
            <RotateCcw size={14} /> New
          </button>
        )}
      </div>

      {/* Templates */}
      {!result && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-1">
            <Sparkles size={14} /> Quick Templates
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {TEMPLATES.map(t => (
              <button key={t.label} onClick={() => { setPrompt(t.prompt); generate(t.prompt); }}
                disabled={generating}
                className="text-left p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/80 transition-colors disabled:opacity-50">
                <span className="text-sm font-medium text-white">{t.label}</span>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.prompt.slice(0, 80)}...</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {!result && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) generate(); }}
            placeholder="Describe the feature you want to build... (e.g. 'Create a CRM page with contact management')"
            rows={4}
            disabled={generating}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-slate-500">Cmd+Enter to generate</span>
            <button onClick={() => generate()} disabled={!prompt.trim() || generating}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {generating ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <X className="text-red-400 shrink-0 mt-0.5" size={18} />
          <div>
            <p className="text-red-400 text-sm font-medium">Generation Failed</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Plan + Deploy */}
          <div className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-1">
                <Code2 size={14} /> Plan
              </h3>
              <p className="text-sm text-slate-300">{result.plan}</p>

              <div className="mt-3 space-y-1 text-xs text-slate-400">
                {result.files?.map((f, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <FileCode size={12} className={f.action === 'create' ? 'text-emerald-400' : 'text-amber-400'} />
                    <span>{f.path}</span>
                    <span className={`ml-auto ${f.action === 'create' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {f.action}
                    </span>
                  </div>
                ))}
                {result.route && (
                  <div className="flex items-center gap-1 text-blue-400">
                    + Route: {result.route.path}
                  </div>
                )}
                {result.navItem && (
                  <div className="flex items-center gap-1 text-blue-400">
                    + Nav: {result.navItem.label}
                  </div>
                )}
                {result.schema && (
                  <div className="flex items-center gap-1 text-cyan-400">
                    + Schema: {result.schema.className}
                  </div>
                )}
              </div>
            </div>

            {/* Deploy */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <button onClick={deploy} disabled={deploying}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50">
                {deploying ? <Loader2 className="animate-spin" size={18} /> : <Rocket size={18} />}
                {deploying ? 'Deploying...' : 'Deploy to Production'}
              </button>

              {deployLog.length > 0 && (
                <div className="mt-3 space-y-1">
                  {deployLog.map((line, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {line.includes('FAILED') || line.includes('Error') ? (
                        <X size={12} className="text-red-400" />
                      ) : line.includes('Live') || line.includes('Success') ? (
                        <Check size={12} className="text-emerald-400" />
                      ) : (
                        <div className="w-3 h-3 rounded-full bg-slate-600" />
                      )}
                      <span className={
                        line.includes('FAILED') || line.includes('Error') ? 'text-red-400' :
                        line.includes('Live') || line.includes('Success') ? 'text-emerald-400' :
                        'text-slate-400'
                      }>{line}</span>
                    </div>
                  ))}
                  {deployLog.some(l => l.includes('Live')) && (
                    <p className="text-emerald-400 text-xs mt-2 font-medium">
                      Refresh the page to see your new feature!
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-2">History</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {[...history].reverse().slice(0, 10).map(h => (
                    <div key={h.id} className="text-xs border-b border-slate-700/50 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 truncate">{h.plan || h.prompt.slice(0, 50)}</span>
                        <span className={`shrink-0 ml-2 ${
                          h.status === 'deployed' ? 'text-emerald-400' :
                          h.status === 'failed' ? 'text-red-400' : 'text-amber-400'
                        }`}>{h.status}</span>
                      </div>
                      <span className="text-slate-600">{new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Code Preview (2 cols wide) */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {/* File tabs */}
            <div className="flex border-b border-slate-700 overflow-x-auto">
              {result.files?.map((f, i) => (
                <button key={i} onClick={() => setActiveFileIdx(i)}
                  className={`px-4 py-2 text-xs whitespace-nowrap border-b-2 transition-colors ${
                    i === activeFileIdx
                      ? 'border-purple-500 text-purple-400 bg-slate-700/30'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}>
                  {f.path}
                </button>
              ))}
            </div>
            {/* Code */}
            <pre className="p-4 text-xs text-slate-300 overflow-auto max-h-[600px] leading-relaxed">
              <code>{result.files?.[activeFileIdx]?.content || 'No files generated'}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
