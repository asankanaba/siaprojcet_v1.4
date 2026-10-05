<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="employees-container">
          <!-- Header -->
          <div class="employees-header">
            <div>
              <h2><i class="fas fa-users"></i> Employees</h2>
              <p>Manage employee records and information</p>
            </div>
            <div class="header-actions">
              <router-link to="/hr/add-employee" class="btn-add">
                <i class="fas fa-plus"></i> Add Employee
              </router-link>
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-section">
            <div class="filter-group">
              <label>Search</label>
              <input v-model="searchQuery" class="form-control" placeholder="Search by name, email, or position..." @input="loadEmployees" />
            </div>
            <div class="filter-group">
              <label>Department</label>
              <select v-model="filterDepartment" class="form-control" @change="loadEmployees">
                <option value="">All Departments</option>
                <option v-for="dept in departments" :key="dept" :value="dept">
                  {{ dept }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>Role</label>
              <select v-model="filterRole" class="form-control" @change="loadEmployees">
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
                <option value="supply_chain">Supply Chain</option>
                <option value="staff">Staff</option>
                <option value="cashier">Cashier</option>
              </select>
            </div>
            <div class="filter-group">
              <button @click="loadEmployees" class="btn-filter">
                <i class="fas fa-search"></i> Apply Filters
              </button>
            </div>
          </div>

          <!-- Stats -->
          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-label">Total Employees</span>
              <span class="stat-value">{{ employees.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Active</span>
              <span class="stat-value">{{ activeCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Archived</span>
              <span class="stat-value">{{ archivedCount }}</span>
            </div>
            <div class="stat-item">
              <router-link to="/hr/archived" class="stat-link">
                View Archived →
              </router-link>
            </div>
          </div>

          <!-- Employees Table -->
          <div class="employees-table-wrapper">
            <table class="employees-table">
              <thead>
                <tr>
                  <th>FULL NAME</th>
                  <th>USERNAME</th>
                  <th>EMAIL</th>
                  <th>PHONE</th>
                  <th>ROLES</th>
                  <th>STATUS</th>
                  <th>JOINED</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="8" class="text-center">
                    <i class="fas fa-spinner spin"></i> Loading...
                  </td>
                </tr>
                <tr v-else-if="filteredEmployees.length === 0">
                  <td colspan="8" class="text-center">No employees found</td>
                </tr>
                <tr v-for="employee in filteredEmployees" :key="employee.id">
                  <td>{{ employee.full_name }}</td>
                  <td>{{ employee.username }}</td>
                  <td>{{ employee.email }}</td>
                  <td>{{ employee.phone || 'N/A' }}</td>
                  <td>
                    <div class="roles-cell">
                      <!-- Primary Role -->
                      <span :class="getRoleClass(employee.role)">
                        {{ getRoleLabel(employee.role) }}
                      </span>
                      <!-- Additional Roles -->
                      <span 
                        v-for="role in getAdditionalRoles(employee)" 
                        :key="role"
                        class="role-additional"
                        :style="{ 
                          backgroundColor: getRoleColor(role) + '30', 
                          color: getRoleColor(role),
                          borderColor: getRoleColor(role)
                        }"
                      >
                        {{ getRoleLabel(role) }}
                      </span>
                      <span v-if="getAdditionalRoles(employee).length > 0" class="role-count">
                        +{{ getAdditionalRoles(employee).length }}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span :class="getStatusClass(employee.status)">
                      {{ (employee.status || 'ACTIVE').toUpperCase() }}
                    </span>
                  </td>
                  <td>{{ formatDate(employee.created_at) }}</td>
                  <td>
                    <div class="action-buttons">
                      <button @click="openEditModal(employee)" class="btn-edit" title="Edit Employee">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button 
                        v-if="employee.status !== 'archived'"
                        @click="archiveEmployee(employee.id)" 
                        class="btn-archive" 
                        title="Archive Employee"
                      >
                        <i class="fas fa-archive"></i>
                      </button>
                      <button 
                        v-else
                        @click="restoreEmployee(employee.id)" 
                        class="btn-restore" 
                        title="Restore Employee"
                      >
                        <i class="fas fa-undo"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="employees-footer">
            <span>Showing <strong>{{ filteredEmployees.length }}</strong> employees</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit Employee Modal with Multi-Role Support -->
  <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-user-edit"></i> Edit Employee</h5>
        <button @click="closeEditModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Full Name <span class="required">*</span></label>
          <input v-model="editForm.full_name" type="text" class="form-control" placeholder="Enter full name" />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input v-model="editForm.username" type="text" class="form-control" disabled />
        </div>
        <div class="form-group">
          <label>Email <span class="required">*</span></label>
          <input v-model="editForm.email" type="email" class="form-control" placeholder="Enter email address" />
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input 
            v-model="editForm.phone" 
            type="tel" 
            class="form-control" 
            placeholder="Enter phone number"
            @input="formatPhoneNumber"
            maxlength="11"
          />
        </div>
        <div class="form-group">
          <label>Primary Role <span class="required">*</span></label>
          <select v-model="editForm.role" class="form-control" @change="updateRoles">
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
            <option value="finance">Finance</option>
            <option value="supply_chain">Supply Chain</option>
            <option value="staff">Staff</option>
            <option value="cashier">Cashier</option>
          </select>
        </div>

        <!-- ✅ MULTI-ROLE SELECTION -->
        <div class="form-group">
          <label>Additional Roles</label>
          <div class="role-selector">
            <div class="selected-roles">
              <span 
                v-for="role in editForm.roles" 
                :key="role"
                class="role-badge"
                :style="{ 
                  backgroundColor: getRoleColor(role) + '20', 
                  color: getRoleColor(role) 
                }"
              >
                <i :class="getRoleIcon(role)"></i>
                {{ getRoleLabel(role) }}
                <button 
                  type="button" 
                  @click="removeRole(role)"
                  class="remove-role"
                  title="Remove this role"
                >
                  <i class="fas fa-times"></i>
                </button>
              </span>
              <span v-if="editForm.roles.length === 0" class="no-roles">
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
                  :disabled="editForm.roles.includes(role.value) || editForm.role === role.value"
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
          <small class="help-text">
            <i class="fas fa-info-circle"></i>
            Combined access: <strong>{{ combinedRolesCount }} role(s)</strong>
          </small>
        </div>

        <!-- ✅ ROLES SUMMARY -->
        <div class="roles-summary" v-if="allRoles.length > 0">
          <h5><i class="fas fa-user-tag"></i> Role Summary</h5>
          <div class="role-tags">
            <span 
              v-for="role in allRoles" 
              :key="role"
              class="role-tag"
              :class="{ 'primary-role': role === editForm.role }"
              :style="{ 
                borderColor: getRoleColor(role),
                color: getRoleColor(role)
              }"
            >
              <i :class="getRoleIcon(role)"></i>
              {{ getRoleLabel(role) }}
              <span v-if="role === editForm.role" class="primary-badge">Primary</span>
              <span v-else class="additional-badge">Additional</span>
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>Department</label>
          <select v-model="editForm.department" class="form-control">
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
          <label>Status</label>
          <select v-model="editForm.status" class="form-control">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeEditModal" class="btn btn-secondary">Cancel</button>
        <button @click="updateEmployee" class="btn btn-primary" :disabled="isSavingEdit">
          {{ isSavingEdit ? 'Updating...' : 'Update Employee' }}
        </button>
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

// State
const employees = ref([]);
const loading = ref(false);
const isRefreshing = ref(false);
const searchQuery = ref('');
const filterDepartment = ref('');
const filterRole = ref('');
const showEditModal = ref(false);
const isSavingEdit = ref(false);
const selectedRoleToAdd = ref('');

// Edit Form
const editForm = ref({
  id: null,
  full_name: '',
  username: '',
  email: '',
  phone: '',
  role: 'staff',
  roles: [],
  department: 'General',
  status: 'active'
});

// ============================================
// COMPUTED
// ============================================
const activeCount = computed(() => {
  return employees.value.filter(e => e.status !== 'archived').length;
});

const archivedCount = computed(() => {
  return employees.value.filter(e => e.status === 'archived').length;
});

const departments = computed(() => {
  const depts = new Set();
  employees.value.forEach(e => {
    if (e.department) depts.add(e.department);
  });
  return Array.from(depts);
});

const filteredEmployees = computed(() => {
  let result = employees.value;
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(e => 
      e.full_name.toLowerCase().includes(query) ||
      e.email.toLowerCase().includes(query) ||
      e.username.toLowerCase().includes(query)
    );
  }
  
  if (filterDepartment.value) {
    result = result.filter(e => e.department === filterDepartment.value);
  }
  
  if (filterRole.value) {
    result = result.filter(e => e.role === filterRole.value);
  }
  
  return result;
});

// Multi-role computed properties
const allRoles = computed(() => {
  const roles = [editForm.value.role];
  editForm.value.roles.forEach(r => {
    if (!roles.includes(r)) roles.push(r);
  });
  return roles;
});

const combinedRolesCount = computed(() => allRoles.value.length);

const availableRoles = computed(() => {
  return Object.keys(ROLE_CONFIG.roles)
    .filter(key => key !== editForm.value.role && !editForm.value.roles.includes(key))
    .map(key => ({
      value: key,
      label: ROLE_CONFIG.roles[key].label,
      icon: ROLE_CONFIG.roles[key].icon,
      color: ROLE_CONFIG.roles[key].color
    }));
});

// ============================================
// HELPERS
// ============================================
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatPhoneNumber = () => {
  editForm.value.phone = editForm.value.phone.replace(/\D/g, '');
  if (editForm.value.phone.length > 11) {
    editForm.value.phone = editForm.value.phone.slice(0, 11);
  }
};

const getRoleLabel = (role) => {
  return ROLE_CONFIG.roles[role]?.label || role || 'STAFF';
};

const getRoleIcon = (role) => {
  return ROLE_CONFIG.roles[role]?.icon || 'fas fa-user';
};

const getRoleColor = (role) => {
  return ROLE_CONFIG.roles[role]?.color || '#6B7280';
};

const getRoleClass = (role) => {
  const classes = {
    'super_admin': 'role-super-admin',
    'admin': 'role-admin',
    'hr': 'role-hr',
    'finance': 'role-finance',
    'supply_chain': 'role-supply-chain',
    'staff': 'role-staff',
    'cashier': 'role-cashier'
  };
  return classes[role] || 'role-staff';
};

const getAdditionalRoles = (employee) => {
  if (!employee.roles) return [];
  let roles = [];
  if (typeof employee.roles === 'string') {
    try {
      roles = JSON.parse(employee.roles);
    } catch (e) {
      roles = [];
    }
  } else if (Array.isArray(employee.roles)) {
    roles = employee.roles;
  }
  // Filter out primary role
  return roles.filter(r => r !== employee.role);
};

const getStatusClass = (status) => {
  if (status === 'archived') return 'status-archived';
  return 'status-active';
};

// ============================================
// ROLE METHODS FOR EDIT MODAL
// ============================================
const updateRoles = () => {
  editForm.value.roles = editForm.value.roles.filter(r => r !== editForm.value.role);
};

const addRole = () => {
  if (selectedRoleToAdd.value && !editForm.value.roles.includes(selectedRoleToAdd.value)) {
    editForm.value.roles.push(selectedRoleToAdd.value);
    selectedRoleToAdd.value = '';
  }
};

const removeRole = (role) => {
  editForm.value.roles = editForm.value.roles.filter(r => r !== role);
};

// ============================================
// LOAD EMPLOYEES
// ============================================
const loadEmployees = async () => {
  loading.value = true;
  try {
    let url = '/users.php';
    const params = new URLSearchParams();
    if (searchQuery.value) params.append('search', searchQuery.value);
    if (filterDepartment.value) params.append('department', filterDepartment.value);
    if (filterRole.value) params.append('role', filterRole.value);
    if (params.toString()) url += '?' + params.toString();
    
    const response = await api.get(url);
    if (Array.isArray(response.data)) {
      employees.value = response.data;
    }
  } catch (error) {
    console.error('Error loading employees:', error);
  } finally {
    loading.value = false;
  }
};

// ============================================
// EDIT EMPLOYEE
// ============================================
const openEditModal = (employee) => {
  // Parse roles
  let roles = [];
  if (employee.roles) {
    if (typeof employee.roles === 'string') {
      try {
        roles = JSON.parse(employee.roles);
      } catch (e) {
        roles = [];
      }
    } else if (Array.isArray(employee.roles)) {
      roles = employee.roles;
    }
  }
  // Remove primary role from additional roles
  roles = roles.filter(r => r !== employee.role);
  
  editForm.value = {
    id: employee.id,
    full_name: employee.full_name || '',
    username: employee.username || '',
    email: employee.email || '',
    phone: employee.phone || '',
    role: employee.role || 'staff',
    roles: roles,
    department: employee.department || 'General',
    status: employee.status || 'active'
  };
  selectedRoleToAdd.value = '';
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editForm.value = {
    id: null,
    full_name: '',
    username: '',
    email: '',
    phone: '',
    role: 'staff',
    roles: [],
    department: 'General',
    status: 'active'
  };
  selectedRoleToAdd.value = '';
};

// ============================================
// UPDATE EMPLOYEE
// ============================================
const updateEmployee = async () => {
  if (!editForm.value.full_name.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Full name is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  if (!editForm.value.email.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Email is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  if (editForm.value.phone && editForm.value.phone.length < 11) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Phone number must be at least 11 digits',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  isSavingEdit.value = true;
  
  try {
    const payload = {
      full_name: editForm.value.full_name,
      email: editForm.value.email,
      phone: editForm.value.phone || '',
      role: editForm.value.role,
      roles: editForm.value.roles, // ✅ Send additional roles
      department: editForm.value.department,
      status: editForm.value.status
    };
    
    console.log('📤 Updating employee with payload:', payload);
    
    const response = await api.put(`/users.php?id=${editForm.value.id}`, payload);
    
    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: `Employee has been updated with ${combinedRolesCount.value} role(s).`,
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
      closeEditModal();
      await loadEmployees();
    }
  } catch (error) {
    console.error('Error updating employee:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to update employee.',
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    isSavingEdit.value = false;
  }
};

// ============================================
// ARCHIVE EMPLOYEE
// ============================================
const archiveEmployee = async (id) => {
  const result = await Swal.fire({
    title: 'Archive Employee?',
    text: 'Are you sure you want to archive this employee?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#F59E0B',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Archive',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      await api.put(`/users.php?id=${id}`, { status: 'archived' });
      await Swal.fire({
        icon: 'success',
        title: 'Archived!',
        text: 'Employee has been archived.',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
      await loadEmployees();
    } catch (error) {
      console.error('Error archiving employee:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to archive employee.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

// ============================================
// RESTORE EMPLOYEE
// ============================================
const restoreEmployee = async (id) => {
  const result = await Swal.fire({
    title: 'Restore Employee?',
    text: 'Are you sure you want to restore this employee?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Restore',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      await api.put(`/users.php?id=${id}`, { status: 'active' });
      await Swal.fire({
        icon: 'success',
        title: 'Restored!',
        text: 'Employee has been restored.',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
      await loadEmployees();
    } catch (error) {
      console.error('Error restoring employee:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to restore employee.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

// ============================================
// REFRESH
// ============================================
const refreshData = async () => {
  isRefreshing.value = true;
  await loadEmployees();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadEmployees();
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

.employees-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.employees-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.employees-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .employees-header h2 {
  color: #e2e8f0;
}

.employees-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .employees-header p {
  color: #9ca3af;
}

.btn-add {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  text-decoration: none;
}

.btn-add:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}

.btn-refresh {
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

body.dark-mode .btn-refresh {
  background: #1e293b;
  border-color: #374151;
  color: #e2e8f0;
}

.btn-refresh:hover {
  background: #f9fafb;
  border-color: #4F46E5;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.filters-section {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

body.dark-mode .filters-section {
  background: #1e293b;
}

.filter-group {
  flex: 1;
  min-width: 150px;
}

.filter-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

body.dark-mode .filter-group label {
  color: #9ca3af;
}

.form-control {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.85rem;
  background: white;
  color: #1f2937;
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

.btn-filter {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.4rem 1.2rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 40px;
}

.btn-filter:hover {
  background: #4338CA;
}

.stats-row {
  display: flex;
  gap: 2rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 10px;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  flex-wrap: wrap;
}

body.dark-mode .stats-row {
  background: #1e293b;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.8rem;
  color: #6b7280;
}

body.dark-mode .stat-label {
  color: #9ca3af;
}

.stat-value {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
}

body.dark-mode .stat-value {
  color: #e2e8f0;
}

.stat-link {
  color: #4F46E5;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.85rem;
}

.stat-link:hover {
  color: #4338CA;
  text-decoration: underline;
}

.employees-table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .employees-table-wrapper {
  background: #1e293b;
}

.employees-table {
  width: 100%;
  border-collapse: collapse;
}

.employees-table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .employees-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.employees-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .employees-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.employees-table tr:last-child td {
  border-bottom: none;
}

.employees-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .employees-table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

/* ============================================
   ROLES CELL STYLES
============================================ */
.roles-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.role-additional {
  font-size: 0.6rem;
  padding: 0.1rem 0.4rem;
  border-radius: 50px;
  font-weight: 600;
  border: 1px solid;
  display: inline-block;
}

.role-count {
  font-size: 0.6rem;
  background: #e5e7eb;
  color: #6b7280;
  padding: 0.1rem 0.4rem;
  border-radius: 50px;
  font-weight: 700;
}

body.dark-mode .role-count {
  background: #374151;
  color: #9ca3af;
}

/* Role Styles */
.role-super-admin {
  background: #ede9fe;
  color: #5b21b6;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .role-super-admin {
  background: #4c1d95;
  color: #a78bfa;
}

.role-admin {
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .role-admin {
  background: #312e81;
  color: #818cf8;
}

.role-hr {
  background: #fce7f3;
  color: #831843;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .role-hr {
  background: #831843;
  color: #f9a8d4;
}

.role-finance {
  background: #d1fae5;
  color: #065f46;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .role-finance {
  background: #064e3b;
  color: #6ee7b7;
}

.role-supply-chain {
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .role-supply-chain {
  background: #312e81;
  color: #818cf8;
}

.role-staff {
  background: #f3f4f6;
  color: #374151;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .role-staff {
  background: #2d3748;
  color: #9ca3af;
}

.role-cashier {
  background: #fef3c7;
  color: #92400e;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .role-cashier {
  background: #78350f;
  color: #fcd34d;
}

.status-active {
  background: #d1fae5;
  color: #065f46;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-active {
  background: #064e3b;
  color: #6ee7b7;
}

.status-archived {
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-archived {
  background: #374151;
  color: #9ca3af;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-edit {
  background: none;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-edit:hover {
  background: #eef2ff;
}

body.dark-mode .btn-edit:hover {
  background: #312e81;
}

.btn-archive {
  background: none;
  border: none;
  color: #F59E0B;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-archive:hover {
  background: #fef3c7;
}

body.dark-mode .btn-archive:hover {
  background: #78350f;
}

.btn-restore {
  background: none;
  border: none;
  color: #10B981;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-restore:hover {
  background: #d1fae5;
}

body.dark-mode .btn-restore:hover {
  background: #064e3b;
}

.employees-footer {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .employees-footer {
  background: #1e293b;
  color: #9ca3af;
}

.employees-footer strong {
  color: #1a1a2e;
}

body.dark-mode .employees-footer strong {
  color: #e2e8f0;
}

/* ============================================
   MODAL STYLES
============================================ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 550px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideDown 0.3s ease;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

body.dark-mode .modal-content {
  background: #1e293b;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}

@keyframes slideDown {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .modal-header {
  border-bottom-color: #2d3748;
}

.modal-header h5 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .modal-header h5 {
  color: #e2e8f0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  transition: color 0.2s;
}

body.dark-mode .btn-close {
  color: #9ca3af;
}

.btn-close:hover {
  color: #1f2937;
}

body.dark-mode .btn-close:hover {
  color: #e2e8f0;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body .form-group {
  margin-bottom: 1rem;
}

.required {
  color: #ef4444;
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

.modal-footer {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

body.dark-mode .modal-footer {
  border-top-color: #2d3748;
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
   MULTI-ROLE SELECTOR - MODAL STYLES
============================================ */
.role-selector {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem;
  background: #fafafa;
}

body.dark-mode .role-selector {
  background: #2d3748;
  border-color: #374151;
}

.selected-roles {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
  min-height: 2rem;
  align-items: center;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.6rem;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 600;
  background: #e0e7ff;
  color: #4F46E5;
}

body.dark-mode .role-badge {
  background: #312e81;
  color: #818cf8;
}

.role-badge i {
  font-size: 0.65rem;
}

.remove-role {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  font-size: 0.65rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.remove-role:hover {
  opacity: 1;
}

.no-roles {
  color: #9ca3af;
  font-size: 0.75rem;
  font-style: italic;
}

.add-role {
  display: flex;
  gap: 0.5rem;
}

.add-role .form-control {
  flex: 1;
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.btn-add-role {
  padding: 0.3rem 0.8rem;
  background: #4F46E5;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.75rem;
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
  margin-top: 0.4rem;
  font-size: 0.7rem;
  color: #6b7280;
}

body.dark-mode .help-text {
  color: #9ca3af;
}

.help-text strong {
  color: #4F46E5;
}

body.dark-mode .help-text strong {
  color: #818cf8;
}

/* ============================================
   ROLES SUMMARY - MODAL STYLES
============================================ */
.roles-summary {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

body.dark-mode .roles-summary {
  background: #0f172a;
  border-color: #374151;
}

.roles-summary h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.75rem;
  color: #1f2937;
}

body.dark-mode .roles-summary h5 {
  color: #e2e8f0;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.role-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  border: 2px solid;
  background: white;
}

body.dark-mode .role-tag {
  background: #1e293b;
}

.role-tag.primary-role {
  border-color: #4F46E5;
  color: #4F46E5;
  background: #e0e7ff;
}

body.dark-mode .role-tag.primary-role {
  background: #312e81;
  color: #818cf8;
}

.primary-badge {
  font-size: 0.5rem;
  background: #4F46E5;
  color: white;
  padding: 0.05rem 0.3rem;
  border-radius: 8px;
  font-weight: 700;
}

.additional-badge {
  font-size: 0.5rem;
  background: #6b7280;
  color: white;
  padding: 0.05rem 0.3rem;
  border-radius: 8px;
  font-weight: 700;
}

/* ============================================
   RESPONSIVE
============================================ */
@media (max-width: 768px) {
  .employees-container {
    padding: 1rem;
  }
  
  .employees-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .filter-group {
    min-width: 100%;
  }
  
  .stats-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .employees-table-wrapper {
    overflow-x: auto;
  }
  
  .employees-table {
    font-size: 0.8rem;
    min-width: 700px;
  }
  
  .modal-content {
    margin: 1rem;
    max-width: 100%;
  }
  
  .roles-cell {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .add-role {
    flex-direction: column;
  }
  
  .btn-add-role {
    width: 100%;
    justify-content: center;
  }
}
</style>