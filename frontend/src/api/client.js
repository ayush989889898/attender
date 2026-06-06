import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('attender_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (!err.response) {
      return Promise.reject(
        new Error(`Cannot reach API. Ensure backend is running at ${API_BASE_URL}`)
      );
    }
    const endpoint = err.config?.url || 'unknown endpoint';
    const status = err.response.status;
    const serverMessage = err.response.data?.message;
    const msg = serverMessage || `Request failed (${status}) on ${endpoint}`;
    return Promise.reject(new Error(msg));
  }
);

export default api;