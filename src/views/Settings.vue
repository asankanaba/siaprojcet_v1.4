<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="settings-container">
          <div class="d-flex justify-content-between align-center mb-4">
            <div>
              <h4 style="font-weight:700;"><i class="fas fa-cog"></i> System Settings</h4>
              <p class="text-muted">Manage your account and system preferences</p>
            </div>
            <span class="version-badge">v1.3</span>
          </div>
          
          <!-- Settings Tabs -->
          <div class="settings-tabs">
            <button 
              v-for="tab in tabs" 
              :key="tab.key"
              class="tab-btn"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              <i :class="tab.icon"></i> {{ tab.label }}
            </button>
          </div>
          
          <!-- ========================================== -->
          <!-- ACCOUNT SETTINGS -->
          <!-- ========================================== -->
          <div v-if="activeTab === 'account'" class="settings-panel card">
            <h5 style="font-weight:700;margin-bottom:1.5rem;">
              <i class="fas fa-user-circle"></i> Account Settings
            </h5>
            
            <!-- Profile Picture -->
            <div class="form-group">
              <label class="form-label">Profile Picture</label>
              <div class="profile-picture-upload">
                <div class="profile-avatar" @click="$refs.fileInput.click()">
                  <img 
                    v-if="profilePicture" 
                    :src="profilePicture" 
                    alt="Profile Picture"
                    class="profile-img"
                  />
                  <div v-else class="profile-placeholder">
                    <i class="fas fa-user"></i>
                  </div>
                  <div class="profile-overlay">
                    <i class="fas fa-camera"></i>
                    <span>Change Photo</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  ref="fileInput" 
                  @change="handleProfilePictureUpload" 
                  accept="image/*"
                  style="display: none;"
                />
                <div class="profile-info">
                  <p><strong>{{ user?.full_name || 'User' }}</strong></p>
                  <p class="text-muted">{{ user?.email || '' }}</p>
                  <p class="text-muted">{{ user?.role || 'Staff' }}</p>
                  <button @click="removeProfilePicture" class="btn-remove-photo" v-if="profilePicture">
                    <i class="fas fa-trash"></i> Remove Photo
                  </button>
                </div>
              </div>
            </div>

            <hr class="settings-divider" />

            <!-- Personal Information -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input v-model="accountForm.full_name" type="text" class="form-control" placeholder="Enter full name" />
              </div>
              <div class="form-group">
                <label class="form-label">Username</label>
                <input v-model="accountForm.username" type="text" class="form-control" disabled />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email</label>
                <input v-model="accountForm.email" type="email" class="form-control" placeholder="Enter email" />
              </div>
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input 
                  v-model="accountForm.phone" 
                  type="tel" 
                  class="form-control" 
                  placeholder="Enter phone number"
                  @input="formatPhoneNumber"
                  maxlength="13"
                />
                <small class="text-muted">Enter up to 13 digits (e.g., 09123456789)</small>
              </div>
            </div>

            <button @click="updateProfile" class="btn btn-primary">
              <i class="fas fa-save"></i> Update Profile
            </button>

            <hr class="settings-divider" />

            <!-- Change Password -->
            <h6 style="font-weight:600;margin-bottom:1rem;">
              <i class="fas fa-lock"></i> Change Password
            </h6>

            <div class="form-group">
              <label class="form-label">Current Password</label>
              <div class="password-input-wrapper">
                <input 
                  v-model="passwordForm.current_password" 
                  :type="showCurrentPassword ? 'text' : 'password'" 
                  class="form-control" 
                  placeholder="Enter current password"
                />
                <button @click="showCurrentPassword = !showCurrentPassword" class="password-toggle" type="button">
                  <i :class="showCurrentPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                </button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">New Password</label>
                <div class="password-input-wrapper">
                  <input 
                    v-model="passwordForm.new_password" 
                    :type="showNewPassword ? 'text' : 'password'" 
                    class="form-control" 
                    placeholder="Enter new password"
                    minlength="6"
                  />
                  <button @click="showNewPassword = !showNewPassword" class="password-toggle" type="button">
                    <i :class="showNewPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Confirm New Password</label>
                <div class="password-input-wrapper">
                  <input 
                    v-model="passwordForm.confirm_password" 
                    :type="showConfirmPassword ? 'text' : 'password'" 
                    class="form-control" 
                    placeholder="Confirm new password"
                    minlength="6"
                  />
                  <button @click="showConfirmPassword = !showConfirmPassword" class="password-toggle" type="button">
                    <i :class="showConfirmPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
                  </button>
                </div>
              </div>
            </div>

            <div class="password-requirements">
              <p class="requirement" :class="{ met: passwordForm.new_password.length >= 6 }">
                <i :class="passwordForm.new_password.length >= 6 ? 'fas fa-check-circle' : 'fas fa-circle'"></i>
                At least 6 characters
              </p>
              <p class="requirement" :class="{ met: passwordForm.new_password && passwordForm.new_password === passwordForm.confirm_password }">
                <i :class="passwordForm.new_password && passwordForm.new_password === passwordForm.confirm_password ? 'fas fa-check-circle' : 'fas fa-circle'"></i>
                Passwords match
              </p>
            </div>

            <button @click="changePassword" class="btn btn-primary">
              <i class="fas fa-key"></i> Change Password
            </button>
          </div>
          
          <!-- ========================================== -->
          <!-- THEME SETTINGS (KEPT) -->
          <!-- ========================================== -->
          <div v-if="activeTab === 'theme'" class="settings-panel card">
            <h5 style="font-weight:700;margin-bottom:1.5rem;"><i class="fas fa-palette"></i> Theme Settings</h5>
            
            <div class="form-group">
              <label class="form-label">Theme Mode</label>
              <div class="theme-options">
                <button 
                  class="theme-option"
                  :class="{ active: settings.theme === 'light' }"
                  @click="settings.theme = 'light'; applyTheme('light')"
                >
                  <i class="fas fa-sun"></i> Light
                </button>
                <button 
                  class="theme-option"
                  :class="{ active: settings.theme === 'dark' }"
                  @click="settings.theme = 'dark'; applyTheme('dark')"
                >
                  <i class="fas fa-moon"></i> Dark
                </button>
                <button 
                  class="theme-option"
                  :class="{ active: settings.theme === 'system' }"
                  @click="settings.theme = 'system'; applyTheme('system')"
                >
                  <i class="fas fa-desktop"></i> System
                </button>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Primary Color</label>
              <div class="color-options">
                <button 
                  v-for="color in colors" 
                  :key="color.name"
                  class="color-option"
                  :style="{ background: color.value }"
                  :class="{ active: settings.primary_color === color.value }"
                  @click="selectColor(color.value)"
                  :title="color.name"
                ></button>
              </div>
              <small class="text-muted">Current color: <span :style="{ color: settings.primary_color, fontWeight: 'bold' }">{{ settings.primary_color }}</span></small>
            </div>
            
            <button @click="saveSettings" class="btn btn-primary">
              <i class="fas fa-save"></i> Save Theme Settings
            </button>
          </div>
          
          <!-- Success Message -->
          <div v-if="showSuccess" class="alert alert-success mt-3">
            <i class="fas fa-check-circle"></i> Settings saved successfully!
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import api from '@/api/index.js'
import Swal from 'sweetalert2'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()

