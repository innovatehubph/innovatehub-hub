import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const columns: ColumnDef[] = [
  { key: 'fbOrderId', label: 'FB Order ID', type: 'text' },
  { key: 'items', label: 'Items', type: 'json' },
  { key: 'total', label: 'Total', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
  { key: 'channel', label: 'Channel', type: 'select', options: ['messenger', 'shop', 'manual'] },
  { key: 'createdAt', label: 'Date', type: 'date', editable: false },
];

interface OrdersProps { businessId: string; }

export default function Orders({ businessId }: OrdersProps) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { data, count, loading, error, create, update, remove } = useParseQuery({
    className: 'Order',
    businessId,
    limit: pageSize,
    skip: page * pageSize,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Orders</h1>
      <DataTable
        title="Orders"
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
