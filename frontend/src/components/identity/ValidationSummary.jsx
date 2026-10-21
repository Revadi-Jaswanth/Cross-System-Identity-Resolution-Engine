import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const ValidationSummary = ({ errors }) => {
  const errorKeys = Object.keys(errors);
  if (errorKeys.length === 0) return null;

  return (
    <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-premium text-rose-600 space-y-2 animate-slide-in">
      <div className="flex items-center gap-2 font-bold text-sm">
        <AlertTriangle size={16} />
        <span>Please resolve the following registration errors:</span>
      </div>
      <ul className="list-disc pl-5 text-xs font-medium space-y-1">
        {errorKeys.map((key) => (
          <li key={key}>{errors[key]?.message}</li>
        ))}
      </ul>
    </div>
  );
};
export default ValidationSummary;