// ============================================
// USER DATA
// ============================================
const user = computed(() => authStore.user)

// ============================================
// TABS - Only Account and Theme
// ============================================
const tabs = [
  { key: 'account', label: 'Account', icon: 'fas fa-user-circle' },
  { key: 'theme', label: 'Theme', icon: 'fas fa-palette' }
]

const activeTab = ref('account')

// ============================================
// COLORS
// ============================================
const colors = [
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F59E0B' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Teal', value: '#14B8A6' }
]

// ============================================
// ACCOUNT FORM
// ============================================
const profilePicture = ref('')
const fileInput = ref(null)

const accountForm = reactive({
  full_name: '',
  username: '',
  email: '',
  phone: ''
})

// ============================================
// PASSWORD FORM
// ============================================
const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)

// ============================================
// SETTINGS
// ============================================
const showSuccess = ref(false)

const settings = reactive({
  theme: 'light',
  primary_color: '#4F46E5'
})

// ============================================
// PHONE NUMBER VALIDATION
// ============================================
const formatPhoneNumber = () => {
  // Remove all non-digit characters
  accountForm.phone = accountForm.phone.replace(/\D/g, '')
  
  // Limit to 13 digits
  if (accountForm.phone.length > 13) {
    accountForm.phone = accountForm.phone.slice(0, 13)
  }
}

