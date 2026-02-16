import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ExternalLink, Save, Loader2, ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';
import Parse from '../config/parse';
import { WEBHOOK_URL, VERIFY_TOKEN } from '../config/parse';

interface FacebookSetupProps { businessId: string; }

interface StepConfig {
  title: string;
  description: string;
  links: { label: string; url: string }[];
  instructions: string[];
  fields?: { key: string; label: string; placeholder: string; saveTarget: 'business' | 'token'; }[];
}

const STEPS: StepConfig[] = [
  {
    title: 'Create Facebook App',
    description: 'Create a new app in the Facebook Developer portal for your business integration.',
    links: [
      { label: 'Facebook Developers Portal', url: 'https://developers.facebook.com/' },
      { label: 'Create New App', url: 'https://developers.facebook.com/apps/creation/' },
    ],
    instructions: [
      'Go to developers.facebook.com and log in with your Facebook account',
      'Click "My Apps" > "Create App"',
      'Select app type: "Business"',
      'Enter app name (e.g., "InnovateHub Business Hub")',
      'Select your Business Manager account',
      'Click "Create App"',
      'Copy your App ID and App Secret from Settings > Basic',
    ],
    fields: [
      { key: 'fbAppId', label: 'Facebook App ID', placeholder: 'Enter your Facebook App ID', saveTarget: 'business' },
      { key: 'fbAppSecret', label: 'Facebook App Secret', placeholder: 'Enter your Facebook App Secret', saveTarget: 'business' },
    ],
  },
  {
    title: 'Add Products to Your App',
    description: 'Enable the Facebook products needed for your business integration.',
    links: [
      { label: 'Facebook App Dashboard', url: 'https://developers.facebook.com/apps/' },
    ],
    instructions: [
      'In your Facebook App dashboard, click "Add Product" for each:',
      'Messenger — For chatbot and messaging',
      'Webhooks — For receiving real-time events',
      'Facebook Login — For user authentication',
      'Marketing API — For ad campaign management',
      'Instagram Graph API — For Instagram integration',
      'Catalog — For product sync and Facebook Shop',
      'Each product will appear in the left sidebar after adding',
    ],
    fields: [],
  },
  {
    title: 'Configure Webhooks',
    description: 'Set up webhook endpoints to receive real-time events from Facebook.',
    links: [
      { label: 'Webhook Documentation', url: 'https://developers.facebook.com/docs/messenger-platform/webhooks' },
    ],
    instructions: [
      'In your App dashboard, go to Webhooks',
      'Click "Edit Subscription"',
      'Enter the Callback URL and Verify Token shown below',
      'Subscribe to these events: messages, messaging_postbacks, feed, leadgen',
      'Click "Verify and Save"',
    ],
    fields: [],
  },
  {
    title: 'Generate Page Access Tokens',
    description: 'Generate long-lived page access tokens for each business page.',
    links: [
      { label: 'Access Token Tool', url: 'https://developers.facebook.com/tools/accesstoken/' },
      { label: 'Token Debugger', url: 'https://developers.facebook.com/tools/debug/accesstoken/' },
    ],
    instructions: [
      'Go to your App > Messenger > Settings',
      'Under "Access Tokens", click "Generate Token"',
      'Select your Facebook Page and grant all permissions',
      'Copy the generated token',
      'Exchange for a long-lived token (60-day expiry)',
      'The token will be stored securely in the Token Store',
    ],
    fields: [
      { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'Paste your page access token here', saveTarget: 'token' },
    ],
  },
  {
    title: 'Store Page & Account IDs',
    description: 'Save your Facebook Page ID, Instagram Account ID, Ad Account ID, and Catalog ID.',
    links: [
      { label: 'Find Page ID', url: 'https://www.facebook.com/help/1503421039731588' },
      { label: 'Business Manager', url: 'https://business.facebook.com/settings/' },
      { label: 'Commerce Manager', url: 'https://www.facebook.com/commerce_manager/' },
    ],
    instructions: [
      'Facebook Page ID: Go to your Page > About > Page ID (or use the Graph API)',
      'Instagram Account ID: Business Manager > Instagram Accounts',
      'Ad Account ID: Business Manager > Ad Accounts (format: act_XXXXXXXX)',
      'Catalog ID: Commerce Manager > Catalogs > select catalog > Settings',
    ],
    fields: [
      { key: 'fbPageId', label: 'Facebook Page ID', placeholder: 'Your Facebook Page ID', saveTarget: 'business' },
      { key: 'igAccountId', label: 'Instagram Account ID', placeholder: 'Your Instagram Business Account ID', saveTarget: 'business' },
      { key: 'adAccountId', label: 'Ad Account ID', placeholder: 'act_XXXXXXXX', saveTarget: 'business' },
      { key: 'fbCatalogId', label: 'Catalog ID', placeholder: 'Your Facebook Commerce Catalog ID', saveTarget: 'business' },
    ],
  },
  {
    title: 'Request Permissions',
    description: 'Submit your app for review to get the required permissions approved.',
    links: [
      { label: 'App Review Guide', url: 'https://developers.facebook.com/docs/app-review' },
      { label: 'Permissions Reference', url: 'https://developers.facebook.com/docs/permissions/reference' },
    ],
    instructions: [
      'Go to App Review > Permissions and Features',
      'Request each permission listed below:',
      'pages_manage_posts — Publish and manage page posts',
      'pages_read_engagement — Read page engagement data',
      'pages_messaging — Send and receive messages',
      'pages_read_user_content — Read user comments and reviews',
      'leads_retrieval — Access lead form data',
      'ads_management — Create and manage ad campaigns',
      'ads_read — Read ad insights and performance',
      'catalog_management — Manage product catalogs',
      'instagram_basic — Access Instagram profile info',
      'instagram_content_publish — Publish Instagram content',
      'instagram_manage_comments — Manage Instagram comments',
      'Submit each permission with a usage description and screencast',
    ],
    fields: [],
  },
  {
    title: 'Test Integration',
    description: 'Verify everything is working by testing the webhook and messenger integration.',
    links: [
      { label: 'Graph API Explorer', url: 'https://developers.facebook.com/tools/explorer/' },
    ],
    instructions: [
      'Test webhook verification by visiting the URL below',
      'Send a test message to your Facebook Page via Messenger',
      'Check the Webhook Logs page for incoming events',
      'Check the Messenger page for new contacts and messages',
      'If using ads, create a test campaign and verify sync',
    ],
    fields: [],
  },
];

