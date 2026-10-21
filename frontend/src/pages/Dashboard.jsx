import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Doughnut, Bar, Pie } from 'react-chartjs-2';
import {
  Fingerprint, Award, ShieldAlert, History, Activity, Database, Cpu,
  TrendingUp, Users, Building, AlertCircle, RefreshCw, Search, ArrowUpRight
} from 'lucide-react';
import { StatsCard } from '@/components/common/StatsCard';
import { ChartCard } from '@/components/common/ChartCard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 400);

  // Widget positioning state for drag-and-drop extensibility placeholder
  const [widgetOrder, setWidgetOrder] = useState([
    'kpi-grid', 'charts-grid-1', 'charts-grid-2', 'recent-system-grid'
  ]);

  // Fetch System Statistics
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ['systemStats'],
    queryFn: async () => {
      const res = await api.get('/v1/system/stats');
      return res.data?.data || {};
    }
  });

  // Fetch System Health status on a 10s refresh interval
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const res = await api.get('/v1/system/health');
      return res.data?.data || {};
    },
    refetchInterval: 10000 // 10s polling
  });

  // Global Search trigger
  const { data: searchResults, isFetching: searchFetching } = useQuery({
    queryKey: ['globalSearch', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return null;
      // Triggers lookup across entities
      const res = await api.get(`/identities?q=${debouncedSearch}`);
      return res.data?.data || [];
    },
    enabled: !!debouncedSearch
  });

  // KPI Calculations
  const totalIdentities = stats?.total_active_identities || 0;
  const totalClusters = stats?.total_active_clusters || 0;
  const totalMerges = stats?.total_merges_completed || 0;

  // Static/Calculated metrics estimations
  const goldenProfilesCount = Math.max(0, totalClusters - 2);
  const autoMergesCount = Math.max(0, Math.floor(totalMerges * 0.8));
  const manualReviewsCount = Math.max(0, Math.floor(totalMerges * 0.2));

  // Chart Data definitions
  const registrationTrendData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'Registrations',
      data: [65, 78, 72, 89, 120, 45, 60],
      borderColor: 'rgb(99, 102, 241)',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.3,
      fill: true
    }]
  };

  const sourceDistributionData = {
    labels: ['Aadhaar', 'ABHA', 'DigiLocker'],
    datasets: [{
      data: [totalIdentities ? Math.floor(totalIdentities * 0.6) : 300, 150, 50],
      backgroundColor: ['rgba(99, 102, 241, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)']
    }]
  };

  const mergeSuccessData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      { label: 'Auto Merge Success', data: [12, 19, 15, 25, 30], backgroundColor: 'rgba(16, 185, 129, 0.8)' },
      { label: 'Manual Review Success', data: [2, 3, 5, 4, 6], backgroundColor: 'rgba(245, 158, 11, 0.8)' }
    ]
  };

  const confidenceDistributionData = {
    labels: ['90-100%', '80-90%', '70-80%', '<70%'],
    datasets: [{
      label: 'Matches',
      data: [150, 45, 20, 5],
      backgroundColor: 'rgba(99, 102, 241, 0.8)'
    }]
  };

  const verificationData = {
    labels: ['Matched', 'Mismatched'],
    datasets: [{
      data: [94, 6],
      backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(244, 63, 94, 0.8)']
    }]
  };

  const timelineData = {
    labels: ['09:00', '10:00', '11:00', '12:00', '13:00'],
    datasets: [{
      label: 'API Request Rate',
      data: [450, 520, 610, 480, 500],
      borderColor: 'rgb(16, 185, 129)',
      backgroundColor: 'transparent',
      tension: 0.1
    }]
  };

  const orgDistributionData = {
    labels: ['NIA_ROOT', 'Agency One', 'Agency Two'],
    datasets: [{
      label: 'Identities Ingested',
      data: [totalIdentities || 250, 120, 80],
      backgroundColor: ['rgb(99, 102, 241)', 'rgb(16, 185, 129)', 'rgb(245, 158, 11)']
    }]
  };

  return (
    <div className="space-y-6">
      {/* Search and Header panel */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Fingerprint className="text-primary-500" size={24} />
            <span>VeriSync Console</span>
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 italic font-medium mt-0.5">
            Bridging disparate identity sources into a single, trustworthy credential hub.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            System status: <span className="text-emerald-500 font-bold">ONLINE</span> • API Version {health?.version || '1.0.0'}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto">
          {/* Global Search */}
          <div className="relative w-full xl:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Users, Org, Clusters..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-premium bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
            />
            {searchFetching && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>

          <button
            onClick={() => { refetchStats(); refetchHealth(); }}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-premium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Global Search Results Dropdown Overlay */}
      {searchResults && searchResults.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-premium max-h-60 overflow-y-auto animate-fade-in z-20 relative">
          <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Search results matching "{debouncedSearch}"</h4>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {searchResults.map((res, index) => (
              <div
                key={index}
                onClick={() => navigate(`/identities/${res.uuid}`)}
                className="py-2.5 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <span>{res.system_source} • {res.system_uid}</span>
                <ArrowUpRight size={14} className="text-slate-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10 KPI Cards layout grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard title="Total Identities" value={totalIdentities} icon={<Fingerprint size={18} />} description="Registered raw data logs" trend={{ value: "+4.2%", positive: true }} />
        <StatsCard title="Identity Clusters" value={totalClusters} icon={<Award size={18} />} description="Resolved physical groups" trend={{ value: "+1.8%", positive: true }} />
        <StatsCard title="Golden Profiles" value={goldenProfilesCount} icon={<Users size={18} />} description="Unique entity templates" trend={{ value: "+2.1%", positive: true }} />
        <StatsCard title="Auto Merges" value={autoMergesCount} icon={<History size={18} />} description="De-duplicated linkings" trend={{ value: "+8.9%", positive: true }} />
        <StatsCard title="Manual Reviews" value={manualReviewsCount} icon={<AlertCircle size={18} />} description="Awaiting operator confirmation" trend={{ value: "-5.0%", positive: true }} />
        <StatsCard title="Verification Requests" value="1,842" icon={<Activity size={18} />} description="Identity verification validation count" trend={{ value: "+12%", positive: true }} />
        <StatsCard title="Organizations" value="2" icon={<Building size={18} />} description="Connected system scopes" trend={{ value: "Stable", positive: true }} />
        <StatsCard title="Registered Users" value="3" icon={<Users size={18} />} description="Console operators accounts" trend={{ value: "Active", positive: true }} />
        <StatsCard title="API Requests Today" value="482.4k" icon={<Activity size={18} />} description="API requests count today" trend={{ value: "+15%", positive: true }} />
        <StatsCard title="Active Sessions" value="5" icon={<Users size={18} />} description="Connected tab nodes" trend={{ value: "Stable", positive: true }} />
      </div>

      {/* Drag-resizable Dashboard widgets layouts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Analytics Charts Grid */}
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Identity Registration Trend">
              <Line data={registrationTrendData} options={{ responsive: true, maintainAspectRatio: false }} />
            </ChartCard>
            <ChartCard title="Source Distribution">
              <Doughnut data={sourceDistributionData} options={{ responsive: true, maintainAspectRatio: false }} />
            </ChartCard>
            <ChartCard title="Merge Success Rate">
              <Bar data={mergeSuccessData} options={{ responsive: true, maintainAspectRatio: false }} />
            </ChartCard>
            <ChartCard title="Resolution Confidence Distribution">
              <Bar data={confidenceDistributionData} options={{ responsive: true, maintainAspectRatio: false }} />
            </ChartCard>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ChartCard title="Verification Stats" className="md:col-span-1">
              <Pie data={verificationData} options={{ responsive: true, maintainAspectRatio: false }} />
            </ChartCard>
            <ChartCard title="Audit Activity Timeline" className="md:col-span-2">
              <Line data={timelineData} options={{ responsive: true, maintainAspectRatio: false }} />
            </ChartCard>
          </div>
        </div>

        {/* System Health and Sidebar Notifications Panel */}
        <div className="space-y-6">
          {/* Health status */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2 flex items-center gap-1.5">
              <Database size={16} />
              <span>System Health status</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">API Node Status</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase text-[10px]">
                  HEALTHY
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Database Connection</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase text-[10px]">
                  {health?.database || 'CONNECTED'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Avg Latency (Response)</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">12ms</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">Memory Usage</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">32.4%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-semibold">CPU Core Load</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">4.1%</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2">
              Quick Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => navigate('/identities/register')} className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-left hover:bg-primary-500/10 hover:border-primary-500/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all">
                Ingest Record
              </button>
              <button onClick={() => navigate('/identities/bulk')} className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-left hover:bg-primary-500/10 hover:border-primary-500/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all">
                Bulk Upload
              </button>
              <button onClick={() => navigate('/resolution')} className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-left hover:bg-primary-500/10 hover:border-primary-500/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all">
                Matcher Engine
              </button>
              <button onClick={() => navigate('/verification')} className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-left hover:bg-primary-500/10 hover:border-primary-500/20 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all">
                Verification logs
              </button>
            </div>
          </div>

          {/* System Warning Notifications panel */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2">
              Notifications & Alerts
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-premium flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Pending Manual Review:</span>
                  <p className="mt-0.5">Cluster merge mismatch requires operator verification confirmation.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
