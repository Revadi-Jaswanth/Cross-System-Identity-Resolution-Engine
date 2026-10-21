import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Injects access token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handles refreshes using queuing lock to prevent duplication
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check for expired access token
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request and wait for token refresh to complete
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(async (resolve, reject) => {
        try {
          // Trigger session refresh (reads cookie from browser context)
          const refreshRes = await axios.post('/api/auth/refresh');
          const newAccessToken = refreshRes.data?.data?.access_token;
          
          if (newAccessToken) {
            localStorage.setItem('access_token', newAccessToken);
            api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            
            processQueue(null, newAccessToken);
            resolve(api(originalRequest));
          } else {
            throw new Error("Invalid token refresh payload.");
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('access_token');
          window.location.href = '/login?session_expired=true';
          reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      });
    }
    
    // Standardize error formats matching backend responses
    const apiError = {
      status: error.response?.status || 500,
      code: error.response?.data?.error?.code || 'SERVER_ERROR',
      message: error.response?.data?.message || error.message || 'An unexpected error occurred.',
      details: error.response?.data?.error?.message || null
    };
    
    return Promise.reject(apiError);
  }
);

export default api;
