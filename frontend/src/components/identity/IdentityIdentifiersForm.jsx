import React from 'react';

export const IdentityIdentifiersForm = ({ register, errors }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b pb-2 mb-4">
        Government Identifiers & Contact Details
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Aadhaar (12 digits)</label>
          <input
            type="text"
            {...register('aadhaar')}
            className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
            placeholder="e.g. 123456789012"
          />
          {errors.aadhaar && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.aadhaar.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">ABHA ID</label>
          <input
            type="text"
            {...register('abha')}
            className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
            placeholder="e.g. ABHA-10292"
          />
          {errors.abha && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.abha.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">DigiLocker ID</label>
          <input
            type="text"
            {...register('digilocker')}
            className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
            placeholder="e.g. DL-99120"
          />
          {errors.digilocker && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.digilocker.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Mobile Number</label>
          <input
            type="text"
            {...register('mobile')}
            className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
            placeholder="e.g. +919999999999"
          />
          {errors.mobile && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.mobile.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Email Address</label>
          <input
            type="email"
            {...register('email')}
            className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
            placeholder="e.g. operator@resolution.gov.in"
          />
          {errors.email && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.email.message}</p>}
        </div>
      </div>
    </div>
  );
};
export default IdentityIdentifiersForm;
