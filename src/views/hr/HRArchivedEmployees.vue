<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="archived-container">
          <!-- Header -->
          <div class="archived-header">
            <div>
              <h2><i class="fas fa-archive"></i> Archived Employees</h2>
              <p>Manage and restore archived employee records</p>
            </div>
            <div class="header-actions">
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
              <button @click="exportData" class="btn-export">
                <i class="fas fa-file-export"></i> Export
              </button>
            </div>
          </div>

          <!-- Stats -->
          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-label">Total Archived</span>
              <span class="stat-value">{{ archivedEmployees.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Restored This Month</span>
              <span class="stat-value">{{ restoredThisMonth }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Avg Archive Age (days)</span>
              <span class="stat-value">{{ avgArchiveAge }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Pending Reviews</span>
              <span class="stat-value">0</span>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-section">
            <div class="filter-group">
              <label>Search</label>
              <input v-model="searchQuery" class="form-control" placeholder="Search by name, email, or position..." @input="loadArchived" />
            </div>
            <div class="filter-group">
              <label>Department</label>
              <select v-model="filterDepartment" class="form-control" @change="loadArchived">
                <option value="">All Departments</option>
                <option v-for="dept in departments" :key="dept" :value="dept">
                  {{ dept }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>Archive Date</label>
              <input v-model="filterDate" type="date" class="form-control" @change="loadArchived" />
            </div>
            <div class="filter-group">
              <button @click="loadArchived" class="btn-filter">
                <i class="fas fa-search"></i> Apply Filters
              </button>
            </div>
          </div>

          <!-- Archived Table -->
          <div class="archived-table-wrapper">
            <table class="archived-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>POSITION</th>
                  <th>DEPARTMENT</th>
                  <th>ARCHIVED DATE</th>
                  <th>ARCHIVE REASON</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="text-center">
                    <i class="fas fa-spinner spin"></i> Loading...
                  </td>
                </tr>
                <tr v-else-if="filteredArchived.length === 0">
                  <td colspan="7" class="text-center">
                    <div class="empty-state">
                      <i class="fas fa-box-open"></i>
                      <p>No archived employees found</p>
                      <span class="empty-hint">Employees will appear here after they are archived</span>
                    </div>
                  </td>
                </tr>
                <tr v-for="employee in filteredArchived" :key="employee.id">
                  <td>
                    <div class="employee-info">
                      <span class="employee-name">{{ employee.full_name }}</span>
                      <span class="employee-email">{{ employee.email }}</span>
                    </div>
                  </td>
                  <td>
                    <span :class="getRoleClass(employee.role)">
                      {{ getRoleLabel(employee.role) }}
                    </span>
                  </td>
                  <td>{{ employee.department || 'General' }}</td>
                  <td>{{ formatDate(employee.archived_at || employee.created_at) }}</td>
                  <td>
                    <span class="archive-reason">Voluntary</span>
                  </td>
                  <td>
                    <span class="status-archived">ARCHIVED</span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button @click="restoreEmployee(employee.id)" class="btn-restore" title="Restore Employee">
                        <i class="fas fa-undo"></i> Restore
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="archived-footer">
            <span>Showing <strong>{{ filteredArchived.length }}</strong> archived employees</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Sidebar from '../components/common/Sidebar.vue';
import Navbar from '../components/common/Navbar.vue';
import api from '@/api/index.js';
import Swal from 'sweetalert2';

const router = useRouter();
const authStore = useAuthStore();

// State
const archivedEmployees = ref([]);
const loading = ref(false);
const isRefreshing = ref(false);
const searchQuery = ref('');
const filterDepartment = ref('');
const filterDate = ref('');

// ============================================
// COMPUTED
// ============================================
const departments = computed(() => {
  const depts = new Set();
  archivedEmployees.value.forEach(e => {
    if (e.department) depts.add(e.department);
  });
  return Array.from(depts);
});

const filteredArchived = computed(() => {
  let result = archivedEmployees.value;
  
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
  
  if (filterDate.value) {
    const date = new Date(filterDate.value).toDateString();
    result = result.filter(e => {
      const empDate = new Date(e.archived_at || e.created_at).toDateString();
      return empDate === date;
    });
  }
  
  return result;
});

const restoredThisMonth = computed(() => {
  // This would need a restoration log table
  return 0;
});

const avgArchiveAge = computed(() => {
  if (archivedEmployees.value.length === 0) return 0;
  const now = new Date();
  let totalDays = 0;
  archivedEmployees.value.forEach(e => {
    const archiveDate = new Date(e.archived_at || e.created_at);
    const days = Math.floor((now - archiveDate) / (1000 * 60 * 60 * 24));
    totalDays += days;
  });
  return Math.round(totalDays / archivedEmployees.value.length);
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

const getRoleLabel = (role) => {
  const labels = {
    'admin': 'ADMIN',
    'hr': 'HR',
    'finance': 'FINANCE',
    'staff': 'STAFF',
    'cashier': 'CASHIER',
    'ceo': 'CEO',
    'super_admin': 'SUPER ADMIN'
  };
  return labels[role] || role || 'STAFF';
};

const getRoleClass = (role) => {
  const classes = {
    'admin': 'role-admin',
    'ceo': 'role-ceo',
    'hr': 'role-hr',
    'finance': 'role-finance',
    'staff': 'role-staff',
    'cashier': 'role-cashier',
    'super_admin': 'role-super-admin'
  };
  return classes[role] || 'role-staff';
};

// ============================================
// ✅ LOAD ARCHIVED EMPLOYEES
// ============================================
const loadArchived = async () => {
  loading.value = true;
  try {
    // Fetch ONLY archived employees
    const response = await api.get('/api/users.php?status=archived');
    
    console.log('📊 Archived employees response:', response.data);
    
    if (Array.isArray(response.data)) {
      archivedEmployees.value = response.data;
      console.log(`✅ Found ${archivedEmployees.value.length} archived employees`);
    } else {
      archivedEmployees.value = [];
    }
  } catch (error) {
    console.error('❌ Error loading archived employees:', error);
    archivedEmployees.value = [];
  } finally {
    loading.value = false;
  }
};

// ============================================
// ✅ RESTORE EMPLOYEE
// ============================================
const restoreEmployee = async (id) => {
  const result = await Swal.fire({
    title: 'Restore Employee?',
    text: 'Are you sure you want to restore this employee? They will be moved back to active employees.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Restore',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      // Show loading
      Swal.fire({
        title: 'Restoring...',
        text: 'Please wait',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const response = await api.put(`/api/users.php?id=${id}`, { status: 'active' });
      
      console.log('✅ Restore response:', response.data);
      
      Swal.close();
      
      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Restored!',
          text: 'Employee has been restored successfully.',
          confirmButtonColor: '#4F46E5',
          timer: 1500,
          showConfirmButton: false
        });
        // Reload the archived list
        await loadArchived();
      } else {
        throw new Error(response.data.message || 'Failed to restore');
      }
    } catch (error) {
      console.error('❌ Error restoring employee:', error);
      Swal.close();
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to restore employee. Please try again.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

// ============================================
// EXPORT DATA
// ============================================
const exportData = async () => {
  await Swal.fire({
    icon: 'info',
    title: 'Export Data',
    text: 'Export feature coming soon!',
    confirmButtonColor: '#4F46E5'
  });
};

const refreshData = async () => {
  isRefreshing.value = true;
  await loadArchived();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadArchived();
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

.archived-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* ============================================
   HEADER
   ============================================ */
.archived-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.archived-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .archived-header h2 {
  color: #e2e8f0;
}

.archived-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .archived-header p {
  color: #9ca3af;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
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

body.dark-mode .btn-refresh:hover {
  background: #2d3748;
}

.btn-export {
  background: #10B981;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-export:hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16,185,129,0.3);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============================================
   STATS
   ============================================ */
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

/* ============================================
   FILTERS
   ============================================ */
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

/* ============================================
   TABLE
   ============================================ */
.archived-table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .archived-table-wrapper {
  background: #1e293b;
}

.archived-table {
  width: 100%;
  border-collapse: collapse;
}

.archived-table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .archived-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.archived-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .archived-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.archived-table tr:last-child td {
  border-bottom: none;
}

.archived-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .archived-table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

/* ============================================
   EMPLOYEE INFO
   ============================================ */
.employee-info {
  display: flex;
  flex-direction: column;
}

.employee-name {
  font-weight: 600;
  color: #1a1a2e;
}

body.dark-mode .employee-name {
  color: #e2e8f0;
}

.employee-email {
  font-size: 0.7rem;
  color: #6b7280;
}

body.dark-mode .employee-email {
  color: #9ca3af;
}

.archive-reason {
  font-size: 0.8rem;
  color: #6b7280;
}

body.dark-mode .archive-reason {
  color: #9ca3af;
}

/* ============================================
   ROLES
   ============================================ */
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

.role-ceo {
  background: #fef3c7;
  color: #92400e;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .role-ceo {
  background: #78350f;
  color: #fcd34d;
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

/* ============================================
   STATUS
   ============================================ */
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

/* ============================================
   ACTIONS
   ============================================ */
.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-restore {
  background: #10B981;
  color: white;
  border: none;
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.btn-restore:hover {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16,185,129,0.3);
}

/* ============================================
   EMPTY STATE
   ============================================ */
.empty-state {
  text-align: center;
  padding: 2rem 1rem;
}

.empty-state i {
  font-size: 3rem;
  color: #d1d5db;
  display: block;
  margin-bottom: 1rem;
}

body.dark-mode .empty-state i {
  color: #374151;
}

.empty-state p {
  font-size: 1.1rem;
  color: #6b7280;
  margin: 0 0 0.25rem 0;
}

body.dark-mode .empty-state p {
  color: #9ca3af;
}

.empty-hint {
  font-size: 0.85rem;
  color: #9ca3af;
}

body.dark-mode .empty-hint {
  color: #6b7280;
}

/* ============================================
   FOOTER
   ============================================ */
.archived-footer {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .archived-footer {
  background: #1e293b;
  color: #9ca3af;
}

.archived-footer strong {
  color: #1a1a2e;
}

body.dark-mode .archived-footer strong {
  color: #e2e8f0;
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .archived-container {
    padding: 1rem;
  }
  
  .archived-header {
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
  
  .archived-table-wrapper {
    overflow-x: auto;
  }
  
  .archived-table {
    font-size: 0.8rem;
    min-width: 700px;
  }
}
</style>