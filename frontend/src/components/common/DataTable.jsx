import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const DataTable = ({
  columns,
  data = [],
  loading = false,
  pagination = null, // { page, limit, totalRecords, totalPages, hasNext, hasPrev, setPage, nextPage, prevPage }
  emptyTitle = "No records matching filters",
  emptyDesc = "Try adjusting your query or filters."
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[250px]">
        <LoadingSpinner size="lg" className="mb-2" />
        <span className="text-sm font-medium text-slate-500">Querying database...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDesc} />;
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {columns.map((col, idx) => (
                <th key={idx} className="p-4">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm text-slate-700 dark:text-slate-300">
            {data.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="p-4">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls bar */}
      {pagination && (
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
          <div>
            Showing page <span className="font-semibold text-slate-700 dark:text-slate-300">{pagination.page}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{pagination.totalPages || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={pagination.prevPage}
              disabled={!pagination.hasPrev && pagination.page <= 1}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => pagination.nextPage(pagination.totalPages)}
              disabled={!pagination.hasNext && pagination.page >= (pagination.totalPages || 1)}
              className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
