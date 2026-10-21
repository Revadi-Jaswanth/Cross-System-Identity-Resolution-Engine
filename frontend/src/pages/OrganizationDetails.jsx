import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { ArrowLeft, Building2, ShieldAlert, Award, Fingerprint, Users as UsersIcon } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DataTable } from '@/components/common/DataTable';

export const OrganizationDetails = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();

  // Fetch Organization Details
  const { data: org, isLoading, error } = useQuery({
    queryKey: ['orgDetails', uuid],
    queryFn: async () => {
      const res = await api.get(`/v1/organizations/${uuid}`);
      return res.data?.data || null;
    }
  });

  // Fetch Users belonging to this Organization
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['orgUsersList', org?.id],
    queryFn: async () => {
      if (!org?.id) return [];
      const res = await api.get(`/v1/users?organization_id=${org.id}`);
      return res.data?.data?.users || [];
    },
    enabled: !!org?.id
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-2" />
        <span className="text-sm text-slate-500">Loading organization details...</span>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="text-center p-8 text-rose-500">
        <h3 className="text-lg font-bold">Failed to load organization details</h3>
        <p className="text-xs mt-1">Make sure organization exists or check permissions.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  const columns = [
    { header: 'Username', key: 'username' },
    { header: 'Email Address', key: 'email' },
    { 
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
    { 
      header: 'Status', 
      key: 'status', 
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${
          row.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Organization Scope Details
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            UUID: {org.uuid}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Profiles details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 border-b pb-2">
              Demographic Profile Attributes
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Organization Code</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{org.code}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Organization Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{org.name}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Account Status</span>
                <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                  org.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {org.status}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold uppercase text-slate-400">Created Date</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 text-xs">{org.created_at || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Registered operator lists */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <UsersIcon size={16} />
              <span>Registered Operators Mappings</span>
            </h3>
            <DataTable
              columns={columns}
              data={usersData || []}
              loading={usersLoading}
            />
          </div>
        </div>

        {/* Sidebar statistics profiles */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6 h-fit space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2 flex items-center gap-1.5">
            <Building2 size={14} />
            <span>Organization Telemetry</span>
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-semibold">Total Operators Count</span>
              <span className="font-bold text-slate-700 dark:text-slate-350">{usersData?.length || 0}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default OrganizationDetails;
