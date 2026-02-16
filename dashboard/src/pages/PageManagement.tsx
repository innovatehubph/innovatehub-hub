import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const postColumns: ColumnDef[] = [
  { key: 'content', label: 'Content', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['draft', 'scheduled', 'published', 'failed'] },
  { key: 'fbPostId', label: 'FB Post ID', type: 'text', editable: false },
  { key: 'mediaUrls', label: 'Media', type: 'json' },
  { key: 'scheduledFor', label: 'Scheduled For', type: 'date' },
  { key: 'publishedAt', label: 'Published', type: 'date', editable: false },
];

const commentColumns: ColumnDef[] = [
  { key: 'authorName', label: 'Author', type: 'text', editable: false },
  { key: 'content', label: 'Comment', type: 'text', editable: false },
  { key: 'sentiment', label: 'Sentiment', type: 'select', options: ['positive', 'neutral', 'negative'] },
  { key: 'isReplied', label: 'Replied', type: 'boolean' },
  { key: 'createdAt', label: 'Date', type: 'date', editable: false },
];

const insightColumns: ColumnDef[] = [
  { key: 'date', label: 'Date', type: 'date', editable: false },
  { key: 'pageViews', label: 'Page Views', type: 'number', editable: false },
  { key: 'newFans', label: 'New Fans', type: 'number', editable: false },
  { key: 'engagedUsers', label: 'Engaged Users', type: 'number', editable: false },
  { key: 'impressions', label: 'Impressions', type: 'number', editable: false },
];

interface PageManagementProps { businessId: string; }

export default function PageManagement({ businessId }: PageManagementProps) {
  const [tab, setTab] = useState<'posts' | 'comments' | 'insights'>('posts');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const posts = useParseQuery({ className: 'PagePost', businessId, limit: pageSize, skip: page * pageSize });
  const comments = useParseQuery({ className: 'PostComment', businessId, limit: pageSize, skip: page * pageSize });
  const insights = useParseQuery({ className: 'PageInsight', businessId, limit: pageSize, skip: page * pageSize, orderBy: 'date' });

  const tabs = [
    { key: 'posts' as const, label: 'Posts', count: posts.count },
    { key: 'comments' as const, label: 'Comments', count: comments.count },
    { key: 'insights' as const, label: 'Insights', count: insights.count },
  ];

  const activeQuery = tab === 'posts' ? posts : tab === 'comments' ? comments : insights;
  const activeColumns = tab === 'posts' ? postColumns : tab === 'comments' ? commentColumns : insightColumns;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Page Management</h1>
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setPage(0); }}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {t.label} <span className="ml-1 opacity-70">({t.count})</span>
          </button>
        ))}
      </div>
      <DataTable
        title={tabs.find(t => t.key === tab)!.label}
        columns={activeColumns}
        data={activeQuery.data}
        count={activeQuery.count}
        loading={activeQuery.loading}
        error={activeQuery.error}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onCreate={async fields => { await activeQuery.create(fields); }}
        onUpdate={async (id, fields) => { await activeQuery.update(id, fields); }}
        onDelete={async id => { await activeQuery.remove(id); }}
      />
    </div>
  );
}
