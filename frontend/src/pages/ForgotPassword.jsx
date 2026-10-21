import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/axios';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' })
});

export const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [debugToken, setDebugToken] = useState('');
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema)
  });

  const handleFormSubmit = async (data) => {
    setLoading(true);
    setError('');
    setDebugToken('');

    try {
      const res = await api.post('/auth/forgot-password', { email: data.email });
      if (res.data?.success) {
        setSuccess(true);
        // Expose debug reset token for development context if returned
        if (res.data?.data?.debug_token) {
          setDebugToken(res.data.data.debug_token);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to submit recovery request.');
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
        Recover Password
      </h3>
      <p className="text-xs text-slate-400 text-center mb-6">
        Enter your registered email address to receive a recovery token.
      </p>

      {success ? (
        <div className="space-y-4 text-center">
          <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full mb-2">
            <CheckCircle size={24} />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Recovery instructions submitted!
          </p>
          <p className="text-xs text-slate-400">
            If the email exists, you will receive a reset token shortly.
          </p>
          
          {debugToken && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-premium text-xs font-mono break-all text-left">
              <span className="font-bold block mb-1">Development Reset Token:</span>
              {debugToken}
              <Link
                to={`/reset-password?token=${debugToken}`}
                className="block mt-2 text-center text-xs font-bold text-primary-500 hover:underline"
              >
                Go to Reset Form
              </Link>
            </div>
          )}
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
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              disabled={loading}
              className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
              placeholder="operator@resolution.gov.in"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-premium shadow-soft disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Mail size={16} />
            <span>{loading ? 'Submitting...' : 'Send Recovery Token'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
export default ForgotPassword;
