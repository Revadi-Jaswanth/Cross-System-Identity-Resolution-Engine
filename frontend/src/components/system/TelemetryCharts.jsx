import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const TelemetryCharts = ({ cpuUsage = [], memoryUsage = [] }) => {
  const labels = cpuUsage.map((_, i) => `${i * 10}s`);

  const cpuData = {
    labels,
    datasets: [
      {
        label: 'CPU Core Load (%)',
        data: cpuUsage,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  const memData = {
    labels,
    datasets: [
      {
        label: 'Memory Utilization (MB)',
        data: memoryUsage,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false }
    },
    scales: {
      y: { min: 0, max: 100 }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-premium shadow-soft">
        <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">CPU Usage Timeline</h4>
        <Line data={cpuData} options={options} />
      </div>

      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-premium shadow-soft">
        <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">Memory Consumption</h4>
        <Line data={memData} options={{ ...options, scales: { y: { min: 0, max: 4096 } } }} />
      </div>
    </div>
  );
};
export default TelemetryCharts;
