import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const campaignColumns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'fbCampaignId', label: 'FB Campaign ID', type: 'text' },
  { key: 'objective', label: 'Objective', type: 'select', options: ['AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'LEADS', 'APP_PROMOTION', 'SALES'] },
  { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'] },
  { key: 'budget', label: 'Budget', type: 'number' },
  { key: 'metrics', label: 'Metrics', type: 'json', editable: false },
];

const adSetColumns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'fbAdSetId', label: 'FB AdSet ID', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'PAUSED', 'DELETED'] },
  { key: 'targeting', label: 'Targeting', type: 'json' },
  { key: 'metrics', label: 'Metrics', type: 'json', editable: false },
];

const leadColumns: ColumnDef[] = [
  { key: 'fullName', label: 'Name', type: 'text', editable: false },
  { key: 'email', label: 'Email', type: 'text', editable: false },
  { key: 'phone', label: 'Phone', type: 'text', editable: false },
  { key: 'status', label: 'Status', type: 'select', options: ['new', 'contacted', 'qualified', 'converted', 'lost'] },
  { key: 'createdTime', label: 'Date', type: 'date', editable: false },
];

interface CampaignsProps { businessId: string; }

export default function Campaigns({ businessId }: CampaignsProps) {
  const [tab, setTab] = useState<'campaigns' | 'adsets' | 'leads'>('campaigns');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const campaigns = useParseQuery({ className: 'AdCampaign', businessId, limit: pageSize, skip: page * pageSize });
  const adSets = useParseQuery({ className: 'AdSet', businessId, limit: pageSize, skip: page * pageSize });
  const leads = useParseQuery({ className: 'FbLead', businessId, limit: pageSize, skip: page * pageSize });

  const tabs = [
    { key: 'campaigns' as const, label: 'Campaigns', count: campaigns.count },
    { key: 'adsets' as const, label: 'Ad Sets', count: adSets.count },
    { key: 'leads' as const, label: 'Leads', count: leads.count },
  ];

  const activeQuery = tab === 'campaigns' ? campaigns : tab === 'adsets' ? adSets : leads;
  const activeColumns = tab === 'campaigns' ? campaignColumns : tab === 'adsets' ? adSetColumns : leadColumns;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Ads & Campaigns</h1>
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
