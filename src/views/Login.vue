<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-logo">
        <div class="logo-icon">🏬</div>
        <h1>MaxiMarket</h1>
        <p>Inventory Management System <span class="version-badge">v1.3</span></p>
      </div>
      
      <div v-if="errorMessage" class="alert alert-danger">
        ⚠️ {{ errorMessage }}
      </div>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">Username</label>
          <div class="input-group">
            <span class="input-group-text">👤</span>
            <input
              v-model="username"
              type="text"
              class="form-control"
              placeholder="Enter username"
              required
              :disabled="loading"
              autocomplete="username"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Password</label>
          <div class="input-group">
            <span class="input-group-text">🔒</span>
            <input
              v-model="password"
              type="password"
              class="form-control"
              placeholder="Enter password"
              required
              :disabled="loading"
              autocomplete="current-password"
            />
          </div>
        </div>
        
        <button
          type="submit"
          class="btn btn-gradient btn-block btn-lg"
          :disabled="loading"
        >
          <span v-if="!loading">Login</span>
          <span v-else>Logging in...</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const loading = ref(false);

const handleLogin = async () => {
  loading.value = true;
  errorMessage.value = '';
  
  try {
    console.log('🔄 Login attempt from Login.vue');
    console.log('👤 Username:', username.value);
    
    const result = await authStore.login(username.value, password.value);
    
    console.log('📥 Login Result:', result);
    
    if (result.success) {
      console.log('✅ Login successful, redirecting...');
      
      const role = result.user?.role;
      let redirectPath = '/dashboard';
      
      // ✅ Proper role-based redirects
      if (role === 'ceo' || role === 'super_admin') {
        redirectPath = '/ceo-dashboard';
      } else if (role === 'finance') {
        redirectPath = '/finance/dashboard';
      } else if (role === 'hr') {
        redirectPath = '/hr/dashboard';
      } else if (role === 'staff' || role === 'cashier') {
        redirectPath = '/pos';
      } else if (role === 'admin') {
        redirectPath = '/dashboard';
      }
      
      console.log('🔄 Redirecting to:', redirectPath);
      console.log('👤 User role:', role);
      
      // Use window.location for full page reload
      window.location.href = redirectPath;
    } else {
      errorMessage.value = result.error || 'Login failed';
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    errorMessage.value = 'Login failed. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

.login-card {
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 2.5rem;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.login-logo {
  text-align: center;
  margin-bottom: 2rem;
}

.login-logo .logo-icon {
  width: 80px;
  height: 80px;
  background: rgba(79,70,229,0.1);
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.login-logo h1 {
  font-weight: 800;
  color: #1a1a2e;
  margin: 0;
}

.login-logo p {
  color: #6b7280;
  margin: 0.5rem 0 0;
}

.version-badge {
  display: inline-block;
  background: #4F46E5;
  color: white;
  font-size: 0.6rem;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-weight: 600;
  margin-left: 0.25rem;
}

.alert {
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.alert-danger {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
  color: #1a1a2e;
}

.input-group {
  display: flex;
  align-items: stretch;
}

.input-group .input-group-text {
  display: flex;
  align-items: center;
  padding: 0 0.875rem;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-right: none;
  border-radius: 10px 0 0 10px;
  color: #6b7280;
}

.input-group .form-control {
  border-radius: 0 10px 10px 0;
}

.form-control {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  background: white;
  color: #1f2937;
  font-family: inherit;
}

.form-control:focus {
  outline: none;
  border-color: #4F46E5;
  box-shadow: 0 0 0 4px rgba(79,70,229,0.1);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-gradient {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: white;
  width: 100%;
  padding: 0.75rem;
}

.btn-gradient:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(79,70,229,0.4);
}

.btn-block {
  width: 100%;
}

.btn-lg {
  padding: 0.75rem 1.5rem;
  font-size: 1.05rem;
}
</style>