// ============================================
// ACCOUNT METHODS
// ============================================
const loadAccountData = () => {
  if (user.value) {
    accountForm.full_name = user.value.full_name || ''
    accountForm.username = user.value.username || ''
    accountForm.email = user.value.email || ''
    accountForm.phone = user.value.phone || ''
    profilePicture.value = user.value.profile_picture || user.value.avatar || ''
  }
}

const handleProfilePictureUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'File Too Large',
        text: 'Please upload an image smaller than 5MB.',
        confirmButtonColor: '#4F46E5'
      })
      return
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'warning',
        title: 'Invalid File',
        text: 'Please upload an image file.',
        confirmButtonColor: '#4F46E5'
      })
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      profilePicture.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

const removeProfilePicture = () => {
  profilePicture.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const updateProfile = async () => {
  if (!accountForm.full_name.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Full name is required',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  // Validate phone number format
  if (accountForm.phone && accountForm.phone.length < 10) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Phone number must be at least 10 digits',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  try {
    const payload = {
      full_name: accountForm.full_name,
      email: accountForm.email,
      phone: accountForm.phone
    }
    
    // If there's a new profile picture, send it as base64 or upload separately
    if (fileInput.value?.files[0]) {
      // For now, we'll just update the profile picture in local state
      // You can implement image upload to server here
    }

    const response = await api.put(`/users.php?id=${user.value.id}`, payload)
    
    if (response.data.success) {
      // Update local user data
      const updatedUser = {
        ...authStore.user,
        full_name: accountForm.full_name,
        email: accountForm.email,
        phone: accountForm.phone,
        profile_picture: profilePicture.value
      }
      
      authStore.user = updatedUser
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      // Trigger Navbar update by forcing a refresh
      // The Navbar will read from authStore which is reactive
      
      await Swal.fire({
        icon: 'success',
        title: 'Profile Updated!',
        text: 'Your profile has been updated successfully.',
        confirmButtonColor: '#4F46E5',
        timer: 2000,
        showConfirmButton: false
      })
      
      // Refresh the page to update Navbar
      // Or you can emit an event to update Navbar
      window.dispatchEvent(new CustomEvent('profile-updated'))
    }
  } catch (error) {
    console.error('Error updating profile:', error)
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to update profile. Please try again.',
      confirmButtonColor: '#4F46E5'
    })
  }
}

const changePassword = async () => {
  if (!passwordForm.current_password) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Current password is required',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  if (passwordForm.new_password.length < 6) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'New password must be at least 6 characters',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  if (passwordForm.new_password !== passwordForm.confirm_password) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Passwords do not match',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  try {
    const response = await api.put(`/users.php?id=${user.value.id}`, {
      current_password: passwordForm.current_password,
      new_password: passwordForm.new_password
    })

    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Password Changed!',
        text: 'Your password has been updated successfully.',
        confirmButtonColor: '#4F46E5',
        timer: 2000,
        showConfirmButton: false
      })
      
      passwordForm.current_password = ''
      passwordForm.new_password = ''
      passwordForm.confirm_password = ''
    }
  } catch (error) {
    console.error('Error changing password:', error)
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to change password. Please try again.',
      confirmButtonColor: '#4F46E5'
    })
  }
}

