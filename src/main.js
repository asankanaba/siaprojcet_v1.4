//import { MEDIA_BASE_URL } from './imageHelper.js'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Import custom CSS only
import './assets/css/style.css'
import './assets/css/liquid-glass.css'
import './assets/css/sweetalert-glass.css'
// Create app
const app = createApp(App)

// Use plugins
app.use(createPinia())
app.use(router)

// Mount app
app.mount('#app')

console.log('✅ Smart POS System started successfully!')