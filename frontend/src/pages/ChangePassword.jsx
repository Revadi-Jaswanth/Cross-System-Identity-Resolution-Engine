import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/axios';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, ArrowLeft } from 'lucide-react';

const changePasswordSchema = z.object({
  old_password: z.string().min(1, { message: 'Old password is required.' }),
  new_password: z.string().min(8, { message: 'New password must be at least 8 characters long.' }),
  confirm_password: z.string()
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match.',
  path: ['confirm_password']
});

export const ChangePassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Weak', color: 'bg-rose-500' });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(changePasswordSchema)
  });

  const newPasswordValue = watch('new_password');

  // Strength check
  useEffect(() => {
    if (!newPasswordValue) {
      setPasswordStrength({ score: 0, label: 'Weak', color: 'bg-rose-500' });
      return;
    }

    let score = 0;
    if (newPasswordValue.length >= 8) score++;
    if (newPasswordValue.length >= 12) score++;
    if (/[a-z]/.test(newPasswordValue) && /[A-Z]/.test(newPasswordValue)) score++;
    if (/[0-9]/.test(newPasswordValue)) score++;
    if (/[^a-zA-Z0-9]/.test(newPasswordValue)) score++;

    let label = 'Weak';
    let color = 'bg-rose-500';
    if (score >= 4) {
      label = 'Strong';
      color = 'bg-emerald-500';
    } else if (score >= 2) {
      label = 'Medium';
      color = 'bg-amber-500';
    }

    setPasswordStrength({ score, label, color });
  }, [newPasswordValue]);

  const handleFormSubmit = async (data) => {
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/auth/change-password', {
        old_password: data.old_password,
        new_password: data.new_password
      });

      if (res.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Change password failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Change Password
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Update your account password properties.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6 max-w-md">
        {success ? (
          <div className="space-y-4 text-center py-6 animate-fade-in">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full mb-2">
              <CheckCircle size={24} />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Password changed successfully!
            </p>
            <p className="text-xs text-slate-400">
              Returning to portal dashboard...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-premium text-xs text-center font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Old Password *
              </label>
              <input
                type="password"
                {...register('old_password')}
                disabled={loading}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
                placeholder="Current password"
              />
              {errors.old_password && (
                <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.old_password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                New Password *
              </label>
              <input
                type="password"
                {...register('new_password')}
                disabled={loading}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
                placeholder="Min 8 characters"
              />
              {newPasswordValue && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase">
                    <span>Strength: {passwordStrength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {errors.new_password && (
                <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.new_password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                {...register('confirm_password')}
                disabled={loading}
                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
                placeholder="Confirm password"
              />
              {errors.confirm_password && (
                <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.confirm_password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-premium shadow-soft disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Lock size={16} />
              <span>{loading ? 'Updating...' : 'Update Password'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
export default ChangePassword;
