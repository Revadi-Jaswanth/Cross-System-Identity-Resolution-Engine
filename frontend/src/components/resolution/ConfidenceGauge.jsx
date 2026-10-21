import React from 'react';

export const ConfidenceGauge = ({ value = 0 }) => {
  const percentage = Math.min(100, Math.max(0, value));
  
  // Calculate color mapping based on value (red to yellow to green HSL)
  const hue = (percentage * 1.2).toString(10);
  const colorStyle = { color: `hsl(${hue}, 80%, 45%)` };
  const borderStyle = { borderColor: `hsl(${hue}, 80%, 45%)` };

  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-10 h-10 rounded-full border-4 flex items-center justify-center font-bold text-xs shadow-soft bg-white dark:bg-slate-900"
        style={borderStyle}
      >
        <span style={colorStyle}>{percentage}%</span>
      </div>
      <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
        {percentage >= 85 ? (
          <span className="text-emerald-500">High Match</span>
        ) : percentage >= 50 ? (
          <span className="text-amber-500">Medium Match</span>
        ) : (
          <span className="text-rose-500">Low Match</span>
        )}
      </div>
    </div>
  );
};
export default ConfidenceGauge;
