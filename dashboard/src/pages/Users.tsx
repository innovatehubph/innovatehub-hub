import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const columns: ColumnDef[] = [
  { key: 'role', label: 'Role', type: 'select', options: ['admin', 'manager', 'agent', 'viewer'] },
  { key: 'permissions', label: 'Permissions', type: 'json' },
  { key: 'createdAt', label: 'Added', type: 'date', editable: false },
];

interface UsersProps { businessId: string; }

export default function Users({ businessId }: UsersProps) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { data, count, loading, error, create, update, remove } = useParseQuery({
    className: 'BusinessUser',
    businessId,
    limit: pageSize,
    skip: page * pageSize,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Users & Roles</h1>
      <p className="text-slate-400 text-sm mb-6">Manage team members and their access roles for each business.</p>
      <DataTable
        title="Business Users"
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
