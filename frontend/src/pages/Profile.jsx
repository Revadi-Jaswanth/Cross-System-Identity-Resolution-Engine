import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { User, Shield, Building, Mail } from 'lucide-react';

export const Profile = () => {
  const { user, organization, permissions, roles } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
          My Account Profile
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          View your session authentication details.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6 max-w-xl">
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b pb-4">
            <div className="w-16 h-16 rounded-full bg-primary-600/10 text-primary-600 flex items-center justify-center font-bold text-xl uppercase">
              {user?.username?.slice(0, 2) || "UR"}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{user?.username || "Console Operator"}</h3>
              <span className="inline-block px-2.5 py-0.5 bg-primary-500/10 text-primary-500 rounded-full font-semibold text-[10px] uppercase">
                {roles?.[0] || "Operator"}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="text-slate-400 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Account Username</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-250">{user?.username}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="text-slate-400 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-250">{user?.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Building className="text-slate-400 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Organization Scope</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-250">
                  {organization ? `${organization.name} (${organization.code})` : 'NIA_ROOT (1)'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Shield className="text-slate-400 mt-0.5" size={18} />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">RBAC Permissions Count</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-250">{permissions?.length || 0} claims assigned</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Profile;
