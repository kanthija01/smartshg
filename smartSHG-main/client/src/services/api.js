import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token and active group ID
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartshg_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeGroupId = localStorage.getItem('smartshg_active_group_id');
    if (activeGroupId) {
      config.headers['x-group-id'] = activeGroupId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Friendly error formatting and 401 redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If token expired or unauthorized
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('smartshg_token');
        localStorage.removeItem('smartshg_user');
        window.location.href = '/login';
      }
    }

    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    const wrapped = new Error(message);
    wrapped.code = error.response?.data?.code;
    wrapped.status = error.response?.status;
    return Promise.reject(wrapped);
  }
);

export default api;
