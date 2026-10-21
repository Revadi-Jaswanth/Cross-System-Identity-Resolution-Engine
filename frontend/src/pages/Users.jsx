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
  Users as UsersIcon, Plus, Eye, Edit, Trash2, CheckCircle, XCircle, 
  Settings, RefreshCw, Download, Columns, Save
} from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import { SearchBar } from '@/components/common/SearchBar';
import { FilterPanel } from '@/components/common/FilterPanel';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import { Drawer } from '@/components/common/Drawer';

const createUserSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
  organization_id: z.number().min(1, { message: 'Organization is required.' }),
  roles: z.array(z.string()).min(1, { message: 'Select at least one role.' })
});

const editUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  status: z.string()
});

export const Users = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWriteUsers, isSuperAdmin } = usePermissions();
  const { page, limit, setPage, nextPage, prevPage } = usePagination(1, 10);
  
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  // Row Multi-selection
  const [selectedUuids, setSelectedUuids] = useState([]);
  
  // Columns Visibility
  const [visibleColumns, setVisibleColumns] = useState({
    username: true, email: true, role: true, status: true, created_at: true, actions: true
  });

  // Dialog Modals
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: '', target: null });

  // Fetch Users List
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['usersList', page, limit, debouncedSearch, statusFilter, roleFilter, orgFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: limit.toString(),
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);
      if (roleFilter) params.append('role', roleFilter);
      if (orgFilter) params.append('organization_id', orgFilter);

      const res = await api.get(`/v1/users?${params.toString()}`);
      return res.data?.data || { users: [], metadata: {} };
    }
  });

  // Fetch Organizations list for scoped dropdown mappings
  const { data: orgsData } = useQuery({
    queryKey: ['orgsListCompact'],
    queryFn: async () => {
      // Direct call fallback handles tenant limits implicitly on backend
      try {
        const res = await api.get('/v1/organizations?page_size=100');
        return res.data?.data?.organizations || [];
      } catch (e) {
        return [];
      }
    }
  });

  // Mutators
  const createUserMutation = useMutation({
    mutationFn: (data) => api.post('/v1/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['usersList']);
      setCreateDrawerOpen(false);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ uuid, payload }) => api.put(`/v1/users/${uuid}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['usersList']);
      setEditDrawerOpen(false);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (uuid) => api.delete(`/v1/users/${uuid}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['usersList']);
    }
  });

  const bulkStatusMutation = useMutation({
    mutationFn: (payload) => api.post('/v1/users/bulk-status', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['usersList']);
      setSelectedUuids([]);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (payload) => api.post('/v1/users/bulk-delete', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['usersList']);
      setSelectedUuids([]);
    }
  });

  // Form setups
  const { register: regCreate, handleSubmit: handleCreateSubmit, formState: { errors: createErrors }, reset: resetCreate } = useForm({
    resolver: zodResolver(createUserSchema)
  });

  const { register: regEdit, handleSubmit: handleEditSubmit, formState: { errors: editErrors }, setValue: setEditValue } = useForm({
    resolver: zodResolver(editUserSchema)
  });

  const handleOpenEdit = (user) => {
    setCurrentUser(user);
    setEditValue('email', user.email);
    setEditValue('status', user.status);
    setEditDrawerOpen(true);
  };

  const handleConfirmAction = () => {
    const { type, target } = confirmModal;
    if (type === 'delete') {
      deleteUserMutation.mutate(target.uuid);
    } else if (type === 'bulk-deactivate') {
      bulkStatusMutation.mutate({ uuids: selectedUuids, status: 'INACTIVE' });
    } else if (type === 'bulk-activate') {
      bulkStatusMutation.mutate({ uuids: selectedUuids, status: 'ACTIVE' });
    } else if (type === 'bulk-delete') {
      bulkDeleteMutation.mutate({ uuids: selectedUuids });
    }
    setConfirmModal({ isOpen: false, type: '', target: null });
  };

  // CSV Export utility
  const handleExportCSV = () => {
    const list = usersData?.users || [];
    if (list.length === 0) return;
    
    const headers = ['Username', 'Email', 'Status', 'Created Date'];
    const rows = list.map(u => [u.username, u.email, u.status, u.created_at]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Users_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Columns definition list
  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={selectedUuids.length === (usersData?.users?.length || 0) && selectedUuids.length > 0}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUuids(usersData?.users.map(u => u.uuid) || []);
            } else {
              setSelectedUuids([]);
            }
          }}
          className="rounded text-primary-600 focus:ring-primary-500"
        />
      ),
      key: 'checkbox',
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedUuids.includes(row.uuid)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedUuids(prev => [...prev, row.uuid]);
            } else {
              setSelectedUuids(prev => prev.filter(id => id !== row.uuid));
            }
          }}
          className="rounded text-primary-600 focus:ring-primary-500"
        />
      )
    },
    visibleColumns.username && { header: 'Username', key: 'username' },
    visibleColumns.email && { header: 'Email Address', key: 'email' },
    visibleColumns.role && { 
      header: 'Role Mappings', 
      key: 'roles', 
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.roles?.map((r, i) => (
            <span key={i} className="px-2 py-0.5 bg-primary-500/10 text-primary-500 rounded-full font-bold text-[9px] uppercase">
              {r}
            </span>
          ))}
        </div>
      )
    },
    visibleColumns.status && { 
      header: 'Status', 
      key: 'status', 
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
          row.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
        }`}>
          {row.status}
        </span>
      )
    },
    visibleColumns.created_at && { 
      header: 'Ingested At', 
      key: 'created_at', 
      render: (row) => <span className="font-mono text-xs">{row.created_at?.slice(0, 10)}</span> 
    },
    visibleColumns.actions && {
      header: 'Actions Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/users/${row.uuid}`)}
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
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <UsersIcon className="text-primary-500" size={24} />
            <span>Administrative Accounts</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Manage console operators and assign role credentials.
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
              <span>Register Operator</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Bulk controls panel */}
      <FilterPanel onReset={() => { setSearch(''); setStatusFilter(''); setRoleFilter(''); setOrgFilter(''); }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search user by name or email..." />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-slate-250 dark:border-slate-800 rounded-premium bg-white dark:bg-slate-900 text-xs text-slate-600 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="p-2 border border-slate-250 dark:border-slate-800 rounded-premium bg-white dark:bg-slate-900 text-xs text-slate-600 focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="Super Admin">Super Admin</option>
          <option value="Organization Admin">Organization Admin</option>
          <option value="Operator">Operator</option>
        </select>
      </FilterPanel>

      {/* Bulk Actions Bar */}
      {selectedUuids.length > 0 && (
        <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-premium flex items-center justify-between text-xs text-primary-600 font-semibold animate-slide-in">
          <span>{selectedUuids.length} operators selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setConfirmModal({ isOpen: true, type: 'bulk-activate', target: null })}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-[10px]"
            >
              Bulk Activate
            </button>
            <button
              onClick={() => setConfirmModal({ isOpen: true, type: 'bulk-deactivate', target: null })}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-[10px]"
            >
              Bulk Deactivate
            </button>
            <button
              onClick={() => setConfirmModal({ isOpen: true, type: 'bulk-delete', target: null })}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px]"
            >
              Bulk Delete
            </button>
          </div>
        </div>
      )}

      {/* Primary Data List */}
      <DataTable
        columns={columns}
        data={usersData?.users || []}
        loading={isLoading}
        pagination={{
          page,
          limit,
          totalPages: usersData?.metadata?.total_pages || 1,
          hasNext: usersData?.metadata?.has_next,
          hasPrev: usersData?.metadata?.has_prev,
          nextPage,
          prevPage
        }}
      />

      {/* Forms Drawers */}
      <Drawer isOpen={createDrawerOpen} onClose={() => setCreateDrawerOpen(false)} title="Register Operator">
        <form onSubmit={handleCreateSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Username *</label>
            <input type="text" {...regCreate('username')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" />
            {createErrors.username && <p className="text-xs text-rose-500 mt-1 font-semibold">{createErrors.username.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Email Address *</label>
            <input type="email" {...regCreate('email')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" />
            {createErrors.email && <p className="text-xs text-rose-500 mt-1 font-semibold">{createErrors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Password *</label>
            <input type="password" {...regCreate('password')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" />
            {createErrors.password && <p className="text-xs text-rose-500 mt-1 font-semibold">{createErrors.password.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Organization Scope *</label>
            <select
              {...regCreate('organization_id', { valueAsNumber: true })}
              className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-slate-700"
            >
              <option value="">Select scope</option>
              {orgsData?.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            {createErrors.organization_id && <p className="text-xs text-rose-500 mt-1 font-semibold">{createErrors.organization_id.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Role Assignment *</label>
            <select
              multiple
              {...regCreate('roles')}
              className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-slate-700 h-24"
            >
              <option value="Super Admin">Super Admin</option>
              <option value="Organization Admin">Organization Admin</option>
              <option value="Operator">Operator</option>
            </select>
            {createErrors.roles && <p className="text-xs text-rose-500 mt-1 font-semibold">{createErrors.roles.message}</p>}
          </div>

          <button
            type="submit"
            disabled={createUserMutation.isLoading}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-colors"
          >
            Submit Account
          </button>
        </form>
      </Drawer>

      <Drawer isOpen={editDrawerOpen} onClose={() => setEditDrawerOpen(false)} title="Modify Profile Details">
        <form onSubmit={handleEditSubmit((data) => updateUserMutation.mutate({ uuid: currentUser.uuid, payload: { ...data, version: currentUser.version } }))} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Email Address *</label>
            <input type="email" {...regEdit('email')} className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" />
            {editErrors.email && <p className="text-xs text-rose-500 mt-1 font-semibold">{editErrors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Account Status *</label>
            <select
              {...regEdit('status')}
              className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-slate-700"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="LOCKED">LOCKED</option>
            </select>
            {editErrors.status && <p className="text-xs text-rose-500 mt-1 font-semibold">{editErrors.status.message}</p>}
          </div>

          <button
            type="submit"
            disabled={updateUserMutation.isLoading}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-colors"
          >
            Save Profile Details
          </button>
        </form>
      </Drawer>

      {/* Confirmation triggers */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: '', target: null })}
        onConfirm={handleConfirmAction}
        title="Confirm action triggers"
        message={`Are you sure you want to perform the "${confirmModal.type}" operation?`}
      />
    </div>
  );
};
export default Users;
