import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const columns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'channel', label: 'Channel', type: 'select', options: ['messenger', 'instagram', 'all'] },
  { key: 'triggerKeywords', label: 'Triggers', type: 'tags' },
  { key: 'isActive', label: 'Active', type: 'boolean' },
  { key: 'steps', label: 'Steps', type: 'json' },
];

interface BotFlowsProps { businessId: string; }

export default function BotFlows({ businessId }: BotFlowsProps) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { data, count, loading, error, create, update, remove } = useParseQuery({
    className: 'BotFlow',
    businessId,
    limit: pageSize,
    skip: page * pageSize,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Bot Flows</h1>
      <p className="text-slate-400 text-sm mb-6">Manage automated chatbot conversation flows. Steps use JSON format: [{`{"type":"text","content":"..."}`}, {`{"type":"quick_replies","content":"...","quickReplies":[...]}`}]</p>
      <DataTable
        title="Bot Flows"
        columns={columns}
        data={data}
        count={count}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onCreate={async fields => { await create(fields); }}
        onUpdate={async (id, fields) => { await update(id, fields); }}
        onDelete={async id => { await remove(id); }}
      />
    </div>
  );
}
