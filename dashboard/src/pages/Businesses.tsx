import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const columns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'slug', label: 'Slug', type: 'text' },
  { key: 'fbPageId', label: 'FB Page ID', type: 'text' },
  { key: 'igAccountId', label: 'IG Account ID', type: 'text' },
  { key: 'fbCatalogId', label: 'Catalog ID', type: 'text' },
  { key: 'isActive', label: 'Active', type: 'boolean' },
];

export default function Businesses() {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { data, count, loading, error, create, update, remove } = useParseQuery({
    className: 'Business',
    limit: pageSize,
    skip: page * pageSize,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Businesses</h1>
      <DataTable
        title="Business Records"
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
