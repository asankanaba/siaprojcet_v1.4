<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="edit-profile-container">
          <!-- Header -->
          <div class="edit-profile-header">
            <div>
              <h2><i class="fas fa-user-edit"></i> Edit Profile</h2>
              <p>Update your personal information</p>
            </div>
            <button @click="goBack" class="btn-back">
              <i class="fas fa-arrow-left"></i> Back to Profile
            </button>
          </div>

          <!-- Edit Form -->
          <div class="edit-profile-card">
            <form @submit.prevent="handleSubmit">
              <!-- Profile Picture Upload -->
              <div class="avatar-upload-section">
                <div class="avatar-preview">
                  <img 
                    v-if="previewImage" 
                    :src="previewImage" 
                    alt="Profile" 
                  />
                  <span v-else>{{ userInitials }}</span>
                </div>
                <div class="upload-actions">
                  <label class="btn-upload">
                    <i class="fas fa-camera"></i> Upload Photo
                    <input 
                      type="file" 
                      accept="image/*"
                      @change="handleFileUpload"
                      style="display: none"
                    />
                  </label>
                  <button 
                    v-if="previewImage" 
                    type="button" 
                    @click="removePhoto"
                    class="btn-remove-photo"
                  >
                    <i class="fas fa-trash"></i> Remove
                  </button>
                  <small class="upload-hint">JPG, PNG or GIF. Max size 2MB.</small>
                </div>
              </div>

              <!-- Form Fields -->
              <div class="form-row">
                <div class="form-group">
                  <label>Full Name <span class="required">*</span></label>
                  <input 
                    v-model="form.full_name" 
                    type="text" 
                    class="form-control" 
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>Username</label>
                  <input 
                    v-model="form.username" 
                    type="text" 
                    class="form-control" 
                    disabled
                  />
                  <small class="field-hint">Username cannot be changed</small>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Email <span class="required">*</span></label>
                  <input 
                    v-model="form.email" 
                    type="email" 
                    class="form-control" 
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div class="form-group">
                  <label>Phone</label>
                  <input 
                    v-model="form.phone" 
                    type="tel" 
                    class="form-control" 
                    placeholder="Enter phone number"
                    @input="formatPhoneNumber"
                    maxlength="11"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Department</label>
                  <select v-model="form.department" class="form-control">
                    <option value="General">General</option>
                    <option value="IT">IT</option>
                    <option value="HR">HR</option>
                    <option value="Finance">Finance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Executive">Executive</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Primary Role</label>
                  <input 
                    :value="getRoleLabel(form.role)" 
                    type="text" 
                    class="form-control" 
                    disabled
                  />
                  <small class="field-hint">Role cannot be changed. Contact HR for role changes.</small>
                </div>
              </div>

              <div class="form-group" v-if="allRoles.length > 1">
                <label>Additional Roles</label>
                <div class="role-tags-display">
                  <span 
                    v-for="role in allRoles" 
                    :key="role"
                    class="role-tag"
                    :style="{ 
                      backgroundColor: getRoleColor(role) + '20', 
                      color: getRoleColor(role),
                      borderColor: getRoleColor(role)
                    }"
                  >
                    <i :class="getRoleIcon(role)"></i>
                    {{ getRoleLabel(role) }}
                    <span v-if="role === form.role" class="primary-badge">Primary</span>
                  </span>
                </div>
                <small class="field-hint">Additional roles are managed by HR</small>
              </div>

              <!-- Change Password Section -->
              <div class="password-section">
                <h4><i class="fas fa-lock"></i> Change Password</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Current Password</label>
                    <input 
                      v-model="passwordForm.current" 
                      type="password" 
                      class="form-control" 
                      placeholder="Enter current password"
                    />
                  </div>
                  <div class="form-group">
                    <label>New Password</label>
                    <input 
                      v-model="passwordForm.new" 
                      type="password" 
                      class="form-control" 
                      placeholder="Enter new password"
                      minlength="6"
                    />
                  </div>
                </div>
                <div class="form-group">
                  <label>Confirm New Password</label>
                  <input 
                    v-model="passwordForm.confirm" 
                    type="password" 
                    class="form-control" 
                    placeholder="Confirm new password"
                    minlength="6"
                  />
                </div>
              </div>

              <!-- Actions -->
              <div class="form-actions">
                <button type="button" @click="goBack" class="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                  <i v-if="isSubmitting" class="fas fa-spinner fa-spin"></i>
                  {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, ROLE_CONFIG } from '@/stores/auth';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
