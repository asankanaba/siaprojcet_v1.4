// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Import global styles
import './assets/css/liquid-glass.css'
import './assets/css/style.css'
import './assets/css/sweetalert-glass.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// ============================================
// 🌐 API BASE URL
// ============================================
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://siaprojcetv14backend.vercel.app/api'
console.log('🔌 API Base URL :', API_BASE)

// ============================================
// 💓 KEEP ALIVE — prevent Aiven MySQL from sleeping
// ============================================
// Free-tier Aiven sleeps after ~5 min idle → first request takes 10-15s.
// Pinging every 4 min keeps it awake.
function startKeepAlive() {
  const pingUrl = `${API_BASE}/ping.php`

  const ping = async () => {
    try {
      const t0 = performance.now()
      const res = await fetch(pingUrl, { method: 'GET', cache: 'no-store' })
      const t1 = performance.now()
      const ms = Math.round(t1 - t0)

      if (res.ok) {
        if (ms > 2000) {
          console.log(`💓 Ping slow: ${ms}ms (DB probably waking up)`)
        }
      } else {
        console.warn(`💓 Ping HTTP ${res.status} (${ms}ms)`)
      }
    } catch (e) {
      // Network errors are fine — best-effort
    }
  }

  // Initial ping immediately
  ping()

  // Then ping every 4 minutes
  setInterval(ping, 4 * 60 * 1000)
}

// Only run keep-alive in production
if (import.meta.env.PROD) {
  startKeepAlive()
}

// ============================================
// 🚀 Mount
// ============================================
app.mount('#app')