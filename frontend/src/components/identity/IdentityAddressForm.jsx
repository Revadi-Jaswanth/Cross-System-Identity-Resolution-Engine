import React from 'react';

export const IdentityAddressForm = ({ register, errors }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b pb-2 mb-4">
        Residential Address Info
      </h3>
      
      <div>
        <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Street Address</label>
        <input
          type="text"
          {...register('address')}
          className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
          placeholder="e.g. 123 Main Road"
        />
        {errors.address && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.address.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">City</label>
          <input
            type="text"
            {...register('city')}
            className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
            placeholder="e.g. New Delhi"
          />
          {errors.city && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.city.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">State</label>
          <input
            type="text"
            {...register('state')}
            className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
            placeholder="e.g. Delhi"
          />
          {errors.state && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.state.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Postal Code</label>
          <input
            type="text"
            {...register('postal_code')}
            className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
            placeholder="e.g. 110001"
          />
          {errors.postal_code && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.postal_code.message}</p>}
        </div>
      </div>
    </div>
  );
};
export default IdentityAddressForm;