import api from '@/api/index.js';
import Swal from 'sweetalert2';

const router = useRouter();
const authStore = useAuthStore();

const isSubmitting = ref(false);
const previewImage = ref(null);

// Form data
const form = ref({
  id: null,
  full_name: '',
  username: '',
  email: '',
  phone: '',
  role: '',
  department: '',
  profile_picture: null,
  status: ''
});

// Password form
const passwordForm = ref({
  current: '',
  new: '',
  confirm: ''
});

// Computed
const user = computed(() => authStore.user);

const userInitials = computed(() => {
  const name = form.value.full_name || 'User';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

const allRoles = computed(() => {
  if (!user.value) return [];
  const roles = [form.value.role];
  if (user.value.roles) {
    let additionalRoles = [];
    if (typeof user.value.roles === 'string') {
      try {
        const parsed = JSON.parse(user.value.roles);
        if (Array.isArray(parsed)) additionalRoles = parsed;
      } catch (e) {}
    } else if (Array.isArray(user.value.roles)) {
      additionalRoles = user.value.roles;
    }
    additionalRoles.forEach(r => {
      if (!roles.includes(r)) roles.push(r);
    });
  }
  return roles;
});

// Role helpers
const getRoleLabel = (role) => {
  return ROLE_CONFIG.roles[role]?.label || role || 'Staff';
};

const getRoleIcon = (role) => {
  return ROLE_CONFIG.roles[role]?.icon || 'fas fa-user';
};

const getRoleColor = (role) => {
  return ROLE_CONFIG.roles[role]?.color || '#6B7280';
};

// Methods
const formatPhoneNumber = () => {
  form.value.phone = form.value.phone.replace(/\D/g, '');
  if (form.value.phone.length > 11) {
    form.value.phone = form.value.phone.slice(0, 11);
  }
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'File Too Large',
        text: 'Image must be less than 2MB',
        confirmButtonColor: '#4F46E5'
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.value = e.target.result;
      form.value.profile_picture = file;
    };
    reader.readAsDataURL(file);
  }
};

const removePhoto = () => {
  previewImage.value = null;
  form.value.profile_picture = null;
};

const goBack = () => {
  router.push('/profile');
};

