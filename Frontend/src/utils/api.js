import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('[api] defaults', {
  baseURL: api.defaults.baseURL,
  withCredentials: api.defaults.withCredentials,
  headers: api.defaults.headers,
});

// Response interceptor for handling 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Redirect to login on unauthorized
      // Don't redirect if on login or join pages (public routes)
      const publicPaths = ['/login', '/join'];
      const isPublicPath = publicPaths.some(path => window.location.pathname.startsWith(path));
      if (!isPublicPath) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
