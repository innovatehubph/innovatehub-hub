import { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, GraduationCap, ClipboardCheck } from 'lucide-react';
import DataTable from '../components/DataTable';
import { useParseQuery } from '../hooks/useParseQuery';
import Parse from '../config/parse';
import StatCard from '../components/StatCard';
import type { ColumnDef } from '../types';

const PIPELINE_STAGES = ['inquiry', 'application', 'screening', 'training', 'onboarded', 'rejected'];

const columns: ColumnDef[] = [
  { key: 'fullName', label: 'Name', type: 'text', editable: false },
  { key: 'email', label: 'Email', type: 'text', editable: false },
  { key: 'phone', label: 'Phone', type: 'text', editable: false },
  { key: 'pipelineStage', label: 'Stage', type: 'select', options: PIPELINE_STAGES },
  { key: 'agentType', label: 'Agent Type', type: 'text' },
  { key: 'location', label: 'Location', type: 'text' },
  { key: 'assignedTo', label: 'Assigned To', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text' },
  { key: 'stageChangedAt', label: 'Stage Changed', type: 'date', editable: false },
  { key: 'createdAt', label: 'Created', type: 'date', editable: false },
];

interface AgentPipelineProps { businessId: string; }

export default function AgentPipeline({ businessId }: AgentPipelineProps) {
  const [page, setPage] = useState(0);
  const [stageFilter, setStageFilter] = useState('');
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const pageSize = 20;

  const filters: Record<string, any> = {};
  if (stageFilter) filters.pipelineStage = stageFilter;

  const { data, count, loading, error, create, update, remove } = useParseQuery({
    className: 'FbLead',
    businessId,
    limit: pageSize,
    skip: page * pageSize,
    filters,
  });

  // Fetch stage counts
  useEffect(() => {
    const fetchCounts = async () => {
      setLoadingCounts(true);
      try {
        const counts: Record<string, number> = {};
        await Promise.all(PIPELINE_STAGES.map(async stage => {
          const q = new Parse.Query('FbLead');
          if (businessId) {
            const bPtr = new Parse.Object('Business');
            bPtr.id = businessId;
            q.equalTo('business', bPtr);
          }
          q.equalTo('pipelineStage', stage);
          counts[stage] = await q.count({ useMasterKey: true });
        }));
        setStageCounts(counts);
      } catch (err) {
        console.error('Failed to fetch stage counts:', err);
      } finally {
        setLoadingCounts(false);
      }
    };
    fetchCounts();
  }, [businessId, data]);

  const stageIcons: Record<string, any> = {
    inquiry: Clock,
    application: ClipboardCheck,
    screening: Users,
    training: GraduationCap,
    onboarded: UserCheck,
    rejected: UserX,
  };

  const stageColors: Record<string, string> = {
    inquiry: 'blue',
    application: 'cyan',
    screening: 'yellow',
    training: 'purple',
    onboarded: 'green',
    rejected: 'red',
  };

  // Custom update that auto-sets stageChangedAt when pipelineStage changes
  const handleUpdate = async (id: string, fields: Record<string, any>) => {
    if (fields.pipelineStage) {
      const existing = data.find(d => d.objectId === id);
      if (existing && existing.pipelineStage !== fields.pipelineStage) {
        fields.stageChangedAt = new Date().toISOString();
      }
    }
    await update(id, fields);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-4">Agent Pipeline</h1>
      <p className="text-slate-400 text-sm mb-6">
        Track agent recruitment leads through the pipeline stages: inquiry → application → screening → training → onboarded.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {PIPELINE_STAGES.map(stage => (
          <button
            key={stage}
            onClick={() => setStageFilter(stageFilter === stage ? '' : stage)}
            className={`transition-all ${stageFilter === stage ? 'ring-2 ring-blue-500' : ''}`}
          >
            <StatCard
              title={stage.charAt(0).toUpperCase() + stage.slice(1)}
              value={stageCounts[stage] || 0}
              icon={stageIcons[stage] || Users}
              color={stageColors[stage] || 'blue'}
              loading={loadingCounts}
            />
          </button>
        ))}
      </div>

      {stageFilter && (
        <div className="mb-4">
          <span className="text-sm text-slate-400">
            Filtered by: <span className="text-blue-400 font-medium">{stageFilter}</span>
          </span>
          <button
            onClick={() => setStageFilter('')}
            className="text-sm text-slate-500 hover:text-white ml-2"
          >
            Clear
          </button>
        </div>
      )}

      <DataTable
        title="Agent Leads"
        columns={columns}
        data={data}
        count={count}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onCreate={async fields => { await create(fields); }}
        onUpdate={handleUpdate}
        onDelete={async id => { await remove(id); }}
        searchField="fullName"
        onSearch={() => {}}
      />
    </div>
  );
}
