import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { BUSINESSES, WEBHOOK_URL, VERIFY_TOKEN } from '../config/parse';

interface SettingsProps {
  businessId: string;
  onBusinessChange: (id: string) => void;
}

export default function Settings({ businessId, onBusinessChange }: SettingsProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button onClick={() => copyToClipboard(text, id)} className="p-1.5 rounded hover:bg-slate-600 text-slate-400 shrink-0">
      {copied === id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  );

  const credentials = [
    { label: 'App ID', value: 'lOpBh4pgpWdiYJmAU4aXSNyYYY8d86hxH2hilkWN', masked: false },
    { label: 'JavaScript Key', value: '4LJLYoC5inPb7m8zkNs6KmwnqlnvQ2eXa2Z5LMhm', masked: true },
    { label: 'REST API Key', value: 'Mm5xEZqtyTa4jhAF7yZU6Puve5eSK5GzG5QKxjHr', masked: true },
    { label: 'Master Key', value: 't78J6V3bHE18i0ZfTIqVIyLUxlLYdU0L1GZYJd4h', masked: true },
    { label: 'Webhook Key', value: '9xGv7R1tdaLKM60nismVU0u9NZg0mofWDMY8BF0w', masked: true },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Active Business</h3>
          <select
            value={businessId}
            onChange={e => onBusinessChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Businesses</option>
            {Object.values(BUSINESSES).map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.slug})</option>
            ))}
          </select>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Webhook Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-500">Callback URL</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-sm text-emerald-400 font-mono truncate">{WEBHOOK_URL}</code>
                <CopyButton text={WEBHOOK_URL} id="webhook" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">Verify Token</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-sm text-emerald-400 font-mono">{VERIFY_TOKEN}</code>
                <CopyButton text={VERIFY_TOKEN} id="verify" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Back4App API Keys</h3>
          <div className="space-y-3">
            {credentials.map(cred => (
              <div key={cred.label}>
                <label className="text-xs text-slate-500">{cred.label}</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-sm text-slate-400 font-mono truncate">
                    {cred.masked ? '****' + cred.value.slice(-8) : cred.value}
                  </code>
                  <CopyButton text={cred.value} id={cred.label} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Useful Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Back4App Dashboard', url: 'https://dashboard.back4app.com/' },
              { label: 'Facebook Developers', url: 'https://developers.facebook.com/' },
              { label: 'Graph API Explorer', url: 'https://developers.facebook.com/tools/explorer/' },
              { label: 'Commerce Manager', url: 'https://www.facebook.com/commerce_manager/' },
              { label: 'Business Manager', url: 'https://business.facebook.com/' },
              { label: 'Token Debugger', url: 'https://developers.facebook.com/tools/debug/accesstoken/' },
            ].map(link => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-sm text-slate-300 hover:text-white"
              >
                <ExternalLink size={14} className="text-blue-400 shrink-0" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
