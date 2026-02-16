import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const columns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'price', label: 'Price', type: 'number' },
  { key: 'currency', label: 'Currency', type: 'select', options: ['PHP', 'USD'] },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'inStock', label: 'In Stock', type: 'boolean' },
  { key: 'syncStatus', label: 'Sync Status', type: 'select', options: ['pending', 'synced', 'error'] },
  { key: 'fbProductId', label: 'FB Product ID', type: 'text', editable: false },
  { key: 'lastSyncedAt', label: 'Last Synced', type: 'date', editable: false },
];

interface ProductsProps { businessId: string; }

export default function Products({ businessId }: ProductsProps) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { data, count, loading, error, create, update, remove } = useParseQuery({
    className: 'Product',
    businessId,
    limit: pageSize,
    skip: page * pageSize,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Products</h1>
      <p className="text-slate-400 text-sm mb-6">Manage your product catalog. Products with syncStatus "pending" will be synced to Facebook Catalog automatically.</p>
      <DataTable
        title="Product Catalog"
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
