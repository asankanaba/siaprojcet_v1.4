// ============================================
// 📁 File: src/api/index.js
// 🔌 Axios instances — Local + Deployed backend
// ============================================
import axios from 'axios';

// ============================================
// API CONFIGURATION
// ============================================
// Local:  http://localhost/smart-pos-api/api
// Prod:   https://smartpossiaaaa.kesug.com/smart-pos-api/api
// Both are controlled via .env (VITE_API_BASE_URL, VITE_API_BASE_URL2)

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost/smart-pos-api/api')
  .replace(/\/$/, '');

const API_BASE_URL2 = (import.meta.env.VITE_API_BASE_URL2 || 'https://smartpossiaaaa.kesug.com/smart-pos-api/api')
  .replace(/\/$/, '');

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
};

// Primary instance (local / currently active base)
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: COMMON_HEADERS,
  timeout: 30000
});

// Secondary instance (deployed backend)
const api2 = axios.create({
  baseURL: API_BASE_URL2,
  headers: COMMON_HEADERS,
  timeout: 30000
});

// ============================================
// REQUEST INTERCEPTOR — attach Bearer JWT
// ============================================
const attachToken = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Only log in local dev, NOT when running via `npm run dev` on your own machine
// AND not when VITE_API_BASE_URL is a remote URL
const isLocalDev = import.meta.env.DEV && 
  (config.baseURL?.includes('localhost') || config.baseURL?.includes('127.0.0.1'));

if (isLocalDev && import.meta.env.VITE_VERBOSE_API === 'true') {
  console.log(`📤 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || '');
}
  return config;
};

const onRequestError = (error) => {
  console.error('❌ Request error:', error);
  return Promise.reject(error);
};

api.interceptors.request.use(attachToken, onRequestError);
api2.interceptors.request.use(attachToken, onRequestError);

// ============================================
// RESPONSE INTERCEPTOR — global error handling
// ============================================
const handleSuccess = (response) => {
  if (import.meta.env.DEV) {
    console.log(`📥 ${response.config.url}`, response.data);
  }
  return response;
};

const handleError = (error) => {
  const { response, request } = error;

  if (response) {
    const status = response.status;
    const message = response.data?.message || response.statusText || 'Server error';

    console.error(`❌ API ${status}:`, message);

    switch (status) {
      case 401: {
        console.warn('🔒 Unauthorized — clearing session and redirecting to /login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        break;
      }
      case 403:
        console.warn('🚫 Forbidden');
        break;
      case 404:
        console.warn('🔍 Not found');
        break;
      case 422:
        console.warn('📝 Validation error:', response.data?.errors);
        break;
      case 500:
        console.error('💥 Server error');
        break;
      default:
        console.error(`⚠️ API error (${status}):`, message);
    }
  } else if (request) {
    console.error('🌐 No response from server. Backend may be down:', API_BASE_URL);
  } else {
    console.error('❌ Request setup error:', error.message);
  }

  return Promise.reject(error);
};

api.interceptors.response.use(handleSuccess, handleError);
api2.interceptors.response.use(handleSuccess, handleError);

// ============================================
// HELPER METHODS (short-hand)
// ============================================
export const get   = (url, config = {}) => api.get(url, config);
export const post  = (url, data = {}, config = {}) => api.post(url, data, config);
export const put   = (url, data = {}, config = {}) => api.put(url, data, config);
export const patch = (url, data = {}, config = {}) => api.patch(url, data, config);
export const del   = (url, config = {}) => api.delete(url, config);

// ============================================
// EXPORTS
// ============================================
export default api;
export {
  api,
  api2,
  API_BASE_URL,
  API_BASE_URL2
};