// ============================================
// SETTINGS METHODS
// ============================================
const loadSettings = async () => {
  try {
    const response = await api.get('/settings.php')
    if (response.data) {
      settings.theme = response.data.theme || 'light'
      settings.primary_color = response.data.primary_color || '#4F46E5'
    }
    
    if (settings.primary_color) {
      applyPrimaryColor(settings.primary_color)
    }
    
    if (settings.theme) {
      applyTheme(settings.theme)
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
}

const saveSettings = async () => {
  try {
    await api.post('/settings.php', {
      theme: settings.theme,
      primary_color: settings.primary_color
    })
    
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, 3000)
    
    if (settings.primary_color) {
      applyPrimaryColor(settings.primary_color)
    }
  } catch (error) {
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to save settings',
      confirmButtonColor: '#4F46E5'
    })
  }
}

// ============================================
// THEME METHODS
// ============================================
const applyTheme = (theme) => {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode')
    themeStore.darkMode = true
    localStorage.setItem('darkMode', 'true')
  } else if (theme === 'light') {
    document.body.classList.remove('dark-mode')
    themeStore.darkMode = false
    localStorage.setItem('darkMode', 'false')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      document.body.classList.add('dark-mode')
      themeStore.darkMode = true
      localStorage.setItem('darkMode', 'true')
    } else {
      document.body.classList.remove('dark-mode')
      themeStore.darkMode = false
      localStorage.setItem('darkMode', 'false')
    }
  }
}

const applyPrimaryColor = (color) => {
  document.documentElement.style.setProperty('--primary', color)
  document.documentElement.style.setProperty('--primary-dark', color)
  localStorage.setItem('primaryColor', color)
}

const selectColor = (color) => {
  settings.primary_color = color
  applyPrimaryColor(color)
  saveSettings()
}

// ============================================
// LIFECYCLE
// ============================================
let themeWatcher = null

