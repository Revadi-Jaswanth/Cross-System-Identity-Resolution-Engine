import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePermissions } from '@/hooks/usePermissions';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Building2, Plus, Eye, Edit, Trash2, CheckCircle, XCircle, 
  Settings, RefreshCw, Download, Save
} from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import { SearchBar } from '@/components/common/SearchBar';
import { FilterPanel } from '@/components/common/FilterPanel';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { Drawer } from '@/components/common/Drawer';

const createOrgSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters.' }),
  code: z.string().min(2, { message: 'Code must be at least 2 characters.' })
});

const editOrgSchema = z.object({
  name: z.string().min(3, { message: 'Name must be at least 3 characters.' }),
  status: z.string()
});

export const Organizations = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSuperAdmin, canWriteUsers } = usePermissions();
  const { page, limit, setPage, nextPage, prevPage } = usePagination(1, 10);
  
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('');

  // Drawers and Modals
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', target: null });

  // Fetch Organizations
  const { data: orgsData, isLoading, refetch } = useQuery({
    queryKey: ['orgsList', page, limit, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: limit.toString(),
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/v1/organizations?${params.toString()}`);
      return res.data?.data || { organizations: [], metadata: {} };
    },
    enabled: isSuperAdmin // Scoped to Super Admin listing
  });

  // Mutators
  const createOrgMutation = useMutation({
    mutationFn: (data) => api.post('/v1/organizations', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['orgsList']);
      setCreateDrawerOpen(false);
    }
  });

  const updateOrgMutation = useMutation({
    mutationFn: ({ uuid, payload }) => api.put(`/v1/organizations/${uuid}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['orgsList']);
      setEditDrawerOpen(false);
    }
  });

  const deleteOrgMutation = useMutation({
    mutationFn: (uuid) => api.delete(`/v1/organizations/${uuid}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['orgsList']);
    }
  });

  // Form setups
  const { register: regCreate, handleSubmit: handleCreateSubmit, formState: { errors: createErrors }, reset: resetCreate } = useForm({
    resolver: zodResolver(createOrgSchema)
  });

  const { register: regEdit, handleSubmit: handleEditSubmit, formState: { errors: editErrors }, setValue: setEditValue } = useForm({
    resolver: zodResolver(editOrgSchema)
  });

  const handleOpenEdit = (org) => {
    setCurrentOrg(org);
    setEditValue('name', org.name);
    setEditValue('status', org.status);
    setEditDrawerOpen(true);
  };

  const handleConfirmAction = () => {
    const { type, target } = confirmModal;
    if (type === 'delete') {
      deleteOrgMutation.mutate(target.uuid);
    }
    setConfirmModal({ isOpen: false, type: '', target: null });
  };

  // CSV Export utility
  const handleExportCSV = () => {
    const list = orgsData?.organizations || [];
    if (list.length === 0) return;
    
    const headers = ['Name', 'Code', 'Status', 'Created Date'];
    const rows = list.map(o => [o.name, o.code, o.status, o.created_at]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Organizations_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { header: 'Organization Code', key: 'code' },
    { header: 'Organization Name', key: 'name' },
    { 
      header: 'Status', 
      key: 'status', 
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
          row.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
        }`}>
          {row.status}
        </span>
      )
    },
    { 
      header: 'Created Date', 
      key: 'created_at', 
      render: (row) => <span className="font-mono text-xs">{row.created_at?.slice(0, 10)}</span> 
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/organizations/${row.uuid}`)}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded transition-colors"
          >
            <Eye size={14} />
          </button>
          {canWriteUsers && (
            <>
              <button
                onClick={() => handleOpenEdit(row)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded transition-colors"
              >
                <Edit size={14} />
              </button>
              <button
                onClick={() => setConfirmModal({ isOpen: true, type: 'delete', target: row })}
                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  if (!isSuperAdmin) {
    return (
      <div className="p-6 text-center text-slate-500">
        <Building2 size={48} className="mx-auto mb-4 text-slate-400" />
        <h3 className="text-lg font-bold">Access Restrained</h3>
        <p className="text-sm max-w-sm mx-auto mt-2">
          Only Super Administrators hold access rights required to manage organizations globally.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Building2 className="text-primary-500" size={24} />
            <span>Tenant Organizations</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Manage organization accounts scoping tenant boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-premium text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => refetch()}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-premium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
          {canWriteUsers && (
            <button
              onClick={() => { resetCreate(); setCreateDrawerOpen(true); }}
              className="flex items-center gap-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-xs font-semibold shadow-soft transition-colors"
            >
              <Plus size={14} />
              <span>Create Organization</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters and search panel */}
      <FilterPanel onReset={() => { setSearch(''); setStatusFilter(''); }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search organization by name or code..." />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-slate-250 dark:border-slate-800 rounded-premium bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </FilterPanel>

      {/* Primary Data List */}
      <DataTable
        columns={columns}
        data={orgsData?.organizations || []}
        loading={isLoading}
        pagination={{
          page,
          limit,
          totalPages: orgsData?.metadata?.total_pages || 1,
          hasNext: orgsData?.metadata?.has_next,
          hasPrev: orgsData?.metadata?.has_prev,
          nextPage,
          prevPage
        }}
      />

      {/* Drawers */}
      <Drawer isOpen={createDrawerOpen} onClose={() => setCreateDrawerOpen(false)} title="Create Organization">
        <form onSubmit={handleCreateSubmit((data) => createOrgMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Organization Name *</label>
            <input type="text" {...regCreate('name')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" placeholder="e.g. Authority Root" />
            {createErrors.name && <p className="text-xs text-rose-500 mt-1 font-semibold">{createErrors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Organization Code *</label>
            <input type="text" {...regCreate('code')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" placeholder="e.g. NIA_ROOT" />
            {createErrors.code && <p className="text-xs text-rose-500 mt-1 font-semibold">{createErrors.code.message}</p>}
          </div>

          <button
            type="submit"
            disabled={createOrgMutation.isLoading}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-colors"
          >
            Create Organization
          </button>
        </form>
      </Drawer>

      <Drawer isOpen={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} title="Modify Organization Details">
        <form onSubmit={handleEditSubmit((data) => updateOrgMutation.mutate({ uuid: currentOrg.uuid, payload: { ...data, version: currentOrg.version } }))} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Organization Name *</label>
            <input type="text" {...regEdit('name')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" />
            {editErrors.name && <p className="text-xs text-rose-500 mt-1 font-semibold">{editErrors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Organization Status *</label>
            <select
              {...regEdit('status')}
              className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-slate-700"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            {editErrors.status && <p className="text-xs text-rose-500 mt-1 font-semibold">{editErrors.status.message}</p>}
          </div>

          <button
            type="submit"
            disabled={updateOrgMutation.isLoading}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-colors"
          >
            Save Details
          </button>
        </form>
      </Drawer>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: '', target: null })}
        onConfirm={handleConfirmAction}
        title="Confirm action triggers"
        message={`Are you sure you want to delete this organization record?`}
      />
    </div>
  );
};
export default Organizations;
