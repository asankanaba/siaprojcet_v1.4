// src/api/index.js
import axios from 'axios'

// ============================================
// API BASE URL
// ============================================
// Reads from Vite env vars (set in .env.production / Netlify)
// Falls back to the Vercel backend URL if not set
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://siaprojcetv14backend.vercel.app/api'

// ============================================
// AXIOS INSTANCE
// ============================================
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// ============================================
// REQUEST INTERCEPTOR
// ============================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api