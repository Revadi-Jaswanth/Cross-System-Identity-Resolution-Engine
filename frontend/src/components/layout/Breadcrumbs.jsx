import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export const Breadcrumbs = ({ className = '' }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  return (
    <nav className={`flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium ${className}`}>
      <Link
        to="/"
        className="hover:text-primary-500 flex items-center gap-1 transition-colors"
      >
        <Home size={14} />
        <span>Home</span>
      </Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const formattedName = value.replace(/-/g, ' ');

        return (
          <React.Fragment key={to}>
            <ChevronRight size={12} className="text-slate-300 dark:text-slate-700" />
            {isLast ? (
              <span className="font-semibold text-slate-600 dark:text-slate-300 capitalize">
                {formattedName}
              </span>
            ) : (
              <Link to={to} className="hover:text-primary-500 transition-colors capitalize">
                {formattedName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
export default Breadcrumbs;
