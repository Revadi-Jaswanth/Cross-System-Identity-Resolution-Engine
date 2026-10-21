import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/axios';

export const AuthContext = createContext(null);

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_TIMEOUT_MS = 14 * 60 * 1000; // 14 minutes (1 minute warning)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('access_token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('access_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Expose properties
  const roles = user?.roles || [];
  const permissions = user?.permissions || [];
  const organization = user?.organization || null;

  // Local token decoder
  const decodeToken = (tokenStr) => {
    try {
      const base64Url = tokenStr.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const logout = useCallback(async (isAuto = false) => {
    try {
      if (token) {
        await api.post('/auth/logout', {});
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('access_token');
      // Set storage key to trigger synchronization across tabs
      localStorage.setItem('auth_logout_trigger', Date.now().toString());
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setShowIdleWarning(false);
      clearInterval(countdownIntervalRef.current);

      if (isAuto) {
        window.location.href = '/login?session_expired=true';
      }
    }
  }, [token]);

  const refresh = useCallback(async () => {
    try {
      const res = await api.post('/auth/refresh');
      const newAccessToken = res.data?.data?.access_token;
      if (newAccessToken) {
        localStorage.setItem('access_token', newAccessToken);
        setToken(newAccessToken);
        setIsAuthenticated(true);
        const decoded = decodeToken(newAccessToken);
        setUser(decoded?.user || {
          username: decoded?.sub || 'User',
          roles: decoded?.roles || [],
          permissions: decoded?.permissions || [],
          organization: decoded?.organization || null
        });
        return newAccessToken;
      }
    } catch (e) {
      logout(true);
    }
    return null;
  }, [logout]);

  const login = useCallback(async (username, password, rememberMe = false) => {
    setIsLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      const { success, data } = response.data;
      
      if (success && data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('auth_login_trigger', Date.now().toString());
        
        if (rememberMe) {
          localStorage.setItem('remembered_username', username);
        } else {
          localStorage.removeItem('remembered_username');
        }

        setToken(data.access_token);
        setIsAuthenticated(true);
        setUser(data.user);
        
        resetIdleTimers();
        return { success: true, user: data.user };
      }
      return { success: false, message: response.data.message || 'Login failed.' };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Connection failed.' 
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback((profileData) => {
    setUser(prev => prev ? { ...prev, ...profileData } : null);
  }, []);

  const hasRole = useCallback((rolesToCheck) => {
    if (!user) return false;
    const arrayRoles = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];
    const userRoleNames = (roles || []).map(r => typeof r === 'string' ? r : r.name);
    
    return userRoleNames.some(uRole => {
      const uUpper = uRole.toUpperCase().replace(/\s+/g, '_');
      return arrayRoles.some(reqRole => {
        const reqUpper = reqRole.toUpperCase().replace(/\s+/g, '_');
        if (uRole === reqRole || uUpper === reqUpper) return true;
        if (uUpper === 'SUPER_ADMIN' && reqUpper === 'SUPER_ADMIN') return true;
        if (uUpper === 'ORG_ADMIN' && reqUpper === 'ORGANIZATION_ADMIN') return true;
        if (reqUpper === 'ORG_ADMIN' && uUpper === 'ORGANIZATION_ADMIN') return true;
        if ((uUpper === 'INGEST_OPERATOR' || uUpper === 'OPERATOR') && (reqUpper === 'OPERATOR' || reqUpper === 'INGEST_OPERATOR')) return true;
        if (uUpper === 'AUDITOR' && reqUpper === 'AUDITOR') return true;
        if ((uUpper === 'CITIZEN' || uUpper === 'INDIVIDUAL_CITIZEN') && (reqUpper === 'CITIZEN' || reqUpper === 'INDIVIDUAL_CITIZEN')) return true;
        return false;
      });
    });
  }, [user, roles]);

  const hasPermission = useCallback((permsToCheck) => {
    if (!user) return false;
    let arrayPerms = Array.isArray(permsToCheck) ? permsToCheck : [permsToCheck];
    arrayPerms = arrayPerms.map(p => {
      if (p === 'identity:read') return 'identity:resolve';
      if (p === 'identity:write') return 'identity:ingest';
      return p;
    });
    return permissions.some(perm => arrayPerms.includes(perm));
  }, [user, permissions]);

  // Session Timeout logic
  const handleIdleTimeout = useCallback(() => {
    logout(true);
  }, [logout]);

  const handleIdleWarning = useCallback(() => {
    setShowIdleWarning(true);
    setCountdown(60);
    
    // Start warning countdown
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          handleIdleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [handleIdleTimeout]);

  const resetIdleTimers = useCallback(() => {
    if (!isAuthenticated) return;
    
    // Clear warning warning triggers
    setShowIdleWarning(false);
    clearInterval(countdownIntervalRef.current);

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    // Set warnings
    warningTimerRef.current = setTimeout(handleIdleWarning, WARNING_TIMEOUT_MS);
    idleTimerRef.current = setTimeout(handleIdleTimeout, IDLE_TIMEOUT_MS);
  }, [isAuthenticated, handleIdleWarning, handleIdleTimeout]);

  const keepSessionActive = () => {
    resetIdleTimers();
    refresh();
  };

  // Activity listeners
  useEffect(() => {
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll'];
    const handleActivity = () => {
      if (!showIdleWarning) {
        resetIdleTimers();
      }
    };

    if (isAuthenticated) {
      activityEvents.forEach(evt => window.addEventListener(evt, handleActivity));
      resetIdleTimers();
    }

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      clearInterval(countdownIntervalRef.current);
    };
  }, [isAuthenticated, showIdleWarning, resetIdleTimers]);

  // Tab synchronization synchronization listener
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'auth_logout_trigger') {
        // Logged out on another tab -> sync logout logout
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        window.location.href = '/login?session_expired=true';
      } else if (e.key === 'auth_login_trigger') {
        // Logged in on another tab -> reload token
        const savedToken = localStorage.getItem('access_token');
        if (savedToken) {
          setToken(savedToken);
          setIsAuthenticated(true);
          const decoded = decodeToken(savedToken);
          setUser(decoded?.user || {
            username: decoded?.sub || 'User',
            roles: decoded?.roles || [],
            permissions: decoded?.permissions || [],
            organization: decoded?.organization || null
          });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Decode decoded token on mount to load initial state
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('access_token');
      if (savedToken) {
        const decoded = decodeToken(savedToken);
        if (decoded?.exp && decoded.exp * 1000 < Date.now()) {
          logout(true);
        } else {
          setUser(decoded?.user || {
            username: decoded?.sub || 'User',
            roles: decoded?.roles || [],
            permissions: decoded?.permissions || [],
            organization: decoded?.organization || null
          });
          setIsAuthenticated(true);

          try {
            const res = await api.get('/auth/me');
            if (res?.data?.success && res?.data?.data) {
              setUser(res.data.data);
            }
          } catch (e) {
            console.error('Failed to sync auth user profile details:', e);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [logout]);

  const value = {
    user,
    organization,
    permissions,
    roles,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refresh,
    hasRole,
    hasPermission,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}

      {/* Expiry Alert warning modal */}
      {showIdleWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-premium p-6 text-center animate-fade-in">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
              Session Expiry Warning
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              You have been idle for a while. You will be automatically logged out in{' '}
              <span className="font-bold text-primary-500">{countdown}s</span>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => logout(false)}
                className="w-full py-2 border border-slate-200 dark:border-slate-800 rounded-premium text-sm font-semibold text-slate-500 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                Log Out Now
              </button>
              <button
                onClick={keepSessionActive}
                className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-colors"
              >
                Keep Active
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};
export default AuthProvider;