onMounted(() => {
  loadAccountData()
  
  const savedColor = localStorage.getItem('primaryColor')
  if (savedColor) {
    settings.primary_color = savedColor
    applyPrimaryColor(savedColor)
  }
  
  loadSettings()
  
  themeWatcher = setInterval(() => {
    const currentTheme = themeStore.darkMode ? 'dark' : 'light'
    if (settings.theme !== currentTheme) {
      settings.theme = currentTheme
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (themeWatcher) {
    clearInterval(themeWatcher)
    themeWatcher = null
  }
})
</script>

<style scoped>
/* ============================================
   LAYOUT
   ============================================ */
.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-content {
  padding: 0;
  background: #f1f5f9;
  flex: 1;
}

body.dark-mode .page-content {
  background: #0f172a;
}

.settings-container {
  padding: 1.5rem;
  max-width: 900px;
  margin: 0 auto;
}

/* ============================================
   HEADER
   ============================================ */
.text-muted {
  color: #6b7280;
  margin: 0;
}

body.dark-mode .text-muted {
  color: #9ca3af;
}

.version-badge {
  display: inline-block;
  background: var(--primary, #4F46E5);
  color: white;
  font-size: 0.6rem;
  padding: 0.125rem 0.5rem;
  border-radius: 10px;
  font-weight: 600;
}

/* ============================================
   TABS
   ============================================ */
.settings-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 0.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .settings-tabs {
  background: #1e293b;
}

.tab-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

body.dark-mode .tab-btn {
  color: #9ca3af;
}

.tab-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

body.dark-mode .tab-btn:hover {
  background: rgba(255,255,255,0.05);
  color: #e2e8f0;
}

.tab-btn.active {
  background: #4F46E5;
  color: white;
}

/* ============================================
   CARDS / PANELS
   ============================================ */
.card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  border: none;
}

body.dark-mode .card {
  background: #1e293b;
}

.settings-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ============================================
   FORM
   ============================================ */
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
  color: #1f2937;
}

body.dark-mode .form-label {
  color: #e2e8f0;
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

body.dark-mode .form-control {
  background: #2d3748;
  border-color: #374151;
  color: #e2e8f0;
}

.form-control:focus {
  outline: none;
  border-color: #4F46E5;
  box-shadow: 0 0 0 4px rgba(79,70,229,0.1);
}

body.dark-mode .form-control:focus {
  border-color: #4F46E5;
  box-shadow: 0 0 0 4px rgba(79,70,229,0.2);
}

.form-control:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  background: #f3f4f6;
}

body.dark-mode .form-control:disabled {
  background: #2d3748;
}

textarea.form-control {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.text-muted {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  display: block;
}

body.dark-mode .text-muted {
  color: #9ca3af;
}

/* ============================================
   PROFILE PICTURE
   ============================================ */
.profile-picture-upload {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1rem 0;
}

.profile-avatar {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 3px solid #e5e7eb;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

body.dark-mode .profile-avatar {
  border-color: #374151;
}

.profile-avatar:hover .profile-overlay {
  opacity: 1;
}

.profile-avatar:hover {
  border-color: #4F46E5;
}

.profile-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: white;
  font-size: 3rem;
}

.profile-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.profile-overlay i {
  font-size: 1.5rem;
  margin-bottom: 0.25rem;
}

.profile-overlay span {
  font-size: 0.7rem;
}

.profile-info p {
  margin: 0.2rem 0;
}

.profile-info .text-muted {
  color: #6b7280;
  font-size: 0.85rem;
}

body.dark-mode .profile-info .text-muted {
  color: #9ca3af;
}

.btn-remove-photo {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0;
  margin-top: 0.3rem;
  transition: color 0.2s;
}

.btn-remove-photo:hover {
  color: #dc2626;
}

/* ============================================
   PASSWORD
   ============================================ */
.password-input-wrapper {
  position: relative;
}

.password-input-wrapper .form-control {
  padding-right: 3rem;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1rem;
}

body.dark-mode .password-toggle {
  color: #9ca3af;
}

.password-toggle:hover {
  color: #1f2937;
}

body.dark-mode .password-toggle:hover {
  color: #e2e8f0;
}

.password-requirements {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.requirement {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

body.dark-mode .requirement {
  color: #9ca3af;
}

.requirement.met {
  color: #10b981;
}

.requirement i {
  font-size: 0.6rem;
}

/* ============================================
   SETTINGS DIVIDER
   ============================================ */
.settings-divider {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 1.5rem 0;
}

body.dark-mode .settings-divider {
  border-top-color: #374151;
}

/* ============================================
   THEME OPTIONS
   ============================================ */
.theme-options {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.theme-option {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.9rem;
  color: #1f2937;
}

body.dark-mode .theme-option {
  background: #2d3748;
  border-color: #374151;
  color: #e2e8f0;
}

.theme-option:hover {
  border-color: #4F46E5;
}

.theme-option.active {
  border-color: #4F46E5;
  background: #4F46E5;
  color: white;
}

/* ============================================
   COLOR OPTIONS
   ============================================ */
.color-options {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.color-option {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: #1a1a2e;
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(0,0,0,0.1);
}

body.dark-mode .color-option.active {
  border-color: white;
}

/* ============================================
   BUTTONS
   ============================================ */
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

.btn-primary {
  background: #4F46E5;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4338CA;
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(79,70,229,0.3);
}

/* ============================================
   ALERT
   ============================================ */
.alert-success {
  padding: 1rem;
  border-radius: 10px;
  background: #D1FAE5;
  color: #065F46;
  border: 1px solid #A7F3D0;
}

body.dark-mode .alert-success {
  background: rgba(16,185,129,0.2);
  color: #34D399;
  border-color: rgba(16,185,129,0.3);
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .settings-container {
    padding: 1rem;
  }

  .settings-tabs {
    flex-direction: column;
  }

  .tab-btn {
    width: 100%;
    text-align: left;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .profile-picture-upload {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .profile-avatar {
    width: 100px;
    height: 100px;
  }

  .theme-options {
    flex-direction: column;
  }

  .password-requirements {
    flex-direction: column;
    gap: 0.3rem;
  }
}

@media (max-width: 480px) {
  .profile-avatar {
    width: 80px;
    height: 80px;
  }

  .profile-overlay span {
    display: none;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>