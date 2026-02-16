import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const columns: ColumnDef[] = [
  { key: 'platform', label: 'Platform', type: 'select', options: ['facebook', 'instagram', 'messenger'] },
  { key: 'tokenType', label: 'Token Type', type: 'select', options: ['short_lived', 'long_lived', 'never_expiring'] },
  { key: 'accessToken', label: 'Access Token', type: 'masked' },
  { key: 'expiresAt', label: 'Expires At', type: 'date' },
  { key: 'refreshedAt', label: 'Last Refreshed', type: 'date', editable: false },
];

interface TokenStoreProps { businessId: string; }

export default function TokenStore({ businessId }: TokenStoreProps) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const { data, count, loading, error, create, update, remove } = useParseQuery({
    className: 'TokenStore',
    businessId,
    limit: pageSize,
    skip: page * pageSize,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Token Store</h1>
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3 rounded-lg mb-6 text-sm">
        Tokens are displayed masked for security. Click Edit to view/update the full token value.
      </div>
      <DataTable
        title="Access Tokens"
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
