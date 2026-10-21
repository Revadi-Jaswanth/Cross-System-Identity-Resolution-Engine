import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Menu, Sun, Moon, LogOut, User as UserIcon, Lock, Settings } from 'lucide-react';
import LogoutModal from '@/components/common/LogoutModal';
import Breadcrumbs from '@/components/layout/Breadcrumbs';

export const Navbar = ({ toggleSidebar }) => {
  const { user, organization, roles, logout } = useAuth();
  const { isDark, toggleTheme } = useDarkMode();
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleLogoutConfirm = () => {
    logout();
    setLogoutModalOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-20 transition-all">
        <div className="flex items-center justify-between h-full px-6">
          {/* Left corner: Toggle mobile sidebar + Breadcrumbs timeline */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
            >
              <Menu size={20} />
            </button>
            <Breadcrumbs />
          </div>

          <div className="grow" />

          <div className="flex items-center gap-4">
            {/* Light/Dark mode toggler */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 transition-colors"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* User profile dropdown menu */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-600/10 text-primary-600 flex items-center justify-center font-bold text-sm uppercase">
                  {user?.username?.slice(0, 2) || "UR"}
                </div>
                <span className="hidden sm:inline text-sm font-semibold pr-1">
                  {user?.username || "Operator"}
                </span>
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-premium py-1 z-20 animate-fade-in">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase font-semibold">User Details</p>
                      <p className="text-sm font-bold truncate text-slate-700 dark:text-slate-300">
                        {user?.username}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                      {organization && (
                        <p className="text-xs font-semibold text-slate-500 mt-1">
                          Org: {organization.name}
                        </p>
                      )}
                      <span className="inline-block mt-1 px-2 py-0.5 bg-primary-500/10 text-primary-500 rounded-full font-semibold text-[10px] uppercase">
                        {typeof roles?.[0] === 'object' ? (roles[0].name || roles[0].code || 'Operator') : (roles?.[0] || 'Operator')}
                      </span>
                    </div>

                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 flex items-center gap-2 transition-colors"
                    >
                      <UserIcon size={16} />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      to="/change-password"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 dark:text-slate-400 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 flex items-center gap-2 transition-colors"
                    >
                      <Lock size={16} />
                      <span>Change Password</span>
                    </Link>

                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setLogoutModalOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 border-t border-slate-100 dark:border-slate-800 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/10 flex items-center gap-2 transition-colors"
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <LogoutModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
};
export default Navbar;