const handleSubmit = async () => {
  // Validate
  if (!form.value.full_name.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Full name is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }

  if (!form.value.email.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Email is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }

  // Validate password
  if (passwordForm.value.new || passwordForm.value.confirm) {
    if (!passwordForm.value.current) {
      await Swal.fire({
        icon: 'warning',
        title: 'Password Required',
        text: 'Please enter your current password to change it',
        confirmButtonColor: '#4F46E5'
      });
      return;
    }
    if (passwordForm.value.new.length < 6) {
      await Swal.fire({
        icon: 'warning',
        title: 'Password Too Short',
        text: 'New password must be at least 6 characters',
        confirmButtonColor: '#4F46E5'
      });
      return;
    }
    if (passwordForm.value.new !== passwordForm.value.confirm) {
      await Swal.fire({
        icon: 'warning',
        title: 'Password Mismatch',
        text: 'New password and confirmation do not match',
        confirmButtonColor: '#4F46E5'
      });
      return;
    }
  }

  isSubmitting.value = true;

  try {
    const payload = {
      full_name: form.value.full_name,
      email: form.value.email,
      phone: form.value.phone || '',
      department: form.value.department
    };

    // Add password if changing
    if (passwordForm.value.new) {
      payload.current_password = passwordForm.value.current;
      payload.new_password = passwordForm.value.new;
    }

    // ✅ Add profile picture if uploaded (send as base64)
    if (form.value.profile_picture) {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(form.value.profile_picture);
      });
      const base64Image = await base64Promise;
      payload.profile_picture = base64Image;
    }

    console.log('📤 Sending payload:', payload);

    const response = await api.put(`/users.php?id=${form.value.id}`, payload);

    console.log('📥 Response:', response.data);

    if (response.data.success) {
      // ✅ Update auth store with fresh user data
      await authStore.getCurrentUser();
      
      await Swal.fire({
        icon: 'success',
        title: 'Profile Updated!',
        text: 'Your profile has been updated successfully.',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
      
      router.push('/profile');
    } else {
      throw new Error(response.data.message || 'Update failed');
    }
  } catch (error) {
    console.error('Error updating profile:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to update profile. Please try again.',
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    isSubmitting.value = false;
  }
};

// Load user data
onMounted(() => {
  if (user.value) {
    form.value.id = user.value.id;
    form.value.full_name = user.value.full_name || '';
    form.value.username = user.value.username || '';
    form.value.email = user.value.email || '';
    form.value.phone = user.value.phone || '';
    form.value.role = user.value.role || 'staff';
    form.value.department = user.value.department || 'General';
    form.value.status = user.value.status || 'active';
    form.value.profile_picture = user.value.profile_picture || null;
  }
});
</script>

<style scoped>
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

.edit-profile-container {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.edit-profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.edit-profile-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .edit-profile-header h2 {
  color: #e2e8f0;
}

.edit-profile-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .edit-profile-header p {
  color: #9ca3af;
}

.btn-back {
  background: white;
  border: 1px solid #e5e7eb;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #1f2937;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

body.dark-mode .btn-back {
  background: #1e293b;
  border-color: #374151;
  color: #e2e8f0;
}

.btn-back:hover {
  background: #f9fafb;
  border-color: #4F46E5;
}

.edit-profile-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .edit-profile-card {
  background: #1e293b;
}

/* Avatar Upload */
.avatar-upload-section {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 2rem;
}

body.dark-mode .avatar-upload-section {
  border-bottom-color: #2d3748;
}

.avatar-preview {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-upload {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  background: #4F46E5;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.btn-upload:hover {
  background: #4338CA;
}

.btn-remove-photo {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef4444;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-remove-photo:hover {
  background: #fef2f2;
}

.upload-hint {
  font-size: 0.75rem;
  color: #6b7280;
}

body.dark-mode .upload-hint {
  color: #9ca3af;
}

/* Form */
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  font-size: 0.85rem;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

body.dark-mode .form-group label {
  color: #e2e8f0;
}

.required {
  color: #ef4444;
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  color: #1f2937;
  transition: border-color 0.2s;
}

body.dark-mode .form-control {
  background: #2d3748;
  border-color: #374151;
  color: #e2e8f0;
}

.form-control:focus {
  outline: none;
  border-color: #4F46E5;
}

.form-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.field-hint {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.7rem;
  color: #6b7280;
}

body.dark-mode .field-hint {
  color: #9ca3af;
}

/* Role Tags */
.role-tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.5rem 0;
}

.role-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid;
}

.primary-badge {
  font-size: 0.5rem;
  background: #4F46E5;
  color: white;
  padding: 0.05rem 0.3rem;
  border-radius: 8px;
  font-weight: 700;
}

/* Password Section */
.password-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
}

body.dark-mode .password-section {
  border-top-color: #2d3748;
}

.password-section h4 {
  margin: 0 0 1rem 0;
  color: #1f2937;
  font-size: 1rem;
}

body.dark-mode .password-section h4 {
  color: #e2e8f0;
}

/* Actions */
.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-secondary {
  background: #f3f4f6;
  color: #1f2937;
}

body.dark-mode .btn-secondary {
  background: #2d3748;
  color: #e2e8f0;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.btn-primary {
  background: #4F46E5;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4338CA;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .edit-profile-container {
    padding: 1rem;
  }
  
  .edit-profile-card {
    padding: 1.5rem;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
  
  .avatar-upload-section {
    flex-direction: column;
    text-align: center;
  }
}
</style>