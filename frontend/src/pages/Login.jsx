import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, Key, ShieldAlert, UserCheck } from 'lucide-react';

const loginSchema = z.object({
  username: z.string().min(3, { message: 'Username must be at least 3 characters long.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
  rememberMe: z.boolean().optional()
});

export const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const usernameRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: localStorage.getItem('remembered_username') || '',
      password: '',
      rememberMe: !!localStorage.getItem('remembered_username')
    }
  });

  const handleKeyDown = (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLockActive(true);
    } else {
      setCapsLockActive(false);
    }
  };

  const redirectByRole = (userObj) => {
    const targetUser = userObj || user;
    const userRoles = (targetUser?.roles || []).map(r => typeof r === 'string' ? r.toUpperCase() : (r?.name ? r.name.toUpperCase() : ''));
    
    if (userRoles.some(r => r.includes('SUPER_ADMIN') || r.includes('SUPER ADMIN'))) {
      navigate('/admin/dashboard', { replace: true });
    } else if (userRoles.some(r => r.includes('ORG_ADMIN') || r.includes('ORGANIZATION'))) {
      navigate('/organization/dashboard', { replace: true });
    } else if (userRoles.some(r => r.includes('OPERATOR') || r.includes('INGEST_OPERATOR'))) {
      navigate('/operator/dashboard', { replace: true });
    } else if (userRoles.some(r => r.includes('AUDITOR'))) {
      navigate('/auditor/dashboard', { replace: true });
    } else if (userRoles.some(r => r.includes('CITIZEN'))) {
      navigate('/citizen/dashboard', { replace: true });
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleFormSubmit = async (data) => {
    setLoading(true);
    setError('');

    const res = await login(data.username, data.password, data.rememberMe);
    if (res.success) {
      if (location.state?.from?.pathname && location.state.from.pathname !== '/login') {
        navigate(location.state.from.pathname, { replace: true });
      } else {
        redirectByRole(res.user);
      }
    } else {
      setError(res.message || 'Invalid username or password.');
      setLoading(false);
    }
  };

  // Quick fill demo helper
  const handleQuickFill = (uname, pass) => {
    setValue('username', uname);
    setValue('password', pass);
  };

  useEffect(() => {
    if (usernameRef.current) {
      usernameRef.current.focus();
    }
  }, []);

  return (
    <div className="w-full space-y-6">
      <div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 text-center">
          Sign In to Portal
        </h3>
        <p className="text-xs text-slate-400 text-center mt-1">
          VeriSync
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-premium text-xs text-center font-semibold flex items-center justify-center gap-2">
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {capsLockActive && (
        <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-premium text-xs text-center font-semibold">
          Warning: Caps Lock is ON
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label 
            htmlFor="username"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            {...register('username')}
            disabled={loading}
            aria-invalid={errors.username ? 'true' : 'false'}
            className="w-full p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:border-primary-500"
            placeholder="e.g. superadmin"
            autoFocus
          />
          {errors.username && (
            <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.username.message}</p>
          )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label 
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-xs text-primary-500 hover:text-primary-600 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              disabled={loading}
              onKeyDown={handleKeyDown}
              aria-invalid={errors.password ? 'true' : 'false'}
              className="w-full p-2.5 pr-10 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-premium text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:border-primary-500"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-500 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-rose-500 font-semibold">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="rememberMe"
              type="checkbox"
              {...register('rememberMe')}
              className="h-4 w-4 text-primary-600 border-slate-350 rounded-md focus:ring-primary-500"
            />
            <label htmlFor="rememberMe" className="ml-2 block text-xs text-slate-500 dark:text-slate-400 font-semibold">
              Remember Me
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-premium shadow-soft disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Key size={16} />
          <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
        </button>

        <div className="text-center pt-2">
          <Link
            to="/register"
            className="text-xs text-primary-500 hover:text-primary-600 font-semibold hover:underline"
          >
            New to VeriSync? Create Account
          </Link>
        </div>
      </form>

      {/* Demo Credentials Switcher Panel */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
        <span className="text-slate-400 font-semibold uppercase tracking-wider block text-[10px] text-center">
          Demo Presentation Role Selector
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono">
          <button
            type="button"
            onClick={() => handleQuickFill('superadmin', 'SecurePass123!')}
            className="p-1.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold text-center"
          >
            Super Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('orgadmin', 'SecurePass123!')}
            className="p-1.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold text-center"
          >
            Org Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('operator', 'SecurePass123!')}
            className="p-1.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold text-center"
          >
            Operator
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('auditor', 'SecurePass123!')}
            className="p-1.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold text-center"
          >
            Auditor
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('citizen', 'SecurePass123!')}
            className="p-1.5 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded text-[11px] font-semibold text-center col-span-2 sm:col-span-2"
          >
            Citizen
          </button>
        </div>
      </div>
    </div>
  );
};
export default Login;
