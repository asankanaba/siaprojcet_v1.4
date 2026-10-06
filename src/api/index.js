// ============================================
// 📁 File: src/api/index.js
// 🔌 Axios — direct calls with form-urlencoded POSTs
// ============================================
// ⚠️ WHY FORM-ENCODED:
// InfinityFree's CDN challenges JSON POSTs and CORS preflights.
// Sending application/x-www-form-urlencoded avoids both:
//   - Browsers don't send preflight for urlencoded content-type
//   - InfinityFree's CDN doesn't inject its anti-bot challenge
// PHP reads it via $_POST or via parse_str() on php://input.
// ============================================
import axios from 'axios';

const IS_DEV = import.meta.env.DEV;

const LOCAL_API_URL = 'http://192.168.12.3/smart-pos-api/api';
const PROD_API_URL  = 'https://smartpossiaaaa.kesug.com/smart-pos-api/api';

const API_BASE_URL  = IS_DEV
  ? (import.meta.env.VITE_API_BASE_URL  || LOCAL_API_URL).replace(/\/$/, '')
  : PROD_API_URL;

const API_BASE_URL2 = IS_DEV
  ? (import.meta.env.VITE_API_BASE_URL2 || LOCAL_API_URL).replace(/\/$/, '')
  : PROD_API_URL;

console.log('🔌 API Base URL :', API_BASE_URL);
console.log('🔌 API Base URL2:', API_BASE_URL2);

// Only "simple" headers — no Content-Type, no Authorization
// (they trigger CORS preflight which InfinityFree blocks)
const COMMON_HEADERS = {
  'Accept': 'application/json'
};

const api  = axios.create({ baseURL: API_BASE_URL,  headers: COMMON_HEADERS, timeout: 30000 });
const api2 = axios.create({ baseURL: API_BASE_URL2, headers: COMMON_HEADERS, timeout: 30000 });

// ============================================
// REQUEST INTERCEPTOR — form-encode + token in body
// ============================================
// ⚠️ The JWT is sent in the POST body as `token`, NOT in the
// Authorization header. Why: any custom header triggers CORS
// preflight, which InfinityFree blocks. Sending the token in
// the body keeps everything "simple request" compliant.

const prepareRequest = (config) => {
  const method = (config.method || 'get').toLowerCase();
  const isWrite = ['post', 'put', 'patch', 'delete'].includes(method);

  // For write requests, convert body to urlencoded and inject token
  if (isWrite) {
    const isPlainObject =
      config.data &&
      Object.prototype.toString.call(config.data) === '[object Object]';

    const params = new URLSearchParams();

    if (isPlainObject) {
      for (const [k, v] of Object.entries(config.data)) {
        if (v === undefined || v === null) continue;
        if (typeof v === 'object') {
          params.append(k, JSON.stringify(v));
        } else {
          params.append(k, v);
        }
      }
    }

    // Put JWT in the body — avoids Authorization header preflight
    const token = localStorage.getItem('token');
    if (token) {
      params.append('token', token);
    }

    config.data = params.toString();
    config.headers = config.headers || {};
    config.headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
  } else {
    // For GET requests, send token as a query param (also preflight-free)
    const token = localStorage.getItem('token');
    if (token) {
      config.params = config.params || {};
      config.params.token = token;
    }
  }

  return config;
};

const onRequestError = (error) => {
  console.error('❌ Request error:', error);
  return Promise.reject(error);
};

api.interceptors.request.use(prepareRequest, onRequestError);
api2.interceptors.request.use(prepareRequest, onRequestError);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
const handleSuccess = (response) => {
  if (IS_DEV) {
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        break;
      }
      case 403: console.warn('🚫 Forbidden'); break;
      case 404: console.warn('🔍 Not found'); break;
      case 422: console.warn('📝 Validation error:', response.data?.errors); break;
      case 500: console.error('💥 Server error'); break;
      default:  console.error(`⚠️ API error (${status}):`, message);
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
// SHORT-HAND EXPORTS
// ============================================
export const get   = (url, config = {}) => api.get(url, config);
export const post  = (url, data = {}, config = {}) => api.post(url, data, config);
export const put   = (url, data = {}, config = {}) => api.put(url, data, config);
export const patch = (url, data = {}, config = {}) => api.patch(url, data, config);
export const del   = (url, config = {}) => api.delete(url, config);

export default api;
export { api, api2, API_BASE_URL, API_BASE_URL2 };