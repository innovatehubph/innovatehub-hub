import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const columns: ColumnDef[] = [
  { key: 'source', label: 'Source', type: 'text', editable: false },
  { key: 'eventType', label: 'Event Type', type: 'text', editable: false },
  { key: 'status', label: 'Status', type: 'select', options: ['received', 'processed', 'error'] },
  { key: 'payload', label: 'Payload', type: 'json', editable: false },
  { key: 'processedAt', label: 'Processed At', type: 'date', editable: false },
  { key: 'createdAt', label: 'Received', type: 'date', editable: false },
];

interface WebhookLogsProps { businessId: string; }

export default function WebhookLogs({ businessId }: WebhookLogsProps) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { data, count, loading, error, create, update, remove } = useParseQuery({
    className: 'WebhookLog',
    businessId,
    limit: pageSize,
    skip: page * pageSize,
    orderBy: 'createdAt',
    orderDirection: 'desc',
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Webhook Logs</h1>
      <p className="text-slate-400 text-sm mb-6">All incoming webhook events from Facebook. Logs older than 30 days are automatically cleaned up.</p>
      <DataTable
        title="Webhook Events"
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
