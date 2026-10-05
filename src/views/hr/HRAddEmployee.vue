<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="add-employee-container">
          <!-- Header -->
          <div class="add-employee-header">
            <div>
              <h2><i class="fas fa-user-plus"></i> Add New Employee</h2>
              <p>Register a new employee to the system</p>
            </div>
            <div class="header-actions">
              <button @click="goBack" class="btn-back">
                <i class="fas fa-arrow-left"></i> Back
              </button>
            </div>
          </div>

          <!-- Form -->
          <div class="add-employee-form">
            <form @submit.prevent="handleSubmit">
              <div class="form-row">
                <div class="form-group">
                  <label>Full Name <span class="required">*</span></label>
                  <input v-model="form.full_name" type="text" class="form-control" placeholder="Enter full name" required />
                </div>
                <div class="form-group">
                  <label>Username <span class="required">*</span></label>
                  <input v-model="form.username" type="text" class="form-control" placeholder="Enter username" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Email <span class="required">*</span></label>
                  <input v-model="form.email" type="email" class="form-control" placeholder="Enter email address" required />
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
                  <label>Primary Role <span class="required">*</span></label>
                  <select v-model="form.role" class="form-control" required @change="updateRoles">
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="finance">Finance</option>
                    <option value="cashier">Cashier</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="supply_chain">Supply Chain</option>
                  </select>
                </div>
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
              </div>

              <!-- ✅ MULTI-ROLE SELECTION -->
              <div class="form-group">
                <label>Additional Roles</label>
                <div class="role-selector">
                  <div class="selected-roles">
                    <span 
                      v-for="role in form.roles" 
                      :key="role"
                      class="role-badge"
                      :style="{ backgroundColor: getRoleColor(role) + '20', color: getRoleColor(role) }"
                    >
                      <i :class="getRoleIcon(role)"></i>
                      {{ getRoleLabel(role) }}
                      <button 
                        type="button" 
                        @click="removeRole(role)"
                        class="remove-role"
                      >
                        <i class="fas fa-times"></i>
                      </button>
                    </span>
                    <span v-if="form.roles.length === 0" class="no-roles">
                      No additional roles selected
                    </span>
                  </div>
                  <div class="add-role">
                    <select v-model="selectedRoleToAdd" class="form-control">
                      <option value="">Add additional role...</option>
                      <option 
                        v-for="role in availableRoles" 
                        :key="role.value"
                        :value="role.value"
                        :disabled="form.roles.includes(role.value) || form.role === role.value"
                      >
                        {{ role.label }}
                      </option>
                    </select>
                    <button 
                      type="button" 
                      @click="addRole"
                      class="btn-add-role"
                      :disabled="!selectedRoleToAdd"
                    >
                      <i class="fas fa-plus"></i> Add
                    </button>
                  </div>
                </div>
                <small class="help-text">Select additional roles this user should have access to.</small>
              </div>

              <div class="form-group">
                <label>Address</label>
                <textarea v-model="form.address" class="form-control" placeholder="Enter address" rows="2"></textarea>
              </div>

              <div class="form-group password-info">
                <i class="fas fa-info-circle"></i>
                Default password is <strong>"password"</strong>. Employee can change after login.
              </div>

              <div class="form-actions">
                <button type="button" @click="goBack" class="btn btn-secondary">Cancel</button>
                <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                  {{ isSubmitting ? 'Adding...' : 'Add Employee' }}
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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, ROLE_CONFIG } from '@/stores/auth';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
// ✅ FIXED: Import from correct path
import api from '@/api/index.js';
import Swal from 'sweetalert2';

const router = useRouter();
const authStore = useAuthStore();

// State
const isSubmitting = ref(false);
const selectedRoleToAdd = ref('');

// Form
const form = ref({
  full_name: '',
  username: '',
  email: '',
  phone: '',
  role: 'staff',
  roles: [],
  department: 'General',
  address: ''
});

// ============================================
// COMPUTED
// ============================================
const availableRoles = computed(() => {
  return Object.keys(ROLE_CONFIG.roles)
    .filter(key => key !== form.value.role) // Exclude primary role
    .map(key => ({
      value: key,
      label: ROLE_CONFIG.roles[key].label,
      icon: ROLE_CONFIG.roles[key].icon,
      color: ROLE_CONFIG.roles[key].color
    }));
});

// ============================================
// ROLE HELPERS
// ============================================
const getRoleLabel = (roleKey) => {
  return ROLE_CONFIG.roles[roleKey]?.label || roleKey;
};

const getRoleIcon = (roleKey) => {
  return ROLE_CONFIG.roles[roleKey]?.icon || 'fas fa-user';
};

