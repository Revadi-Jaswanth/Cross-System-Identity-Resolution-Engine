import React from 'react';
import { ChartCard } from '@/components/common/ChartCard';
import { Activity } from 'lucide-react';

export const Analytics = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col border-b border-slate-100 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
          Advanced Analytics
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          Deeper matching metrics and resolution accuracy charts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Fuzzy Matching Performance (ms)">
          <div className="flex flex-col items-center justify-center p-8 text-slate-400 text-sm">
            <Activity className="text-primary-500/20 mb-2" size={48} />
            <span>Fuzzy Strategy Execution Speed (last 7 days)</span>
          </div>
        </ChartCard>
        
        <ChartCard title="Weighted Scoring Distribution">
          <div className="flex flex-col items-center justify-center p-8 text-slate-400 text-sm">
            <Activity className="text-primary-500/20 mb-2" size={48} />
            <span>Resolution decisions ratio mapping</span>
          </div>
        </ChartCard>
      </div>
    </div>
  );
};
export default Analytics;
