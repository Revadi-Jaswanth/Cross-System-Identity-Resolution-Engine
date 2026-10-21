import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/axios';
import { UserPlus, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const registerSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters long.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
  role: z.enum(['CITIZEN', 'INGEST_OPERATOR', 'ORG_ADMIN', 'AUDITOR'], {
    errorMap: () => ({ message: 'Please select a valid role.' })
  })
});

export const RegisterAccount = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      role: 'CITIZEN'
    }
  });

  const handleRegisterSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.post('/auth/public-register', {
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role
      });

      if (res.data?.success) {
        setSuccessMsg('Account created successfully! Redirecting to login...');
        localStorage.setItem('remembered_username', data.username);
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setError(res.data?.message || 'Failed to create account.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Connection error during account creation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 text-center">
          Create Account
        </h3>
        <p className="text-xs text-slate-400 text-center mt-1">
          New to VeriSync?
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-premium text-xs text-center font-semibold flex items-center justify-center gap-2">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-premium text-xs text-center font-semibold flex items-center justify-center gap-2">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(handleRegisterSubmit)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Username
          </label>
          <input
            type="text"
            {...register('username')}
            disabled={loading}
            className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
            placeholder="e.g. johndoe"
          />
          {errors.username && (
            <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Email Address
          </label>
          <input
            type="email"
            {...register('email')}
            disabled={loading}
            className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
            placeholder="e.g. john@gov.in"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Account Role (Super Admin Excluded)
          </label>
          <select
            {...register('role')}
            disabled={loading}
            className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 font-medium"
          >
            <option value="CITIZEN">Individual Citizen (Claim Credentials & My Profile)</option>
            <option value="INGEST_OPERATOR">Operator (Identity Ingestion & Work Queue)</option>
            <option value="ORG_ADMIN">Organization Admin (Departmental Operations)</option>
            <option value="AUDITOR">Auditor (Strict Read-Only Audit Access)</option>
          </select>
          {errors.role && (
            <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.role.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              disabled={loading}
              className="w-full p-2.5 pr-10 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-500"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-premium shadow-soft disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <UserPlus size={16} />
          <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
        </button>
      </form>

      <div className="text-center pt-2">
        <Link
          to="/login"
          className="text-xs text-primary-500 hover:text-primary-600 font-semibold hover:underline"
        >
          Already have an account? Sign In
        </Link>
      </div>
    </div>
  );
};

export default RegisterAccount;
