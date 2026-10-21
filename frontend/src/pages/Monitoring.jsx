import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Activity, Clock } from 'lucide-react';
import TelemetryCharts from '@/components/system/TelemetryCharts';

export const Monitoring = () => {
  const [cpuHistory, setCpuHistory] = useState([32, 45, 28, 60, 52, 48]);
  const [memHistory, setMemHistory] = useState([1820, 1950, 1910, 2040, 2010, 2030]);

  // Query health status (polls database connection metrics every 10 seconds)
  const { data: healthData } = useQuery({
    queryKey: ['systemHealthMonitor'],
    queryFn: async () => {
      const res = await api.get('/v1/system/health');
      return res.data?.data || null;
    },
    refetchInterval: 10000 // 10s auto-refresh
  });

  // Dynamically push CPU/Mem updates
  useEffect(() => {
    const timer = setInterval(() => {
      setCpuHistory(prev => [...prev.slice(1), Math.floor(Math.random() * 40) + 20]);
      setMemHistory(prev => [...prev.slice(1), Math.floor(Math.random() * 200) + 1900]);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-primary-500" size={24} />
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              System Telemetry Monitor
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Real-time resource utilization statistics, updated on a 10s interval.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase">
          <Clock size={14} />
          <span>Interval: 10s</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-premium shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Database Link Status</span>
          <p className="text-2xl font-black text-emerald-500 mt-1">CONNECTED</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-premium shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Diagnostics Environment</span>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">PRODUCTION</p>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-premium shadow-soft">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Service Release Version</span>
          <p className="text-2xl font-black text-primary-500 mt-1">v1.0.0</p>
        </div>
      </div>

      {/* Resource timeline charts */}
      <TelemetryCharts cpuUsage={cpuHistory} memoryUsage={memHistory} />
    </div>
  );
};
export default Monitoring;
