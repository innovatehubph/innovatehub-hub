import { useState, useEffect } from 'react';
import { MessageSquare, Users, Target, ShoppingBag, Megaphone, Webhook, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Parse from '../config/parse';
import StatCard from '../components/StatCard';

interface DashboardProps {
  businessId: string;
}

export default function Dashboard({ businessId }: DashboardProps) {
  const [stats, setStats] = useState({
    messages: 0, conversations: 0, leads: 0,
    products: 0, campaigns: 0, webhookLogs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const classes = ['Message', 'Conversation', 'FbLead', 'Product', 'AdCampaign', 'WebhookLog'];
        const counts = await Promise.all(classes.map(async cls => {
          const q = new Parse.Query(cls);
          if (businessId) {
            const bPtr = new Parse.Object('Business');
            bPtr.id = businessId;
            q.equalTo('business', bPtr);
          }
          return q.count({ useMasterKey: true });
        }));

        setStats({
          messages: counts[0], conversations: counts[1], leads: counts[2],
          products: counts[3], campaigns: counts[4], webhookLogs: counts[5],
        });

        const logQuery = new Parse.Query('WebhookLog');
        if (businessId) {
          const bPtr = new Parse.Object('Business');
          bPtr.id = businessId;
          logQuery.equalTo('business', bPtr);
        }
        logQuery.descending('createdAt');
        logQuery.limit(5);
        const logs = await logQuery.find({ useMasterKey: true });
        setRecentLogs(logs.map((l: any) => l.toJSON()));
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [businessId]);

  const quickActions = [
    { label: 'Messenger', path: '/messenger', icon: MessageSquare },
    { label: 'Campaigns', path: '/campaigns', icon: Megaphone },
    { label: 'Products', path: '/products', icon: ShoppingBag },
    { label: 'Facebook Setup', path: '/facebook-setup', icon: Target },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Overview of your Facebook Business Hub</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Messages" value={stats.messages} icon={MessageSquare} color="blue" loading={loading} />
        <StatCard title="Conversations" value={stats.conversations} icon={Users} color="green" loading={loading} />
        <StatCard title="Leads" value={stats.leads} icon={Target} color="purple" loading={loading} />
        <StatCard title="Products" value={stats.products} icon={ShoppingBag} color="yellow" loading={loading} />
        <StatCard title="Ad Campaigns" value={stats.campaigns} icon={Megaphone} color="cyan" loading={loading} />
        <StatCard title="Webhook Events" value={stats.webhookLogs} icon={Webhook} color="red" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => (
              <Link
                key={action.path}
                to={action.path}
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group"
              >
                <action.icon size={20} className="text-blue-400" />
                <span className="text-sm text-slate-300 group-hover:text-white">{action.label}</span>
                <ArrowRight size={14} className="text-slate-500 ml-auto group-hover:text-blue-400" />
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Recent Webhook Events</h3>
          {recentLogs.length === 0 ? (
            <p className="text-slate-500 text-sm">No webhook events yet. Connect your Facebook app to start receiving events.</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map(log => (
                <div key={log.objectId} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                  <div>
                    <span className="text-sm text-slate-300">{log.eventType || log.source || 'event'}</span>
                    <span className="text-xs text-slate-500 ml-2">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    log.status === 'processed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>{log.status || 'logged'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
