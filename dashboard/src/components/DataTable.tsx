import { useState } from 'react';
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';
import type { ColumnDef } from '../types';

interface DataTableProps {
  title: string;
  columns: ColumnDef[];
  data: any[];
  count: number;
  loading: boolean;
  error: string | null;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onCreate: (fields: Record<string, any>) => Promise<void>;
  onUpdate: (id: string, fields: Record<string, any>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  searchField?: string;
  onSearch?: (term: string) => void;
}

export default function DataTable({
  title, columns, data, count, loading, error,
  page, pageSize, onPageChange,
  onCreate, onUpdate, onDelete,
  searchField, onSearch
}: DataTableProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const totalPages = Math.ceil(count / pageSize);

  const openCreate = () => {
    setEditId(null);
    setFormData({});
    setModalOpen(true);
  };

  const openEdit = (row: any) => {
    setEditId(row.objectId);
    const fields: Record<string, any> = {};
    columns.filter(c => c.editable !== false).forEach(col => {
      const val = row[col.key];
      if (col.type === 'pointer' && val) {
        fields[col.key] = val.objectId || val;
      } else if (col.type === 'json' || col.type === 'tags') {
        fields[col.key] = typeof val === 'object' ? JSON.stringify(val, null, 2) : (val || '');
      } else {
        fields[col.key] = val ?? '';
      }
    });
    setFormData(fields);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const processed: Record<string, any> = {};
      columns.filter(c => c.editable !== false).forEach(col => {
        let val = formData[col.key];
        if (val === undefined || val === '') return;
        if (col.type === 'number') val = Number(val);
        if (col.type === 'boolean') val = val === 'true' || val === true;
        if (col.type === 'json' || col.type === 'tags') {
          try { val = JSON.parse(val); } catch { /* keep string */ }
        }
        processed[col.key] = val;
      });

      if (editId) {
        await onUpdate(editId, processed);
      } else {
        await onCreate(processed);
      }
      setModalOpen(false);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      setDeleteConfirm(null);
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const renderCellValue = (col: ColumnDef, value: any) => {
    if (value === null || value === undefined) return <span className="text-slate-600">--</span>;
    if (col.render) return col.render(value, {});
    if (col.type === 'date') return new Date(value).toLocaleDateString();
    if (col.type === 'boolean') return value ? <span className="text-emerald-400">Yes</span> : <span className="text-red-400">No</span>;
    if (col.type === 'masked') return '****' + String(value).slice(-4);
    if (col.type === 'json' || col.type === 'tags') {
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return <span className="font-mono text-xs">{str.length > 50 ? str.slice(0, 50) + '...' : str}</span>;
    }
    if (col.type === 'pointer' && typeof value === 'object') return value.objectId || JSON.stringify(value);
    const str = String(value);
    return str.length > 60 ? str.slice(0, 60) + '...' : str;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <div className="flex items-center gap-3">
          {searchField && onSearch && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); onSearch(e.target.value); }}
                className="bg-slate-800 border border-slate-600 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
          )}
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm transition-colors">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm">{error}</div>}

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                {columns.map(col => (
                  <th key={col.key} className="text-left px-4 py-3 text-slate-400 font-medium">{col.label}</th>
                ))}
                <th className="text-right px-4 py-3 text-slate-400 font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-500">
                  <Loader2 className="animate-spin inline mr-2" size={16} />Loading...
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="px-4 py-8 text-center text-slate-500">No records found</td></tr>
              ) : (
                data.map(row => (
                  <tr key={row.objectId} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    {columns.map(col => (
                      <td key={col.key} className="px-4 py-3 text-slate-300">{renderCellValue(col, row[col.key])}</td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(row)} className="p-1.5 rounded hover:bg-slate-600 text-slate-400 hover:text-white" title="Edit">
                          <Pencil size={14} />
                        </button>
                        {deleteConfirm === row.objectId ? (
                          <button onClick={() => handleDelete(row.objectId)} className="px-2 py-1 rounded bg-red-600 text-white text-xs">Confirm</button>
                        ) : (
                          <button onClick={() => setDeleteConfirm(row.objectId)} className="p-1.5 rounded hover:bg-red-600/20 text-slate-400 hover:text-red-400" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700">
            <span className="text-sm text-slate-500">{count} total records</span>
            <div className="flex items-center gap-2">
              <button onClick={() => onPageChange(page - 1)} disabled={page === 0} className="p-1 rounded hover:bg-slate-700 text-slate-400 disabled:opacity-30">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-slate-400">Page {page + 1} of {totalPages}</span>
              <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} className="p-1 rounded hover:bg-slate-700 text-slate-400 disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">{editId ? 'Edit Record' : 'Add Record'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-slate-700 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-4">
              {columns.filter(c => c.editable !== false).map(col => (
                <div key={col.key}>
                  <label className="block text-sm text-slate-400 mb-1">{col.label}</label>
                  {col.type === 'select' ? (
                    <select
                      value={formData[col.key] || ''}
                      onChange={e => setFormData(p => ({ ...p, [col.key]: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      {col.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : col.type === 'boolean' ? (
                    <select
                      value={String(formData[col.key] ?? '')}
                      onChange={e => setFormData(p => ({ ...p, [col.key]: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select...</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (col.type === 'json' || col.type === 'tags') ? (
                    <textarea
                      value={formData[col.key] || ''}
                      onChange={e => setFormData(p => ({ ...p, [col.key]: e.target.value }))}
                      rows={4}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type={col.type === 'number' ? 'number' : 'text'}
                      value={formData[col.key] || ''}
                      onChange={e => setFormData(p => ({ ...p, [col.key]: e.target.value }))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={col.label}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50">
                {saving && <Loader2 className="animate-spin" size={14} />}
                {editId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
