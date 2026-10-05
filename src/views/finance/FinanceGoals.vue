<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="goals-container">
          <!-- Header -->
          <div class="goals-header">
            <div>
              <h2><i class="fas fa-bullseye"></i> Financial Goals</h2>
              <p>Set and track your financial goals</p>
            </div>
            <div class="header-actions">
              <button @click="openAddModal" class="btn-add">
                <i class="fas fa-plus"></i> New Goal
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
                <i class="fas fa-check-circle"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Achieved</p>
                <p class="summary-value">{{ achievedCount }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #e0e7ff; color: #4F46E5;">
                <i class="fas fa-spinner"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">In Progress</p>
                <p class="summary-value">{{ inProgressCount }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #fee2e2; color: #ef4444;">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">At Risk</p>
                <p class="summary-value">{{ atRiskCount }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #fef3c7; color: #f59e0b;">
                <i class="fas fa-flag"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Total Goals</p>
                <p class="summary-value">{{ totalCount }}</p>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-section">
            <div class="filter-group">
              <label>Status</label>
              <select v-model="filterStatus" class="form-control" @change="loadGoals">
                <option value="">All Status</option>
                <option value="achieved">Achieved</option>
                <option value="in_progress">In Progress</option>
                <option value="at_risk">At Risk</option>
                <option value="active">Active</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Target Date</label>
              <input v-model="filterDate" type="date" class="form-control" @change="loadGoals" />
            </div>
            <div class="filter-group">
              <button @click="loadGoals" class="btn-filter">
                <i class="fas fa-search"></i> Apply
              </button>
            </div>
          </div>

          <!-- Goals Table -->
          <div class="goals-table-wrapper">
            <table class="goals-table">
              <thead>
                <tr>
                  <th>TITLE</th>
                  <th>TARGET</th>
                  <th>SAVED</th>
                  <th>PROGRESS</th>
                  <th>TARGET DATE</th>
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
                <tr v-else-if="filteredGoals.length === 0">
                  <td colspan="7" class="text-center">No goals found. Create your first goal!</td>
                </tr>
                <tr v-for="goal in filteredGoals" :key="goal.id">
                  <td>
                    <div class="goal-info">
                      <span class="goal-title">{{ goal.title }}</span>
                    </div>
                  </td>
                  <td class="amount-cell">{{ formatCurrency(goal.target_amount) }}</td>
                  <td class="amount-cell">{{ formatCurrency(goal.saved_amount) }}</td>
                  <td>
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: getProgress(goal) + '%', background: getProgressColor(goal) }"></div>
                      <span class="progress-text">{{ getProgress(goal) }}%</span>
                    </div>
                  </td>
                  <td>{{ formatDate(goal.target_date) }}</td>
                  <td>
                    <span :class="getStatusClass(goal.status)">
                      {{ getStatusLabel(goal.status) }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button @click="editGoal(goal)" class="btn-edit" title="Edit">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button @click="deleteGoal(goal.id)" class="btn-delete" title="Delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="goals-footer">
            <span>Showing <strong>{{ filteredGoals.length }}</strong> goals</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add/Edit Goal Modal -->
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5>{{ isEditing ? 'Edit Goal' : 'New Goal' }}</h5>
        <button @click="closeModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Title <span class="required">*</span></label>
          <input v-model="form.title" type="text" class="form-control" placeholder="Enter goal title" />
        </div>
        <div class="form-group">
          <label>Target Amount <span class="required">*</span></label>
          <input v-model.number="form.target_amount" type="number" class="form-control" placeholder="0.00" step="0.01" min="0.01" />
        </div>
        <div class="form-group">
          <label>Saved Amount</label>
          <input v-model.number="form.saved_amount" type="number" class="form-control" placeholder="0.00" step="0.01" min="0" />
        </div>
        <div class="form-group">
          <label>Target Date</label>
          <input v-model="form.target_date" type="date" class="form-control" />
        </div>
        <div class="form-group">
          <label>Status</label>
          <select v-model="form.status" class="form-control">
            <option value="in_progress">In Progress</option>
            <option value="active">Active</option>
            <option value="achieved">Achieved</option>
            <option value="at_risk">At Risk</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-secondary">Cancel</button>
        <button @click="saveGoal" class="btn btn-primary" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
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
const goals = ref([]);
const loading = ref(false);
const isRefreshing = ref(false);
const isSaving = ref(false);
const showModal = ref(false);
const isEditing = ref(false);
const filterStatus = ref('');
const filterDate = ref('');

// Form
const form = ref({
  id: null,
  title: '',
  target_amount: '',
  saved_amount: '0',
  target_date: '',
  status: 'in_progress'
});

// ============================================
// COMPUTED
// ============================================
const achievedCount = computed(() => {
  return goals.value.filter(g => g.status === 'achieved' || g.status === 'completed').length;
});

const inProgressCount = computed(() => {
  return goals.value.filter(g => g.status === 'in_progress' || g.status === 'active').length;
});

const atRiskCount = computed(() => {
  return goals.value.filter(g => g.status === 'at_risk').length;
});

const totalCount = computed(() => goals.value.length);

const filteredGoals = computed(() => {
  let result = goals.value;
  
  if (filterStatus.value) {
    result = result.filter(g => g.status === filterStatus.value);
  }
  if (filterDate.value) {
    result = result.filter(g => g.target_date === filterDate.value);
  }
  return result;
});

// ============================================
// HELPERS
// ============================================
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₱0.00';
  return '₱' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getProgress = (goal) => {
  if (!goal.target_amount || goal.target_amount === 0) return 0;
  const progress = (goal.saved_amount / goal.target_amount) * 100;
  return Math.min(100, Math.round(progress));
};

const getProgressColor = (goal) => {
  const progress = getProgress(goal);
  if (progress >= 100) return '#10b981';
  if (progress >= 50) return '#f59e0b';
  return '#ef4444';
};

const getStatusClass = (status) => {
  if (status === 'achieved' || status === 'completed') return 'status-achieved';
  if (status === 'at_risk') return 'status-at-risk';
  if (status === 'active') return 'status-active';
  return 'status-in-progress';
};

const getStatusLabel = (status) => {
  const labels = {
    'achieved': 'Achieved',
    'in_progress': 'In Progress',
    'active': 'Active',
    'at_risk': 'At Risk',
    'completed': 'Completed'
  };
  return labels[status] || status || 'In Progress';
};

// ============================================
// LOAD GOALS
// ============================================
const loadGoals = async () => {
  loading.value = true;
  try {
    let url = '/goals.php';
    const params = new URLSearchParams();
    if (filterStatus.value) params.append('status', filterStatus.value);
    if (filterDate.value) params.append('target_date', filterDate.value);
    if (params.toString()) url += '?' + params.toString();
    
    const response = await api.get(url);
    console.log('📊 Goals response:', response.data);
    
    if (Array.isArray(response.data)) {
      goals.value = response.data;
    } else {
      goals.value = [];
    }
  } catch (error) {
    console.error('Error loading goals:', error);
    goals.value = [];
  } finally {
    loading.value = false;
  }
};

// ============================================
// CRUD OPERATIONS
// ============================================
const openAddModal = () => {
  isEditing.value = false;
  form.value = {
    id: null,
    title: '',
    target_amount: '',
    saved_amount: '0',
    target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'in_progress'
  };
  showModal.value = true;
};

const editGoal = (goal) => {
  isEditing.value = true;
  form.value = {
    id: goal.id,
    title: goal.title,
    target_amount: goal.target_amount || '',
    saved_amount: goal.saved_amount || 0,
    target_date: goal.target_date || '',
    status: goal.status || 'in_progress'
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveGoal = async () => {
  const title = form.value.title?.trim() || '';
  if (!title) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Title is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  const targetAmount = parseFloat(form.value.target_amount);
  if (!targetAmount || targetAmount <= 0 || isNaN(targetAmount)) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Target amount must be greater than 0',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  const savedAmount = parseFloat(form.value.saved_amount) || 0;
  
  isSaving.value = true;
  
  try {
    const payload = {
      user_id: authStore.user?.id || 1,
      title: title,
      target_amount: targetAmount,
      saved_amount: savedAmount,
      target_date: form.value.target_date || null,
      status: form.value.status || 'in_progress'
    };
    
    console.log('📤 Saving goal payload:', payload);
    
    let response;
    if (isEditing.value) {
      response = await api.put(`/goals.php?id=${form.value.id}`, payload);
    } else {
      response = await api.post('/goals.php', payload);
    }
    
    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.data.message || 'Goal saved successfully',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
      closeModal();
      await loadGoals();
    }
  } catch (error) {
    console.error('Error saving goal:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to save goal. Please try again.',
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    isSaving.value = false;
  }
};

const deleteGoal = async (id) => {
  const result = await Swal.fire({
    title: 'Delete Goal?',
    text: 'Are you sure you want to delete this goal?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      await api.delete(`/goals.php?id=${id}`);
      await loadGoals();
      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Goal deleted successfully.',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete goal.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

const refreshData = async () => {
  isRefreshing.value = true;
  await loadGoals();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadGoals();
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

.goals-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.goals-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.goals-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .goals-header h2 {
  color: #e2e8f0;
}

.goals-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .goals-header p {
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
  font-size: 1.2rem;
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
  font-size: 1.3rem;
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

.goals-table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .goals-table-wrapper {
  background: #1e293b;
}

.goals-table {
  width: 100%;
  border-collapse: collapse;
}

.goals-table th {
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .goals-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.goals-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .goals-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.goals-table tr:last-child td {
  border-bottom: none;
}

.goals-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .goals-table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

.goal-info {
  display: flex;
  flex-direction: column;
}

.goal-title {
  font-weight: 600;
  color: #1a1a2e;
}

body.dark-mode .goal-title {
  color: #e2e8f0;
}

.amount-cell {
  font-weight: 600;
  color: #4F46E5;
}

body.dark-mode .amount-cell {
  color: #818cf8;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  min-width: 80px;
}

body.dark-mode .progress-bar {
  background: #2d3748;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  position: absolute;
  right: 0;
  top: -1.2rem;
}

body.dark-mode .progress-text {
  color: #9ca3af;
}

.status-achieved {
  background: #d1fae5;
  color: #065f46;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-achieved {
  background: #064e3b;
  color: #6ee7b7;
}

.status-in-progress {
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-in-progress {
  background: #312e81;
  color: #818cf8;
}

.status-at-risk {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-at-risk {
  background: #7f1d1d;
  color: #fca5a5;
}

.status-active {
  background: #fef3c7;
  color: #92400e;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-active {
  background: #78350f;
  color: #fcd34d;
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

.goals-footer {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .goals-footer {
  background: #1e293b;
  color: #9ca3af;
}

.goals-footer strong {
  color: #1a1a2e;
}

body.dark-mode .goals-footer strong {
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
  .goals-container {
    padding: 1rem;
  }

  .goals-header {
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

  .goals-table-wrapper {
    overflow-x: auto;
  }

  .goals-table {
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