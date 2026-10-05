<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="d-flex justify-content-between align-center mb-4">
          <h4 style="font-weight:700;">Staff Management</h4>
          <button @click="showAddModal = true" class="btn btn-primary">
            <i class="fas fa-plus"></i> Add Staff
          </button>
        </div>
        
        <div class="card">
          <div class="d-flex gap-3 mb-3 flex-wrap">
            <div style="flex:1;min-width:200px;">
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-search"></i></span>
                <input
                  v-model="search"
                  type="text"
                  class="form-control"
                  placeholder="Search staff..."
                  @input="loadStaff"
                />
              </div>
            </div>
            <div style="min-width:150px;">
              <select v-model="roleFilter" class="form-control" @change="loadStaff">
                <option value="">All Roles</option>
                <option value="super_admin">CEO</option>
                <option value="admin">Admin</option>
                <option value="hr">HR</option>
                <option value="finance">Finance</option>
                <option value="cashier">Cashier</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div style="min-width:150px;">
              <select v-model="statusFilter" class="form-control" @change="loadStaff">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deleted">Deleted</option>
              </select>
            </div>
          </div>
          
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="text-center py-4">
                    <i class="fas fa-spinner spin"></i> Loading...
                  </td>
                </tr>
                <tr v-else-if="filteredStaff.length === 0">
                  <td colspan="7" class="text-center text-muted py-4">
                    <i class="fas fa-users" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                    No staff members found
                  </td>
                </tr>
                <tr v-for="staff in filteredStaff" :key="staff.id">
                  <td><strong>{{ staff.full_name }}</strong></td>
                  <td>{{ staff.username }}</td>
                  <td>{{ staff.email || 'N/A' }}</td>
                  <td>
                    <span class="role-badge" :class="'role-' + staff.role">
                      <i :class="getRoleIcon(staff.role)"></i>
                      {{ formatRole(staff.role) }}
                    </span>
                  </td>
                  <td>
                    <span class="status-badge" :class="staff.status === 'active' ? 'status-active' : staff.status === 'deleted' ? 'status-deleted' : 'status-inactive'">
                      <i :class="staff.status === 'active' ? 'fas fa-circle' : staff.status === 'deleted' ? 'fas fa-trash-alt' : 'fas fa-circle'"></i>
                      {{ staff.status === 'deleted' ? 'Deleted' : (staff.status || 'Active') }}
                    </span>
                  </td>
                  <td>{{ formatDate(staff.created_at) }}</td>
                  <td>
                    <button 
                      v-if="staff.status !== 'deleted'"
                      @click="editStaff(staff)" 
                      class="btn btn-primary btn-sm" 
                      title="Edit"
                    >
                      <i class="fas fa-edit"></i>
                    </button>
                    <button 
                      v-if="staff.status === 'active'"
                      @click="toggleStaffStatus(staff.id, 'inactive')" 
                      class="btn btn-warning btn-sm" 
                      style="margin-left:0.25rem;"
                      title="Deactivate"
                    >
                      <i class="fas fa-ban"></i>
                    </button>
                    <button 
                      v-else-if="staff.status === 'inactive'"
                      @click="toggleStaffStatus(staff.id, 'active')" 
                      class="btn btn-success btn-sm" 
                      style="margin-left:0.25rem;"
                      title="Activate"
                    >
                      <i class="fas fa-check-circle"></i>
                    </button>
                    <button 
                      v-if="staff.status !== 'deleted' && staff.id !== 1"
                      @click="deleteStaff(staff.id)" 
                      class="btn btn-danger btn-sm" 
                      style="margin-left:0.25rem;"
                      title="Soft Delete"
                    >
                      <i class="fas fa-trash"></i>
                    </button>
                    <button 
                      v-if="staff.status === 'deleted'"
                      @click="restoreStaff(staff.id)" 
                      class="btn btn-success btn-sm" 
                      style="margin-left:0.25rem;"
                      title="Restore"
                    >
                      <i class="fas fa-undo"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Add/Edit Staff Modal -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h5 style="font-weight:700;">{{ showEditModal ? 'Edit Staff' : 'Add New Staff' }}</h5>
          <button class="modal-close" @click="closeModal">&times;</button>
        </div>
        <form @submit.prevent="saveStaff">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input v-model="form.full_name" type="text" class="form-control" required />
          </div>
          <div class="form-group">
            <label class="form-label">Username *</label>
            <input v-model="form.username" type="text" class="form-control" required />
          </div>
          <div class="form-group" v-if="!showEditModal">
            <label class="form-label">Password</label>
            <div class="password-field">
              <input 
                v-model="form.password" 
                type="text" 
                class="form-control" 
                placeholder="Default: password"
                readonly
              />
              <small class="text-muted">
                <i class="fas fa-info-circle"></i> 
                Default password is <strong>"password"</strong> - User can change after login
              </small>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input v-model="form.email" type="email" class="form-control" />
          </div>
          <div class="form-group">
            <label class="form-label">Role *</label>
            <select v-model="form.role" class="form-control" required>
              <option value="super_admin">CEO</option>
              <option value="admin">Admin</option>
              <option value="hr">HR</option>
              <option value="finance">Finance</option>
              <option value="cashier">Cashier</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div class="form-group" v-if="showEditModal">
            <label class="form-label">Status</label>
            <select v-model="form.status" class="form-control">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
            <button type="submit" class="btn btn-primary">
              {{ showEditModal ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- Delete Confirmation Alert -->
    <AlertModal
      v-model:visible="showDeleteAlert"
      type="danger"
      title="Delete Staff"
      :message="deleteMessage"
      confirm-text="Delete"
      @confirm="confirmDelete"
      @close="showDeleteAlert = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import AlertModal from '@/components/common/AlertModal.vue'
import api from '@/api/index.js'

const staffList = ref([])
const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const loading = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteAlert = ref(false)
const deleteId = ref(null)
const deleteMessage = ref('')

const form = ref({
  id: null,
  full_name: '',
  username: '',
  email: '',
  password: 'password',
  role: 'staff',
  status: 'active'
})

const getRoleIcon = (role) => {
  const icons = {
    'super_admin': 'fas fa-crown',
    'admin': 'fas fa-user-shield',
    'hr': 'fas fa-users-cog',
    'finance': 'fas fa-coins',
    'cashier': 'fas fa-cash-register',
    'staff': 'fas fa-user'
  }
  return icons[role] || 'fas fa-user'
}

const formatRole = (role) => {
  const labels = {
    'super_admin': 'CEO',
    'admin': 'Admin',
    'hr': 'HR',
    'finance': 'Finance',
    'cashier': 'Cashier',
    'staff': 'Staff'
  }
  return labels[role] || role
}

const filteredStaff = computed(() => {
  let result = staffList.value
  
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter(staff => 
      staff.full_name.toLowerCase().includes(s) ||
      staff.username.toLowerCase().includes(s) ||
      (staff.email && staff.email.toLowerCase().includes(s))
    )
  }
  
  if (roleFilter.value) {
    result = result.filter(staff => staff.role === roleFilter.value)
  }
  
  if (statusFilter.value) {
    result = result.filter(staff => staff.status === statusFilter.value)
  }
  
  return result
})

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const loadStaff = async () => {
  loading.value = true
  try {
    const params = {}
    if (search.value) params.search = search.value
    if (roleFilter.value) params.role = roleFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    
    const response = await api.get('/users.php', { params })
    staffList.value = response.data || []
  } catch (error) {
    console.error('Error loading staff:', error)
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  form.value = {
    id: null,
    full_name: '',
    username: '',
    email: '',
    password: 'password',
    role: 'staff',
    status: 'active'
  }
  showAddModal.value = true
}

const saveStaff = async () => {
  try {
    if (showEditModal.value) {
      const updateData = {
        full_name: form.value.full_name,
        username: form.value.username,
        email: form.value.email,
        role: form.value.role,
        status: form.value.status
      }
      await api.put(`/users.php?id=${form.value.id}`, updateData)
      alert('Staff updated successfully!')
    } else {
      const staffData = {
        ...form.value,
        password: 'password'
      }
      await api.post('/users.php', staffData)
      alert(`Staff created successfully!\n\nUsername: ${form.value.username}\nPassword: password\n\nPlease inform the staff to change their password after login.`)
    }
    closeModal()
    loadStaff()
  } catch (error) {
    alert('Error saving staff: ' + (error.response?.data?.message || 'Unknown error'))
  }
}

const editStaff = (staff) => {
  form.value = { ...staff }
  showEditModal.value = true
}

const toggleStaffStatus = async (id, status) => {
  if (!confirm(`Change staff status to ${status}?`)) return
  try {
    await api.put(`/users.php?id=${id}`, { status })
    alert(`Staff ${status === 'active' ? 'activated' : 'deactivated'} successfully!`)
    loadStaff()
  } catch (error) {
    alert('Error updating staff status: ' + (error.response?.data?.message || 'Unknown error'))
  }
}

// Soft Delete - Mark as deleted (not actually removing from database)
const deleteStaff = (id) => {
  const staff = staffList.value.find(s => s.id === id)
  deleteMessage.value = `Are you sure you want to delete "${staff?.full_name}"?\n\nThis will mark the staff as "Deleted" in the system.\nThe data will be archived and can be restored later.`
  deleteId.value = id
  showDeleteAlert.value = true
}

const confirmDelete = async () => {
  showDeleteAlert.value = false
  try {
    await api.put(`/users.php?id=${deleteId.value}`, { status: 'deleted' })
    alert('Staff has been deleted (archived). You can restore it later.')
    loadStaff()
  } catch (error) {
    alert('Error deleting staff: ' + (error.response?.data?.message || 'Unknown error'))
  }
  deleteId.value = null
}

// Restore deleted staff
const restoreStaff = async (id) => {
  if (!confirm('Restore this staff member?')) return
  try {
    await api.put(`/users.php?id=${id}`, { status: 'active' })
    alert('Staff restored successfully!')
    loadStaff()
  } catch (error) {
    alert('Error restoring staff: ' + (error.response?.data?.message || 'Unknown error'))
  }
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  form.value = {
    id: null,
    full_name: '',
    username: '',
    email: '',
    password: 'password',
    role: 'staff',
    status: 'active'
  }
}

onMounted(() => {
  loadStaff()
})
</script>

<style scoped>
.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
}

.role-super_admin {
  background: #FEF3C7;
  color: #92400E;
}
.role-admin {
  background: #DBEAFE;
  color: #1E40AF;
}
.role-hr {
  background: #FCE7F3;
  color: #9D174D;
}
.role-finance {
  background: #D1FAE5;
  color: #065F46;
}
.role-cashier {
  background: #FEF3C7;
  color: #92400E;
}
.role-staff {
  background: #F3F4F6;
  color: #374151;
}

body.dark-mode .role-super_admin {
  background: rgba(245,158,11,0.2);
  color: #FBBF24;
}
body.dark-mode .role-admin {
  background: rgba(59,130,246,0.2);
  color: #60A5FA;
}
body.dark-mode .role-hr {
  background: rgba(236,72,153,0.2);
  color: #F472B6;
}
body.dark-mode .role-finance {
  background: rgba(16,185,129,0.2);
  color: #34D399;
}
body.dark-mode .role-cashier {
  background: rgba(245,158,11,0.2);
  color: #FBBF24;
}
body.dark-mode .role-staff {
  background: rgba(107,114,128,0.2);
  color: #9CA3AF;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-active {
  background: #D1FAE5;
  color: #065F46;
}
.status-inactive {
  background: #FEE2E2;
  color: #991B1B;
}
.status-deleted {
  background: #F3F4F6;
  color: #6B7280;
}

body.dark-mode .status-active {
  background: rgba(16,185,129,0.2);
  color: #34D399;
}
body.dark-mode .status-inactive {
  background: rgba(239,68,68,0.2);
  color: #F87171;
}
body.dark-mode .status-deleted {
  background: rgba(107,114,128,0.2);
  color: #9CA3AF;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { rotate: 360deg; }
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.8rem;
  padding: 0.375rem 0.75rem;
}

.btn-primary {
  background: #4F46E5;
  color: white;
}
.btn-primary:hover {
  background: #4338CA;
}

.btn-warning {
  background: #F59E0B;
  color: white;
}
.btn-warning:hover {
  background: #D97706;
}

.btn-success {
  background: #10B981;
  color: white;
}
.btn-success:hover {
  background: #059669;
}

.btn-danger {
  background: #EF4444;
  color: white;
}
.btn-danger:hover {
  background: #DC2626;
}

.btn-secondary {
  background: #E5E7EB;
  color: #1F2937;
}
.btn-secondary:hover {
  background: #D1D5DB;
}

body.dark-mode .btn-secondary {
  background: #374151;
  color: #E2E8F0;
}
body.dark-mode .btn-secondary:hover {
  background: #4B5563;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--border-light);
  border-radius: 8px;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  background: white;
  color: var(--text-light);
}

body.dark-mode .form-control {
  background: #2D3748;
  border-color: var(--border-dark);
  color: var(--text-dark);
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

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
}

.form-group {
  margin-bottom: 1rem;
}

.password-field .form-control {
  background: #f3f4f6;
  cursor: not-allowed;
}

body.dark-mode .password-field .form-control {
  background: #2D3748;
}

.text-muted {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.text-muted strong {
  color: var(--primary);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

body.dark-mode .modal-content {
  background: var(--bg-card);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 1rem;
}

body.dark-mode .modal-header {
  border-bottom-color: var(--border-dark);
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted);
  transition: color 0.2s ease;
}

.modal-close:hover {
  color: var(--danger);
}

.modal-footer {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid var(--border-light);
  margin-top: 1rem;
}

body.dark-mode .modal-footer {
  border-top-color: var(--border-dark);
}

.input-group {
  display: flex;
  align-items: stretch;
}

.input-group .form-control {
  flex: 1;
}

.input-group .input-group-text {
  display: flex;
  align-items: center;
  padding: 0 0.875rem;
  background: var(--bg-light);
  border: 2px solid var(--border-light);
  border-right: none;
  border-radius: 8px 0 0 8px;
  color: var(--text-muted);
}

body.dark-mode .input-group .input-group-text {
  background: #2D3748;
  border-color: var(--border-dark);
  color: #9CA3AF;
}

.input-group .form-control {
  border-radius: 0 8px 8px 0;
}

.card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow-lg);
  border: none;
}

body.dark-mode .card {
  background: var(--bg-card);
}

.table-responsive {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th {
  text-align: left;
  padding: 0.75rem 0.5rem;
  font-weight: 600;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-light);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table td {
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid var(--border-light);
}

body.dark-mode .table th {
  border-bottom-color: var(--border-dark);
}
body.dark-mode .table td {
  border-bottom-color: var(--border-dark);
}

.table-hover tbody tr:hover {
  background: var(--bg-light);
}

body.dark-mode .table-hover tbody tr:hover {
  background: rgba(255,255,255,0.03);
}
</style>