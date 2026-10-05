<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-logo">
        <div class="logo-icon">👤</div>
        <h1>Staff Registration</h1>
        <p>Create a new staff account</p>
      </div>
      
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label class="form-label">Full Name *</label>
          <div class="input-group">
            <span class="input-group-text"><i class="fas fa-user"></i></span>
            <input
              v-model="form.full_name"
              type="text"
              class="form-control"
              placeholder="Enter full name"
              required
              :disabled="loading"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Username *</label>
          <div class="input-group">
            <span class="input-group-text"><i class="fas fa-id-card"></i></span>
            <input
              v-model="form.username"
              type="text"
              class="form-control"
              placeholder="Enter username"
              required
              :disabled="loading"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Email</label>
          <div class="input-group">
            <span class="input-group-text"><i class="fas fa-envelope"></i></span>
            <input
              v-model="form.email"
              type="email"
              class="form-control"
              placeholder="Enter email"
              :disabled="loading"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Password *</label>
          <div class="input-group">
            <span class="input-group-text"><i class="fas fa-lock"></i></span>
            <input
              v-model="form.password"
              type="password"
              class="form-control"
              placeholder="Enter password (min 6 characters)"
              required
              minlength="6"
              :disabled="loading"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label class="form-label">Role *</label>
          <select v-model="form.role" class="form-control" required :disabled="loading">
            <option value="cashier">Cashier</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <button
          type="submit"
          class="btn btn-gradient btn-block btn-lg"
          :disabled="loading"
        >
          <span v-if="!loading">
            <i class="fas fa-user-plus"></i> Register
          </span>
          <span v-else>
            <i class="fas fa-spinner spin"></i> Registering...
          </span>
        </button>
        
        <div class="text-center mt-3">
          <router-link to="/login" class="text-primary">Already have an account? Login</router-link>
        </div>
        
        <div v-if="error" class="alert alert-danger mt-3">
          <i class="fas fa-exclamation-circle"></i> {{ error }}
        </div>
        
        <div v-if="success" class="alert alert-success mt-3">
          <i class="fas fa-check-circle"></i> {{ success }}
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/index.js'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const success = ref('')

const form = ref({
  full_name: '',
  username: '',
  email: '',
  password: '',
  role: 'cashier'
})

const handleRegister = async () => {
  loading.value = true
  error.value = ''
  success.value = ''
  
  try {
    const response = await api.post('/auth.php?action=register', form.value)
    
    if (response.data.success) {
      success.value = response.data.message || 'Registration successful! Redirecting to login...'
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } else {
      error.value = response.data.message || 'Registration failed'
    }
  } catch (err) {
    console.error('Registration error:', err)
    error.value = err.response?.data?.message || 'Network error - please try again'
  } finally {
    loading.value = false
  }
}
</script>