const getRoleColor = (roleKey) => {
  return ROLE_CONFIG.roles[roleKey]?.color || '#6B7280';
};

// ============================================
// METHODS
// ============================================
const updateRoles = () => {
  // Remove primary role from additional roles if present
  form.value.roles = form.value.roles.filter(r => r !== form.value.role);
};

const addRole = () => {
  if (selectedRoleToAdd.value && !form.value.roles.includes(selectedRoleToAdd.value)) {
    form.value.roles.push(selectedRoleToAdd.value);
    selectedRoleToAdd.value = '';
  }
};

const removeRole = (role) => {
  form.value.roles = form.value.roles.filter(r => r !== role);
};

const formatPhoneNumber = () => {
  form.value.phone = form.value.phone.replace(/\D/g, '');
  if (form.value.phone.length > 11) {
    form.value.phone = form.value.phone.slice(0, 11);
  }
};

const handleSubmit = async () => {
  // Validate required fields
  if (!form.value.full_name.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Full name is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }

  if (!form.value.username.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Username is required',
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.value.email)) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Please enter a valid email address',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }

  if (form.value.phone && form.value.phone.length < 11) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Phone number must be at least 11 digits',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }

  isSubmitting.value = true;

  try {
    // Build payload with roles
    const payload = {
      full_name: form.value.full_name,
      username: form.value.username,
      email: form.value.email,
      phone: form.value.phone || '',
      role: form.value.role,
      roles: form.value.roles, // ✅ Send additional roles
      department: form.value.department,
      password: 'password'
    };

    // ✅ FIXED: Use '/users.php' not '/api/users.php'
    // Since baseURL is 'http://localhost/smart-pos-api/api'
    // This will become 'http://localhost/smart-pos-api/api/users.php'
    const response = await api.post('/users.php', payload);

    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Employee Added!',
        text: `${form.value.full_name} has been added successfully with ${form.value.roles.length + 1} role(s).`,
        confirmButtonColor: '#4F46E5',
        timer: 2000,
        showConfirmButton: false
      });
      
      router.push('/hr/employees');
    } else {
      throw new Error(response.data.message || 'Failed to add employee');
    }
  } catch (error) {
    console.error('Error adding employee:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || error.message || 'Failed to add employee. Please try again.',
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    isSubmitting.value = false;
  }
};

const goBack = () => {
  router.push('/hr/employees');
};
</script>

<style scoped>

/* ============================================
   MULTI-ROLE SELECTOR STYLES
   ============================================ */
.role-selector {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  background: #fafafa;
}

body.dark-mode .role-selector {
  background: #2d3748;
  border-color: #374151;
}

.selected-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  min-height: 2.5rem;
  align-items: center;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: #e0e7ff;
  color: #4F46E5;
}

body.dark-mode .role-badge {
  background: #312e81;
  color: #818cf8;
}

.role-badge i {
  font-size: 0.7rem;
}

.remove-role {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  font-size: 0.7rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.remove-role:hover {
  opacity: 1;
}

.no-roles {
  color: #9ca3af;
  font-size: 0.85rem;
  font-style: italic;
}

.add-role {
  display: flex;
  gap: 0.5rem;
}

.add-role .form-control {
  flex: 1;
  padding: 0.4rem 0.75rem;
}

.add-role .form-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-add-role {
  padding: 0.4rem 1rem;
  background: #4F46E5;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-add-role:hover:not(:disabled) {
  background: #4338CA;
}

.btn-add-role:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.help-text {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
}

body.dark-mode .help-text {
  color: #9ca3af;
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .add-role {
    flex-direction: column;
  }
  
  .btn-add-role {
    width: 100%;
    justify-content: center;
  }
}

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

.add-employee-container {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

/* ============================================
   HEADER
   ============================================ */
.add-employee-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.add-employee-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .add-employee-header h2 {
  color: #e2e8f0;
}

.add-employee-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .add-employee-header p {
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

body.dark-mode .btn-back:hover {
  background: #2d3748;
}

/* ============================================
   FORM
   ============================================ */
.add-employee-form {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .add-employee-form {
  background: #1e293b;
}

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

textarea.form-control {
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

.password-info {
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

body.dark-mode .password-info {
  background: #312e81;
  color: #818cf8;
}

.password-info strong {
  color: #4F46E5;
}

body.dark-mode .password-info strong {
  color: #818cf8;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
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

body.dark-mode .btn-secondary:hover {
  background: #374151;
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

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .add-employee-container {
    padding: 1rem;
  }
  
  .add-employee-form {
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
  }
}
</style>