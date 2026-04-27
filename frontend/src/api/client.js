import axios from 'axios';

const api = axios.create({
  // This matches your backend Network IP
  baseURL: 'http://192.168.1.4:5000/api', 
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('attender_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (!err.response) {
      return Promise.reject(new Error('Cannot reach API. Ensure backend is running at 192.168.1.4:5000'));
    }
    const msg = err.response.data?.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

export default api;