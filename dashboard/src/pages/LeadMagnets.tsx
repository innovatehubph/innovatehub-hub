import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const columns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'type', label: 'Type', type: 'select', options: ['ebook', 'guide', 'promo_code', 'consultation', 'video'] },
  { key: 'targetAudience', label: 'Audience', type: 'select', options: ['agent', 'customer', 'both'] },
  { key: 'promoCode', label: 'Promo Code', type: 'text' },
  { key: 'contentUrl', label: 'Content URL', type: 'text' },
  { key: 'deliveryMessage', label: 'Delivery Message', type: 'text' },
  { key: 'formId', label: 'FB Form ID', type: 'text' },
  { key: 'isActive', label: 'Active', type: 'boolean' },
  { key: 'downloadCount', label: 'Downloads', type: 'number', editable: false },
];

interface LeadMagnetsProps { businessId: string; }

export default function LeadMagnets({ businessId }: LeadMagnetsProps) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { data, count, loading, error, create, update, remove } = useParseQuery({
    className: 'LeadMagnet',
    businessId,
    limit: pageSize,
    skip: page * pageSize,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Lead Magnets</h1>
      <p className="text-slate-400 text-sm mb-6">
        Configure downloadable resources, promo codes, and guides that are automatically delivered to leads via Messenger. Link a lead magnet to a Facebook Lead Form ID to auto-deliver when a lead is captured.
      </p>
      <DataTable
        title="Lead Magnets"
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
        searchField="name"
        onSearch={() => {}}
      />
    </div>
  );
}
