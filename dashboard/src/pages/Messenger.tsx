import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const contactColumns: ColumnDef[] = [
  { key: 'firstName', label: 'First Name', type: 'text' },
  { key: 'lastName', label: 'Last Name', type: 'text' },
  { key: 'psid', label: 'PSID', type: 'text' },
  { key: 'channel', label: 'Channel', type: 'text' },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'lastInteractionAt', label: 'Last Active', type: 'date' },
];

const conversationColumns: ColumnDef[] = [
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'pending', 'closed'] },
  { key: 'channel', label: 'Channel', type: 'text' },
  { key: 'lastMessageAt', label: 'Last Message', type: 'date' },
];

const messageColumns: ColumnDef[] = [
  { key: 'direction', label: 'Direction', type: 'select', options: ['inbound', 'outbound'] },
  { key: 'messageType', label: 'Type', type: 'text' },
  { key: 'content', label: 'Content', type: 'text' },
  { key: 'channel', label: 'Channel', type: 'text' },
  { key: 'createdAt', label: 'Date', type: 'date', editable: false },
];

interface MessengerProps { businessId: string; }

export default function Messenger({ businessId }: MessengerProps) {
  const [tab, setTab] = useState<'contacts' | 'conversations' | 'messages'>('contacts');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const contacts = useParseQuery({ className: 'MessengerContact', businessId, limit: pageSize, skip: page * pageSize });
  const conversations = useParseQuery({ className: 'Conversation', businessId, limit: pageSize, skip: page * pageSize, includes: ['contact'] });
  const messages = useParseQuery({ className: 'Message', businessId, limit: pageSize, skip: page * pageSize, orderBy: 'createdAt', orderDirection: 'desc' });

  const tabs = [
    { key: 'contacts' as const, label: 'Contacts', count: contacts.count },
    { key: 'conversations' as const, label: 'Conversations', count: conversations.count },
    { key: 'messages' as const, label: 'Messages', count: messages.count },
  ];

  const activeQuery = tab === 'contacts' ? contacts : tab === 'conversations' ? conversations : messages;
  const activeColumns = tab === 'contacts' ? contactColumns : tab === 'conversations' ? conversationColumns : messageColumns;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Messenger</h1>
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
