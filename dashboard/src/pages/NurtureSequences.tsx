import { useState } from 'react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import type { ColumnDef } from '../types';

const sequenceColumns: ColumnDef[] = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'targetAudience', label: 'Audience', type: 'select', options: ['agent', 'customer', 'both'] },
  { key: 'triggerEvent', label: 'Trigger', type: 'select', options: ['new_lead', 'lead_magnet_delivered', 'manual'] },
  { key: 'channel', label: 'Channel', type: 'select', options: ['messenger', 'instagram', 'all'] },
  { key: 'isActive', label: 'Active', type: 'boolean' },
  { key: 'steps', label: 'Steps (JSON)', type: 'json' },
];

const enrollmentColumns: ColumnDef[] = [
  { key: 'lead', label: 'Lead', type: 'pointer', pointerClass: 'FbLead', editable: false },
  { key: 'sequence', label: 'Sequence', type: 'pointer', pointerClass: 'NurtureSequence', editable: false },
  { key: 'currentStep', label: 'Step', type: 'number', editable: false },
  { key: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'completed', 'cancelled'] },
  { key: 'enrolledAt', label: 'Enrolled', type: 'date', editable: false },
  { key: 'nextSendAt', label: 'Next Send', type: 'date', editable: false },
  { key: 'lastSentAt', label: 'Last Sent', type: 'date', editable: false },
];

interface NurtureSequencesProps { businessId: string; }

export default function NurtureSequences({ businessId }: NurtureSequencesProps) {
  const [tab, setTab] = useState<'sequences' | 'enrollments'>('sequences');
  const [seqPage, setSeqPage] = useState(0);
  const [enrollPage, setEnrollPage] = useState(0);
  const pageSize = 20;

  const sequences = useParseQuery({
    className: 'NurtureSequence',
    businessId,
    limit: pageSize,
    skip: seqPage * pageSize,
  });

  const enrollments = useParseQuery({
    className: 'NurtureEnrollment',
    businessId,
    limit: pageSize,
    skip: enrollPage * pageSize,
    includes: ['lead', 'sequence', 'contact'],
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Nurture Sequences</h1>
      <p className="text-slate-400 text-sm mb-6">
        Multi-step automated follow-up sequences delivered via Messenger. Steps use JSON: [{'{'}stepNumber, delayDays, delayHours, messageType, content, buttons, quickReplies{'}'}]
      </p>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('sequences')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            tab === 'sequences' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          Sequences
        </button>
        <button
          onClick={() => setTab('enrollments')}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            tab === 'enrollments' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          Enrollments ({enrollments.count})
        </button>
      </div>

      {tab === 'sequences' ? (
        <DataTable
          title="Sequences"
          columns={sequenceColumns}
          data={sequences.data}
          count={sequences.count}
          loading={sequences.loading}
          error={sequences.error}
          page={seqPage}
          pageSize={pageSize}
          onPageChange={setSeqPage}
          onCreate={async fields => { await sequences.create(fields); }}
          onUpdate={async (id, fields) => { await sequences.update(id, fields); }}
          onDelete={async id => { await sequences.remove(id); }}
        />
      ) : (
        <DataTable
          title="Enrollments"
          columns={enrollmentColumns}
          data={enrollments.data}
          count={enrollments.count}
          loading={enrollments.loading}
          error={enrollments.error}
          page={enrollPage}
          pageSize={pageSize}
          onPageChange={setEnrollPage}
          onCreate={async fields => { await enrollments.create(fields); }}
          onUpdate={async (id, fields) => { await enrollments.update(id, fields); }}
          onDelete={async id => { await enrollments.remove(id); }}
        />
      )}
    </div>
  );
}
