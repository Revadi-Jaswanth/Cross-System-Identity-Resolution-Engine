import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/axios';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Lock, ArrowLeft } from 'lucide-react';

const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Reset token is required.' }),
  new_password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
  confirm_password: z.string()
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match.',
  path: ['confirm_password']
});

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: 'Weak', color: 'bg-rose-500' });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: searchParams.get('token') || '',
      new_password: '',
      confirm_password: ''
    }
  });

  const newPasswordValue = watch('new_password');

  // Dynamically calculate password strength metrics
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
      const res = await api.post('/auth/reset-password', {
        token: data.token,
        new_password: data.new_password
      });

      if (res.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Reset password failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-500 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Sign In</span>
        </Link>
      </div>

      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2 text-center">
        Reset Password
      </h3>
      <p className="text-xs text-slate-400 text-center mb-6">
        Enter your recovery token and new password values.
      </p>

      {success ? (
        <div className="space-y-4 text-center">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full mb-2">
            <CheckCircle size={24} />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Password reset successfully!
          </p>
          <p className="text-xs text-slate-400">
            Redirecting to sign in portal...
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
              Recovery Token
            </label>
            <input
              type="text"
              {...register('token')}
              disabled={loading}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
              placeholder="e.g. token_hash"
            />
            {errors.token && (
              <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.token.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
              New Password
            </label>
            <input
              type="password"
              {...register('new_password')}
              disabled={loading}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
              placeholder="Min 8 characters"
            />
            
            {/* Strength meter bar */}
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
              Confirm Password
            </label>
            <input
              type="password"
              {...register('confirm_password')}
              disabled={loading}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
              placeholder="Confirm new password"
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
            <span>{loading ? 'Processing...' : 'Confirm Reset'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
export default ResetPassword;
