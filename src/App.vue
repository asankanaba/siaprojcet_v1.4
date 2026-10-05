<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(() => {
  // ✅ Check authentication status on app mount
  // No need to call init() if it doesn't exist
  authStore.checkAuth()
  
  // Load dark mode preference
  const darkMode = localStorage.getItem('darkMode')
  if (darkMode === 'true') {
    document.body.classList.add('dark-mode')
  }
  
  // Load primary color
  const primaryColor = localStorage.getItem('primaryColor')
  if (primaryColor) {
    document.documentElement.style.setProperty('--primary', primaryColor)
    document.documentElement.style.setProperty('--primary-dark', primaryColor)
  }
})
</script>

<style>
/* Global styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f1f5f9;
  color: #1a1a2e;
  transition: background 0.3s ease, color 0.3s ease;
}

body.dark-mode {
  background: #0f172a;
  color: #e2e8f0;
}

:root {
  --primary: #4F46E5;
  --primary-dark: #4F46E5;
  --secondary: #7C3AED;
  --success: #10B981;
  --warning: #F59E0B;
  --danger: #EF4444;
  --text-muted: #6B7280;
  --text-light: #1F2937;
  --text-dark: #E2E8F0;
  --bg-light: #F3F4F6;
  --bg-card: #1E293B;
  --border-light: #E5E7EB;
  --border-dark: #374151;
}

#app {
  min-height: 100vh;
}
</style>