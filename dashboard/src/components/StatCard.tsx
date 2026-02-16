import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  loading?: boolean;
}

export default function StatCard({ title, value, icon: Icon, color = 'blue', loading }: StatCardProps) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    yellow: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.blue}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm opacity-80">{title}</span>
        <Icon size={20} />
      </div>
      {loading ? (
        <div className="h-8 bg-slate-700/50 rounded animate-pulse w-16" />
      ) : (
        <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      )}
    </div>
  );
}
