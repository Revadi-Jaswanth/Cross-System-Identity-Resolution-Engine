import React from 'react';
import { NavLink } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  LayoutDashboard, Users, Building2, Fingerprint, GitPullRequest, 
  Settings, History, ShieldAlert, Award, FileText, BadgeCheck,
  FilePlus, Eye, Sparkles, User
} from 'lucide-react';

export const Sidebar = ({ isOpen, toggle }) => {
  const { isSuperAdmin, isOrgAdmin, isOperator, isAuditor, isCitizen } = usePermissions();

  let navItems = [];

  if (isCitizen) {
    navItems = [
      { label: 'Citizen Dashboard', path: '/citizen/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Claim Credentials', path: '/claim-credentials', icon: <BadgeCheck size={18} /> },
      { label: 'My Profile', path: '/profile', icon: <User size={18} /> }
    ];
  } else if (isAuditor) {
    navItems = [
      { label: 'Auditor Dashboard', path: '/auditor/dashboard', icon: <Eye size={18} /> },
      { label: 'Audit Logs', path: '/audit-logs', icon: <FileText size={18} /> },
      { label: 'Merge History', path: '/merge-history', icon: <History size={18} /> },
      { label: 'Resolution History', path: '/resolution/history', icon: <GitPullRequest size={18} /> },
      { label: 'Golden Profiles', path: '/clusters', icon: <Award size={18} /> }
    ];
  } else if (isOperator) {
    navItems = [
      { label: 'Operator Dashboard', path: '/operator/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Register Identity', path: '/identities/register', icon: <FilePlus size={18} /> },
      { label: 'Identities Database', path: '/identities', icon: <Fingerprint size={18} /> },
      { label: 'Resolution Workspace', path: '/resolution', icon: <GitPullRequest size={18} /> },
      { label: 'Verification Desk', path: '/verification', icon: <ShieldAlert size={18} /> }
    ];
  } else if (isOrgAdmin) {
    navItems = [
      { label: 'Org Dashboard', path: '/organization/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Department Identities', path: '/identities', icon: <Fingerprint size={18} /> },
      { label: 'Resolution Workspace', path: '/resolution', icon: <GitPullRequest size={18} /> },
      { label: 'Golden Profiles', path: '/clusters', icon: <Award size={18} /> },
      { label: 'Verification Desk', path: '/verification', icon: <ShieldAlert size={18} /> },
      { label: 'Organization Users', path: '/users', icon: <Users size={18} /> }
    ];
  } else {
    // Super Admin Default (NO Claim Credentials in Super Admin Nav)
    navItems = [
      { label: 'Admin Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
      { label: 'Identities Ingestion', path: '/identities', icon: <Fingerprint size={18} /> },
      { label: 'Identity Resolution', path: '/resolution', icon: <GitPullRequest size={18} /> },
      { label: 'Clusters', path: '/clusters', icon: <Award size={18} /> },
      { label: 'Merge History', path: '/merge-history', icon: <History size={18} /> },
      { label: 'Verification Desk', path: '/verification', icon: <ShieldAlert size={18} /> },
      { label: 'Organizations', path: '/organizations', icon: <Building2 size={18} /> },
      { label: 'System Users', path: '/users', icon: <Users size={18} /> },
      { label: 'Audit Logs', path: '/audit-logs', icon: <FileText size={18} /> },
      { label: 'System Settings', path: '/settings', icon: <Settings size={18} /> }
    ];
  }

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-slate-900 text-slate-300 w-64 z-30 transition-transform duration-200 border-r border-slate-800 transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="flex items-center h-16 px-6 border-b border-slate-800">
        <span className="text-base font-extrabold tracking-wider text-white uppercase flex items-center gap-2">
          <Fingerprint className="text-primary-500 animate-pulse" size={24} />
          <span>VeriSync</span>
        </span>
      </div>
      
      <nav className="p-4 flex flex-col gap-1 overflow-y-auto h-[calc(100%-4rem)]">
        {navItems.map((item, idx) => (
          <NavLink
            key={idx}
            to={item.path}
            end={item.path === '/identities' || item.path === '/'}
            onClick={toggle}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-premium text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary-600 text-white shadow-soft'
                  : 'hover:bg-slate-805 hover:text-slate-100'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
export default Sidebar;