const PERMISSIONS = [
  'pages_manage_posts', 'pages_read_engagement', 'pages_messaging',
  'pages_read_user_content', 'leads_retrieval', 'ads_management',
  'ads_read', 'catalog_management', 'instagram_basic',
  'instagram_content_publish', 'instagram_manage_comments',
];

export default function FacebookSetup({ businessId }: FacebookSetupProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    try {
      const stored = localStorage.getItem('fb_setup_completed_' + businessId);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) return;
    const loadBusinessData = async () => {
      try {
        const q = new Parse.Query('Business');
        const biz = await q.get(businessId, { useMasterKey: true });
        const data: Record<string, string> = {};
        ['fbAppId', 'fbAppSecret', 'fbPageId', 'igAccountId', 'adAccountId', 'fbCatalogId'].forEach(key => {
          const val = biz.get(key);
          if (val) data[key] = val;
        });
        setFieldValues(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.error('Failed to load business data:', err);
      }
    };
    loadBusinessData();
  }, [businessId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const saveFields = async (step: StepConfig) => {
    if (!businessId || !step.fields?.length) return;
    setSaving(true);
    try {
      const businessFields: Record<string, string> = {};
      const tokenFields: Record<string, string> = {};

      step.fields.forEach(f => {
        const val = fieldValues[f.key];
        if (!val) return;
        if (f.saveTarget === 'business') businessFields[f.key] = val;
        else tokenFields[f.key] = val;
      });

      if (Object.keys(businessFields).length > 0) {
        const bq = new Parse.Query('Business');
        const biz = await bq.get(businessId, { useMasterKey: true });
        Object.entries(businessFields).forEach(([k, v]) => biz.set(k, v));
        await biz.save(null, { useMasterKey: true });
      }

      if (tokenFields.pageAccessToken) {
        const bPtr = new Parse.Object('Business');
        bPtr.id = businessId;
        const token = new Parse.Object('TokenStore');
        token.set('business', bPtr);
        token.set('platform', 'facebook');
        token.set('tokenType', 'short_lived');
        token.set('accessToken', tokenFields.pageAccessToken);
        await token.save(null, { useMasterKey: true });
      }

      step.fields.forEach(f => {
        if (fieldValues[f.key]) setSavedFields(prev => new Set([...prev, f.key]));
      });

      const newCompleted = new Set(completedSteps);
      newCompleted.add(activeStep);
      setCompletedSteps(newCompleted);
      localStorage.setItem('fb_setup_completed_' + businessId, JSON.stringify([...newCompleted]));
    } catch (err: any) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const markComplete = (stepIdx: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(stepIdx)) newCompleted.delete(stepIdx);
    else newCompleted.add(stepIdx);
    setCompletedSteps(newCompleted);
    localStorage.setItem('fb_setup_completed_' + businessId, JSON.stringify([...newCompleted]));
  };

  const step = STEPS[activeStep];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Facebook Developer Setup</h1>
      <p className="text-slate-400 text-sm mb-6">Step-by-step guide to connect your Facebook Business integration</p>

      {!businessId && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-lg mb-6">
          Please select a business from the dropdown above to save credentials.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-1">
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeStep === i ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {completedSteps.has(i) ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                ) : (
                  <Circle size={16} className="shrink-0" />
                )}
                <span className="truncate">Step {i + 1}: {s.title}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-sm text-slate-400 mb-2">Progress</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${(completedSteps.size / STEPS.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-slate-400">{completedSteps.size}/{STEPS.length}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Step {activeStep + 1}: {step.title}
              </h2>
              <button
                onClick={() => markComplete(activeStep)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  completedSteps.has(activeStep) ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {completedSteps.has(activeStep) ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                {completedSteps.has(activeStep) ? 'Completed' : 'Mark Complete'}
              </button>
            </div>

            <p className="text-slate-400 mb-4">{step.description}</p>

            {step.links.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {step.links.map(link => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-600/20 transition-colors"
                  >
                    <ExternalLink size={14} /> {link.label}
                  </a>
                ))}
              </div>
            )}

            {activeStep === 2 && (
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6 space-y-3">
                <h4 className="text-sm font-medium text-white">Webhook Configuration</h4>
                <div>
                  <label className="text-xs text-slate-500">Callback URL</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-sm text-emerald-400 font-mono">{WEBHOOK_URL}</code>
                    <button onClick={() => copyToClipboard(WEBHOOK_URL, 'webhook_url')} className="p-2 rounded hover:bg-slate-600 text-slate-400">
                      {copied === 'webhook_url' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Verify Token</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-sm text-emerald-400 font-mono">{VERIFY_TOKEN}</code>
                    <button onClick={() => copyToClipboard(VERIFY_TOKEN, 'verify_token')} className="p-2 rounded hover:bg-slate-600 text-slate-400">
                      {copied === 'verify_token' ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeStep === 5 && (
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-white mb-3">Required Permissions Checklist</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PERMISSIONS.map(perm => (
                    <div key={perm} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={14} className="text-slate-600" />
                      <code className="text-slate-300">{perm}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeStep === 6 && (
              <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-white mb-2">Test Webhook URL</h4>
                <a
                  href={`${WEBHOOK_URL}?hub.verify_token=${VERIFY_TOKEN}&hub.mode=subscribe&hub.challenge=test_ok`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  Click to test webhook verification (should return "test_ok")
                </a>
              </div>
            )}

            <div className="mb-6">
              <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <ChevronDown size={16} /> Instructions
              </h4>
              <ol className="space-y-2 ml-4">
                {step.instructions.map((inst, i) => (
                  <li key={i} className="text-sm text-slate-300 list-decimal ml-4">{inst}</li>
                ))}
              </ol>
            </div>

            {step.fields && step.fields.length > 0 && (
              <div className="border-t border-slate-700 pt-4">
                <h4 className="text-sm font-medium text-white mb-4">Save Credentials</h4>
                <div className="space-y-3">
                  {step.fields.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm text-slate-400 mb-1">
                        {field.label}
                        {savedFields.has(field.key) && <span className="text-emerald-400 ml-2 text-xs">Saved</span>}
                      </label>
                      <input
                        type={field.key.includes('Secret') || field.key.includes('Token') ? 'password' : 'text'}
                        value={fieldValues[field.key] || ''}
                        onChange={e => setFieldValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => saveFields(step)}
                    disabled={saving || !businessId}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                  >
                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    Save to Back4App
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700">
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setActiveStep(Math.min(STEPS.length - 1, activeStep + 1))}
                disabled={activeStep === STEPS.length - 1}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
