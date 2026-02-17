import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, MessageSquare, Users, Send, Image, Facebook, 
  Settings, ChevronLeft, ChevronRight, Menu, LogOut,
  BarChart3, Zap, HelpCircle, ExternalLink
} from 'lucide-react';
import Parse, { BUSINESSES } from '../config/parse';
import ChatWidget from './ChatWidget';

// Simplified navigation - grouped by what users actually do
const mainNav = [
  { path: '/', label: 'Home', icon: Home, description: 'Overview & quick actions' },
  { path: '/messenger', label: 'Messages', icon: MessageSquare, description: 'Facebook conversations' },
  { path: '/agent-pipeline', label: 'Leads & Contacts', icon: Users, description: 'Your potential agents' },
  { path: '/image-generator', label: 'Create Images', icon: Image, description: 'AI marketing images' },
];

const toolsNav = [
  { path: '/facebook-apps', label: 'Facebook', icon: Facebook, description: 'Page connection' },
  { path: '/competitive-intel', label: 'Competitors', icon: BarChart3, description: 'Market analysis' },
  { path: '/bot-flows', label: 'Auto-Replies', icon: Zap, description: 'Bot responses' },
];

const settingsNav = [
  { path: '/settings', label: 'Settings', icon: Settings },
];

// Advanced items - hidden by default, accessible via "More Tools"
const advancedNav = [
  { path: '/businesses', label: 'Businesses' },
  { path: '/pages', label: 'Page Management' },
  { path: '/lead-magnets', label: 'Lead Magnets' },
  { path: '/nurture-sequences', label: 'Email Sequences' },
  { path: '/predictive-analytics', label: 'Analytics' },
  { path: '/campaigns', label: 'Ad Campaigns' },
  { path: '/products', label: 'Products' },
  { path: '/orders', label: 'Orders' },
  { path: '/tokens', label: 'API Tokens' },
  { path: '/webhooks', label: 'Webhook Logs' },
  { path: '/users', label: 'Team' },
  { path: '/facebook-setup', label: 'Facebook Setup' },
  { path: '/ai-workshop', label: 'AI Workshop' },
];

interface LayoutProps {
  children: React.ReactNode;
  activeBusiness: string;
  onBusinessChange: (id: string) => void;
}

export default function Layout({ children, activeBusiness, onBusinessChange }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const location = useLocation();

  const businessName = Object.values(BUSINESSES).find(b => b.id === activeBusiness)?.name || 'PlataPay';

  const NavItem = ({ item, showDescription = false }: { item: any; showDescription?: boolean }) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        to={item.path}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl transition-all ${
          isActive 
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
            : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
        }`}
        title={collapsed ? item.label : undefined}
      >
        {Icon && <Icon size={20} className="shrink-0" />}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium block">{item.label}</span>
            {showDescription && item.description && !isActive && (
              <span className="text-xs text-slate-500 block truncate">{item.description}</span>
            )}
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-20' : 'w-72'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 bg-slate-800 border-r border-slate-700 transition-all duration-200 flex flex-col`}>
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} p-4 border-b border-slate-700`}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <div>
                <span className="text-lg font-bold text-white">PlataPay</span>
                <span className="text-xs text-slate-400 block">Marketing Hub</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Main Navigation */}
          <div className="mb-6">
            {!collapsed && <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Main</div>}
            <div className="space-y-1">
              {mainNav.map(item => <NavItem key={item.path} item={item} showDescription={!collapsed} />)}
            </div>
          </div>

          {/* Tools */}
          <div className="mb-6">
            {!collapsed && <div className="px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tools</div>}
            <div className="space-y-1">
              {toolsNav.map(item => <NavItem key={item.path} item={item} />)}
            </div>
          </div>

          {/* Advanced (toggleable) */}
          {!collapsed && (
            <div className="mb-6">
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-4 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between hover:text-slate-400"
              >
                <span>More Tools</span>
                <ChevronRight size={14} className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
              </button>
              {showAdvanced && (
                <div className="space-y-1">
                  {advancedNav.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-colors ${
                        location.pathname === item.path 
                          ? 'bg-slate-700 text-white' 
                          : 'text-slate-500 hover:bg-slate-700/30 hover:text-slate-300'
                      }`}
                    >
                      <span className="w-5" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          <div className="border-t border-slate-700 pt-4">
            {settingsNav.map(item => <NavItem key={item.path} item={item} />)}
          </div>
        </nav>

        {/* Help & Collapse */}
        <div className="p-3 border-t border-slate-700 space-y-2">
          {!collapsed && (
            <a 
              href="https://m.me/PlataPay" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <HelpCircle size={18} />
              <span>Need Help?</span>
              <ExternalLink size={12} className="ml-auto" />
            </a>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)} 
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-slate-500 hover:bg-slate-700 hover:text-white transition-colors hidden lg:flex"
          >
            {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span className="text-sm">Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700">
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-lg font-semibold text-white">
                {mainNav.find(n => n.path === location.pathname)?.label || 
                 toolsNav.find(n => n.path === location.pathname)?.label ||
                 advancedNav.find(n => n.path === location.pathname)?.label ||
                 'Dashboard'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={activeBusiness}
              onChange={e => onBusinessChange(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Businesses</option>
              {Object.values(BUSINESSES).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            
            <button
              onClick={async () => { await Parse.User.logOut(); window.location.reload(); }}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-700"
              title="Sign out"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      <ChatWidget businessId={activeBusiness} />
    </div>
  );
}
