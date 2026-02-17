import { useState, useEffect } from 'react';
import { 
  MessageCircle, Users, TrendingUp, Send, Image, Mail, 
  Calendar, BarChart3, Zap, ChevronRight, Facebook,
  CheckCircle2, Clock, AlertCircle, Sparkles
} from 'lucide-react';

const WEBHOOK_BASE = 'https://webhook.innoserver.cloud';

interface QuickStats {
  totalContacts: number;
  newContactsToday: number;
  messagesThisWeek: number;
  pendingLeads: number;
}

export default function Home() {
  const [stats, setStats] = useState<QuickStats>({ 
    totalContacts: 0, newContactsToday: 0, messagesThisWeek: 0, pendingLeads: 0 
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load Facebook app stats
      const res = await fetch(`${WEBHOOK_BASE}/api/facebook-apps`);
      const data = await res.json();
      if (data.success && data.apps.length > 0) {
        const appId = data.apps[0].objectId;
        const statsRes = await fetch(`${WEBHOOK_BASE}/api/facebook-apps/${appId}/stats`);
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats({
            totalContacts: statsData.stats.contacts || 0,
            newContactsToday: Math.floor(Math.random() * 5), // TODO: real data
            messagesThisWeek: statsData.stats.messagesLast30Days || 0,
            pendingLeads: statsData.stats.leads || 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      icon: Send,
      title: 'Send Campaign Email',
      description: 'Send marketing emails to your contacts',
      href: '#/image-generator',
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      icon: Image,
      title: 'Create Marketing Image',
      description: 'Generate AI images for your ads',
      href: '#/image-generator',
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      icon: MessageCircle,
      title: 'View Messages',
      description: 'See conversations from Facebook',
      href: '#/messenger',
      color: 'bg-emerald-600 hover:bg-emerald-700'
    },
    {
      icon: Users,
      title: 'Manage Contacts',
      description: 'View and organize your leads',
      href: '#/agent-pipeline',
      color: 'bg-amber-600 hover:bg-amber-700'
    }
  ];

  const statsCards = [
    { 
      label: 'Total Contacts', 
      value: stats.totalContacts, 
      icon: Users, 
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10'
    },
    { 
      label: 'Messages This Month', 
      value: stats.messagesThisWeek, 
      icon: MessageCircle, 
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10'
    },
    { 
      label: 'Pending Leads', 
      value: stats.pendingLeads, 
      icon: Clock, 
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10'
    },
    { 
      label: 'Conversion Rate', 
      value: '23%', 
      icon: TrendingUp, 
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/20 rounded-2xl p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center">
            <Sparkles className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome to PlataPay Hub</h1>
            <p className="text-purple-200 mt-1">Your marketing command center</p>
          </div>
        </div>
        <p className="text-slate-300 max-w-2xl">
          Manage your Facebook page, send marketing campaigns, track leads, and grow your PlataPay agent network — all from one place.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(stat => (
          <div key={stat.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">{stat.label}</span>
              <div className={`w-10 h-10 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                <stat.icon className={stat.color} size={20} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white">
              {loading ? '...' : stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(action => (
            <a
              key={action.title}
              href={action.href}
              className={`${action.color} rounded-xl p-5 text-white transition-all hover:scale-[1.02] hover:shadow-lg group`}
            >
              <action.icon size={28} className="mb-3" />
              <h3 className="font-semibold text-lg">{action.title}</h3>
              <p className="text-white/80 text-sm mt-1">{action.description}</p>
              <div className="flex items-center gap-1 mt-3 text-white/60 group-hover:text-white text-sm">
                Go <ChevronRight size={16} />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Facebook Connection Status */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Facebook className="text-blue-500" size={20} />
            Facebook Page
          </h2>
          <div className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <Facebook className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-white">PlataPay PH</h3>
              <p className="text-sm text-slate-400">Page ID: 267252936481761</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-sm">
              <CheckCircle2 size={14} />
              Connected
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{stats.totalContacts}</div>
              <div className="text-xs text-slate-400">Contacts</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{stats.messagesThisWeek}</div>
              <div className="text-xs text-slate-400">Messages</div>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">Active</div>
              <div className="text-xs text-slate-400">Bot Status</div>
            </div>
          </div>
          <a 
            href="#/facebook-apps" 
            className="mt-4 flex items-center justify-center gap-2 w-full bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm transition-colors"
          >
            Manage Facebook Settings <ChevronRight size={16} />
          </a>
        </div>

        {/* How It Works */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="text-amber-400" size={20} />
            How It Works
          </h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Someone messages your Facebook Page', desc: 'Customer inquiries come in 24/7' },
              { step: 2, title: 'AI Bot responds automatically', desc: 'Answers questions, collects info' },
              { step: 3, title: 'Leads are saved to your dashboard', desc: 'Track and follow up easily' },
              { step: 4, title: 'Send campaigns to grow your network', desc: 'Email and messenger marketing' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {item.step}
                </div>
                <div>
                  <h4 className="text-white font-medium">{item.title}</h4>
                  <p className="text-sm text-slate-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Need Help?</h2>
            <p className="text-slate-400">Our team is ready to assist you</p>
          </div>
          <div className="flex gap-3">
            <a 
              href="https://m.me/PlataPay" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <MessageCircle size={16} /> Chat with Us
            </a>
            <a 
              href="tel:+639176851216"
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              📞 Call Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
