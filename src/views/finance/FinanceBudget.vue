<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="budget-container">
          <!-- Header -->
          <div class="budget-header">
            <div>
              <h2><i class="fas fa-coins"></i> Budget Management</h2>
              <p>Create and manage departmental budgets</p>
            </div>
            <div class="header-actions">
              <button @click="openAddBudget" class="btn-add">
                <i class="fas fa-plus"></i> New Budget
              </button>
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-icon" style="background: #d1fae5; color: #10b981;">
                <i class="fas fa-wallet"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Total Budget</p>
                <p class="summary-value">{{ formatCurrency(totalBudget) }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #fee2e2; color: #ef4444;">
                <i class="fas fa-arrow-up"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Total Spent</p>
                <p class="summary-value">{{ formatCurrency(totalSpent) }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #fef3c7; color: #f59e0b;">
                <i class="fas fa-percent"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Overall Usage</p>
                <p class="summary-value">{{ overallUsage }}%</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #e0e7ff; color: #4F46E5;">
                <i class="fas fa-layer-group"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Total Departments</p>
                <p class="summary-value">{{ totalDepartments }}</p>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-section">
            <div class="filter-group">
              <label>Department</label>
              <select v-model="filterDepartment" class="form-control" @change="loadBudgets">
                <option value="">All Departments</option>
                <option v-for="dept in departments" :key="dept" :value="dept">
                  {{ dept }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>Year</label>
              <select v-model="filterYear" class="form-control" @change="loadBudgets">
                <option value="">All Years</option>
                <option v-for="year in years" :key="year" :value="year">
                  {{ year }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>Status</label>
              <select v-model="filterStatus" class="form-control" @change="loadBudgets">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="exceeded">Over Budget</option>
              </select>
            </div>
            <div class="filter-group">
              <button @click="loadBudgets" class="btn-filter">
                <i class="fas fa-search"></i> Apply Filters
              </button>
            </div>
          </div>

          <!-- Budgets Table -->
          <div class="budgets-table-wrapper">
            <table class="budgets-table">
              <thead>
                <tr>
                  <th>DEPARTMENT</th>
                  <th>ALLOCATED</th>
                  <th>SPENT</th>
                  <th>REMAINING</th>
                  <th>USAGE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="text-center">
                    <i class="fas fa-spinner spin"></i> Loading budgets...
                  </td>
                </tr>
                <tr v-else-if="filteredBudgets.length === 0">
                  <td colspan="7" class="text-center">No budgets found. Create your first budget!</td>
                </tr>
                <tr v-for="budget in filteredBudgets" :key="budget.id">
                  <td>
                    <strong>{{ budget.category || budget.department }}</strong>
                    <span class="budget-user">by {{ budget.full_name || budget.username || 'Admin' }}</span>
                  </td>
                  <td>{{ formatCurrency(budget.allocated_amount) }}</td>
                  <td>{{ formatCurrency(budget.spent_amount) }}</td>
                  <td :class="getRemainingClass(budget)">
                    {{ formatCurrency(budget.allocated_amount - budget.spent_amount) }}
                  </td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" 
                           :style="{ width: getUsagePercentage(budget) + '%', 
                                    background: getProgressColor(budget) }">
                      </div>
                      <span class="progress-text">{{ getUsagePercentage(budget) }}%</span>
                    </div>
                  </td>
                  <td>
                    <span :class="getStatusClass(budget.status)">
                      {{ (budget.status || 'ACTIVE').toUpperCase() }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button @click="editBudget(budget)" class="btn-edit" title="Edit Budget">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button @click="deleteBudget(budget.id)" class="btn-delete" title="Delete Budget">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="budget-footer">
            <span>Showing <strong>{{ filteredBudgets.length }}</strong> budgets</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add/Edit Budget Modal -->
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5>{{ isEditing ? 'Edit Budget' : 'New Budget' }}</h5>
        <button @click="closeModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Department <span class="required">*</span></label>
          <input v-model="form.department" type="text" class="form-control" placeholder="Enter department name" />
        </div>
        <div class="form-group">
          <label>Allocated Amount <span class="required">*</span></label>
          <input v-model="form.allocated_amount" type="number" class="form-control" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Period</label>
          <select v-model="form.period" class="form-control">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div class="form-group" v-if="isEditing">
          <label>Spent Amount</label>
          <input v-model="form.spent_amount" type="number" class="form-control" placeholder="0.00" />
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-secondary">Cancel</button>
        <button @click="saveBudget" class="btn btn-primary" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : (isEditing ? 'Update Budget' : 'Create Budget') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
import api from '@/api/index.js';
import Swal from 'sweetalert2';

const router = useRouter();
const authStore = useAuthStore();

// State
const budgets = ref([]);
const loading = ref(false);
const isRefreshing = ref(false);
const isSaving = ref(false);
const showModal = ref(false);
const isEditing = ref(false);
const filterDepartment = ref('');
const filterYear = ref('');
const filterStatus = ref('');

// Form
const form = ref({
  id: null,
  department: '',
  allocated_amount: '',
  spent_amount: '',
  period: 'monthly',
  user_id: authStore.user?.id || 1
});

// ============================================
// COMPUTED
// ============================================
const totalBudget = computed(() => {
  return budgets.value.reduce((sum, b) => sum + parseFloat(b.allocated_amount || 0), 0);
});

const totalSpent = computed(() => {
  return budgets.value.reduce((sum, b) => sum + parseFloat(b.spent_amount || 0), 0);
});

const overallUsage = computed(() => {
  if (totalBudget.value === 0) return 0;
  return Math.min(100, Math.round((totalSpent.value / totalBudget.value) * 100));
});

const totalDepartments = computed(() => {
  const depts = new Set();
  budgets.value.forEach(b => {
    if (b.category || b.department) {
      depts.add(b.category || b.department);
    }
  });
  return depts.size;
});

const departments = computed(() => {
  const depts = new Set();
  budgets.value.forEach(b => {
    if (b.category || b.department) {
      depts.add(b.category || b.department);
    }
  });
  return Array.from(depts);
});

const years = computed(() => {
  const yearsSet = new Set();
  budgets.value.forEach(b => {
    if (b.created_at) {
      const year = new Date(b.created_at).getFullYear();
      yearsSet.add(year);
    }
  });
  if (yearsSet.size === 0) {
    yearsSet.add(new Date().getFullYear());
  }
  return Array.from(yearsSet).sort((a, b) => b - a);
});

const filteredBudgets = computed(() => {
  let result = budgets.value;
  
  if (filterDepartment.value) {
    result = result.filter(b => (b.category || b.department) === filterDepartment.value);
  }
  if (filterStatus.value) {
    result = result.filter(b => b.status === filterStatus.value);
  }
  if (filterYear.value) {
    result = result.filter(b => {
      if (b.created_at) {
        return new Date(b.created_at).getFullYear() === parseInt(filterYear.value);
      }
      return false;
    });
  }
  return result;
});

// ============================================
// HELPERS
// ============================================
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₱0.00';
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return '₱0.00';
  return '₱' + numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const getUsagePercentage = (budget) => {
  const allocated = parseFloat(budget.allocated_amount) || 1;
  const spent = parseFloat(budget.spent_amount) || 0;
  return Math.min(100, Math.round((spent / allocated) * 100));
};

const getProgressColor = (budget) => {
  const usage = getUsagePercentage(budget);
  if (usage >= 90) return '#ef4444';
  if (usage >= 70) return '#f59e0b';
  return '#10b981';
};

const getRemainingClass = (budget) => {
  const remaining = parseFloat(budget.allocated_amount) - parseFloat(budget.spent_amount);
  if (remaining < 0) return 'text-danger';
  if (remaining < parseFloat(budget.allocated_amount) * 0.1) return 'text-warning';
  return 'text-success';
};

const getStatusClass = (status) => {
  if (status === 'exceeded') return 'status-exceeded';
  return 'status-active';
};

// ============================================
// LOAD DATA
// ============================================
const loadBudgets = async () => {
  loading.value = true;
  try {
    const response = await api.get('/budgets.php');
    
    if (Array.isArray(response.data)) {
      budgets.value = response.data;
    } else {
      budgets.value = [];
    }
  } catch (error) {
    console.error('Error loading budgets:', error);
    budgets.value = [];
  } finally {
    loading.value = false;
  }
};

// ============================================
// CRUD OPERATIONS
// ============================================
const openAddBudget = () => {
  isEditing.value = false;
  form.value = {
    id: null,
    department: '',
    allocated_amount: '',
    spent_amount: '',
    period: 'monthly',
    user_id: authStore.user?.id || 1
  };
  showModal.value = true;
};

const editBudget = (budget) => {
  isEditing.value = true;
  form.value = {
    id: budget.id,
    department: budget.category || budget.department || '',
    allocated_amount: budget.allocated_amount || '',
    spent_amount: budget.spent_amount || '',
    period: budget.period || 'monthly',
    user_id: budget.user_id || 1
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  form.value = {
    id: null,
    department: '',
    allocated_amount: '',
    spent_amount: '',
    period: 'monthly',
    user_id: authStore.user?.id || 1
  };
};

const saveBudget = async () => {
  if (!form.value.department.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Department name is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  if (!form.value.allocated_amount || parseFloat(form.value.allocated_amount) <= 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Allocated amount must be greater than 0',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  isSaving.value = true;
  
  try {
    const data = {
      user_id: form.value.user_id,
      department: form.value.department,
      allocated_amount: parseFloat(form.value.allocated_amount),
      period: form.value.period
    };
    
    let response;
    if (isEditing.value) {
      if (form.value.spent_amount) {
        data.spent_amount = parseFloat(form.value.spent_amount);
      }
      response = await api.put(`/budgets.php?id=${form.value.id}`, data);
    } else {
      response = await api.post('/budgets.php', data);
    }
    
    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.data.message || 'Budget saved successfully',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
      closeModal();
      await loadBudgets();
    } else {
      throw new Error(response.data.message || 'Failed to save budget');
    }
  } catch (error) {
    console.error('Error saving budget:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || error.message || 'Failed to save budget. Please try again.',
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    isSaving.value = false;
  }
};

const deleteBudget = async (id) => {
  const result = await Swal.fire({
    title: 'Delete Budget?',
    text: 'Are you sure you want to delete this budget? This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      const response = await api.delete(`/budgets.php?id=${id}`);
      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'Budget has been deleted successfully.',
          confirmButtonColor: '#4F46E5',
          timer: 1500,
          showConfirmButton: false
        });
        await loadBudgets();
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete budget. Please try again.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

const refreshData = async () => {
  isRefreshing.value = true;
  await loadBudgets();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadBudgets();
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

.budget-container {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.budget-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .budget-header h2 {
  color: #e2e8f0;
}

.budget-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .budget-header p {
  color: #9ca3af;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
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
}

.btn-add:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
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

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

body.dark-mode .summary-card {
  background: #1e293b;
}

.summary-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
}

.summary-info {
  flex: 1;
}

.summary-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0;
}

body.dark-mode .summary-label {
  color: #9ca3af;
}

.summary-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0.1rem 0 0 0;
}

body.dark-mode .summary-value {
  color: #e2e8f0;
}

.filters-section {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
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

.budgets-table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .budgets-table-wrapper {
  background: #1e293b;
}

.budgets-table {
  width: 100%;
  border-collapse: collapse;
}

.budgets-table th {
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .budgets-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.budgets-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .budgets-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.budgets-table tr:last-child td {
  border-bottom: none;
}

.budgets-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .budgets-table tr:hover td {
  background: #2d3748;
}

.budget-user {
  display: block;
  font-size: 0.7rem;
  color: #6b7280;
}

body.dark-mode .budget-user {
  color: #9ca3af;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

.text-success {
  color: #10b981;
  font-weight: 600;
}

.text-warning {
  color: #f59e0b;
  font-weight: 600;
}

.text-danger {
  color: #ef4444;
  font-weight: 600;
}

.progress-bar {
  width: 100px;
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}

body.dark-mode .progress-bar {
  background: #2d3748;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  margin-left: 0.3rem;
}

body.dark-mode .progress-text {
  color: #9ca3af;
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

.status-exceeded {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-exceeded {
  background: #7f1d1d;
  color: #fca5a5;
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

.btn-delete {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-delete:hover {
  background: #fee2e2;
}

body.dark-mode .btn-delete:hover {
  background: #7f1d1d;
}

.budget-footer {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .budget-footer {
  background: #1e293b;
  color: #9ca3af;
}

.budget-footer strong {
  color: #1a1a2e;
}

body.dark-mode .budget-footer strong {
  color: #e2e8f0;
}

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
  max-width: 450px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideDown 0.3s ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

body.dark-mode .modal-content {
  background: #1e293b;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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

@media (max-width: 768px) {
  .budget-container {
    padding: 1rem;
  }

  .budget-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-group {
    min-width: 100%;
  }

  .summary-cards {
    grid-template-columns: 1fr 1fr;
  }

  .budgets-table-wrapper {
    overflow-x: auto;
  }

  .budgets-table {
    font-size: 0.8rem;
    min-width: 600px;
  }

  .modal-content {
    margin: 1rem;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
}
</style>