import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, MessageSquare, Bot, FileText,
  Megaphone, ShoppingBag, Package, Key, Webhook, Users,
  Facebook, Settings, ChevronLeft, ChevronRight, Menu, Wand2,
  Magnet, Mail, UserCheck, LogOut, Target, TrendingUp, ImagePlus
} from 'lucide-react';
import Parse, { BUSINESSES } from '../config/parse';
import ChatWidget from './ChatWidget';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/businesses', label: 'Businesses', icon: Building2 },
  { path: '/messenger', label: 'Messenger', icon: MessageSquare },
  { path: '/bot-flows', label: 'Bot Flows', icon: Bot },
  { path: '/pages', label: 'Page Management', icon: FileText },
  { path: '/lead-magnets', label: 'Lead Magnets', icon: Magnet },
  { path: '/nurture-sequences', label: 'Nurture Sequences', icon: Mail },
  { path: '/agent-pipeline', label: 'Agent Pipeline', icon: UserCheck },
  { path: '/competitive-intel', label: 'Competitive Intel', icon: Target },
  { path: '/predictive-analytics', label: 'Predictive Analytics', icon: TrendingUp },
  { path: '/campaigns', label: 'Ads & Campaigns', icon: Megaphone },
  { path: '/products', label: 'Products', icon: ShoppingBag },
  { path: '/orders', label: 'Orders', icon: Package },
  { path: '/tokens', label: 'Token Store', icon: Key },
  { path: '/webhooks', label: 'Webhook Logs', icon: Webhook },
  { path: '/users', label: 'Users & Roles', icon: Users },
  { path: '/facebook-setup', label: 'Facebook Setup', icon: Facebook },
  { path: '/image-generator', label: 'Image Generator', icon: ImagePlus },
  { path: '/ai-workshop', label: 'AI Workshop', icon: Wand2 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

interface LayoutProps {
  children: React.ReactNode;
  activeBusiness: string;
  onBusinessChange: (id: string) => void;
}

export default function Layout({ children, activeBusiness, onBusinessChange }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const businessName = Object.values(BUSINESSES).find(b => b.id === activeBusiness)?.name || 'Select Business';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`${collapsed ? 'w-16' : 'w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 bg-slate-800 border-r border-slate-700 transition-all duration-200 flex flex-col`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-slate-700`}>
          {!collapsed && <span className="text-lg font-bold text-blue-400">InnovateHub</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-slate-700 text-slate-400 hidden lg:block">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-4">
            <select
              value={activeBusiness}
              onChange={e => onBusinessChange(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Businesses</option>
              {Object.values(BUSINESSES).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{businessName}</span>
            <button
              onClick={async () => { await Parse.User.logOut(); window.location.reload(); }}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      <ChatWidget businessId={activeBusiness} />
    </div>
  );
}
