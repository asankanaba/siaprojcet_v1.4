<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="hr-budget-container">
          <!-- Header -->
          <div class="hr-budget-header">
            <div>
              <h2><i class="fas fa-file-invoice-dollar"></i> Budget Requests</h2>
              <p>View all budget requests submitted by HR</p>
            </div>
            <div class="header-actions">
              <button @click="openBudgetRequestModal" class="btn-request-budget">
                <i class="fas fa-plus"></i> Request Budget
              </button>
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Summary Cards -->
          <div class="summary-cards">
            <div class="summary-card">
              <div class="summary-icon" style="background: #fef3c7; color: #f59e0b;">
                <i class="fas fa-clock"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Pending</p>
                <p class="summary-value">{{ pendingCount }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #d1fae5; color: #10b981;">
                <i class="fas fa-check"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Approved</p>
                <p class="summary-value">{{ approvedCount }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #fee2e2; color: #ef4444;">
                <i class="fas fa-times"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Rejected</p>
                <p class="summary-value">{{ rejectedCount }}</p>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-icon" style="background: #e0e7ff; color: #4F46E5;">
                <i class="fas fa-coins"></i>
              </div>
              <div class="summary-info">
                <p class="summary-label">Total Requests</p>
                <p class="summary-value">{{ totalCount }}</p>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-section">
            <div class="filter-group">
              <label>Status</label>
              <select v-model="filterStatus" class="form-control" @change="loadBudgetRequests">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Department</label>
              <select v-model="filterDepartment" class="form-control" @change="loadBudgetRequests">
                <option value="">All Departments</option>
                <option v-for="dept in departments" :key="dept" :value="dept">
                  {{ dept }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>Search</label>
              <input v-model="searchQuery" class="form-control" placeholder="Search..." @input="loadBudgetRequests" />
            </div>
            <div class="filter-group">
              <button @click="loadBudgetRequests" class="btn-filter">
                <i class="fas fa-search"></i> Apply
              </button>
            </div>
          </div>

          <!-- Budget Requests Table -->
          <div class="hr-budget-table-wrapper">
            <table class="hr-budget-table">
              <thead>
                <tr>
                  <th>DEPARTMENT</th>
                  <th>PURPOSE</th>
                  <th>AMOUNT</th>
                  <th>REQUESTED BY</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="6" class="text-center">
                    <i class="fas fa-spinner spin"></i> Loading...
                  </td>
                </tr>
                <tr v-else-if="filteredBudgetRequests.length === 0">
                  <td colspan="6" class="text-center">No budget requests found</td>
                </tr>
                <tr v-for="request in filteredBudgetRequests" :key="request.id">
                  <td>
                    <span class="department-name">{{ request.department }}</span>
                  </td>
                  <td>{{ truncateText(request.purpose, 40) }}</td>
                  <td class="amount-cell">{{ formatCurrency(request.amount) }}</td>
                  <td>{{ request.requested_by_name || 'Unknown' }}</td>
                  <td>{{ formatDate(request.created_at) }}</td>
                  <td>
                    <span :class="getStatusClass(request.status)">
                      {{ getStatusLabel(request.status) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="hr-budget-footer">
            <span>Showing <strong>{{ filteredBudgetRequests.length }}</strong> requests</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Budget Request Modal -->
  <div v-if="showBudgetModal" class="modal-overlay" @click.self="closeBudgetModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-file-invoice-dollar"></i> Request Budget</h5>
        <button @click="closeBudgetModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Department <span class="required">*</span></label>
          <input v-model="budgetForm.department" type="text" class="form-control" placeholder="Enter department name" />
        </div>
        <div class="form-group">
          <label>Amount <span class="required">*</span></label>
          <input v-model="budgetForm.amount" type="number" class="form-control" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Purpose <span class="required">*</span></label>
          <textarea v-model="budgetForm.purpose" class="form-control" placeholder="Enter purpose of budget request" rows="3"></textarea>
        </div>
        <div class="info-box">
          <i class="fas fa-info-circle"></i>
          Your request will be sent to Finance for approval.
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeBudgetModal" class="btn btn-secondary">Cancel</button>
        <button @click="submitBudgetRequest" class="btn btn-primary" :disabled="isSavingBudget">
          {{ isSavingBudget ? 'Submitting...' : 'Submit Request' }}
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
const budgetRequests = ref([]);
const loading = ref(false);
const isRefreshing = ref(false);
const filterStatus = ref('');
const filterDepartment = ref('');
const searchQuery = ref('');
const showBudgetModal = ref(false);
const isSavingBudget = ref(false);

// Budget Form
const budgetForm = ref({
  department: '',
  amount: '',
  purpose: '',
});

// ============================================
// COMPUTED
// ============================================
const pendingCount = computed(() => {
  return budgetRequests.value.filter(r => r.status === 'pending').length;
});

const approvedCount = computed(() => {
  return budgetRequests.value.filter(r => r.status === 'approved').length;
});

const rejectedCount = computed(() => {
  return budgetRequests.value.filter(r => r.status === 'rejected').length;
});

const totalCount = computed(() => budgetRequests.value.length);

const departments = computed(() => {
  const depts = new Set();
  budgetRequests.value.forEach(r => {
    if (r.department) depts.add(r.department);
  });
  return Array.from(depts);
});

const filteredBudgetRequests = computed(() => {
  let result = budgetRequests.value;

  if (filterStatus.value) {
    result = result.filter(r => r.status === filterStatus.value);
  }
  if (filterDepartment.value) {
    result = result.filter(r => r.department === filterDepartment.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(r =>
      r.department.toLowerCase().includes(query) ||
      (r.purpose && r.purpose.toLowerCase().includes(query))
    );
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

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const truncateText = (text, length = 40) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

const getStatusClass = (status) => {
  if (status === 'approved') return 'status-approved';
  if (status === 'rejected') return 'status-rejected';
  return 'status-pending';
};

const getStatusLabel = (status) => {
  if (status === 'approved') return 'APPROVED';
  if (status === 'rejected') return 'REJECTED';
  return 'PENDING';
};

// ============================================
// LOAD DATA
// ============================================
const loadBudgetRequests = async () => {
  loading.value = true;
  try {
    let url = '/budget_requests.php';
    const params = new URLSearchParams();
    if (filterStatus.value) params.append('status', filterStatus.value);
    if (filterDepartment.value) params.append('department', filterDepartment.value);
    if (searchQuery.value) params.append('search', searchQuery.value);
    if (params.toString()) url += '?' + params.toString();

    const response = await api.get(url);
    console.log('📊 Budget Requests response:', response.data);

    if (Array.isArray(response.data)) {
      budgetRequests.value = response.data;
    } else {
      budgetRequests.value = [];
    }
  } catch (error) {
    console.error('Error loading budget requests:', error);
    budgetRequests.value = [];
  } finally {
    loading.value = false;
  }
};

// ============================================
// SUBMIT BUDGET REQUEST
// ============================================
const openBudgetRequestModal = () => {
  budgetForm.value = {
    department: '',
    amount: '',
    purpose: '',
  };
  showBudgetModal.value = true;
};

const closeBudgetModal = () => {
  showBudgetModal.value = false;
};

const submitBudgetRequest = async () => {
  if (!budgetForm.value.department.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Department is required',
      confirmButtonColor: '#4F46E5',
    });
    return;
  }

  if (!budgetForm.value.amount || parseFloat(budgetForm.value.amount) <= 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Amount must be greater than 0',
      confirmButtonColor: '#4F46E5',
    });
    return;
  }

  if (!budgetForm.value.purpose.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Purpose is required',
      confirmButtonColor: '#4F46E5',
    });
    return;
  }

  isSavingBudget.value = true;

  try {
    const payload = {
      department: budgetForm.value.department,
      amount: parseFloat(budgetForm.value.amount),
      purpose: budgetForm.value.purpose,
      requested_by: authStore.user?.id || 1,
    };

    const response = await api.post('/budget_requests.php', payload);

    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Request Submitted!',
        text: 'Your budget request has been sent to Finance for approval.',
        confirmButtonColor: '#4F46E5',
        timer: 2000,
        showConfirmButton: false,
      });
      closeBudgetModal();
      await loadBudgetRequests();
    }
  } catch (error) {
    console.error('Error submitting budget request:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to submit budget request. Please try again.',
      confirmButtonColor: '#4F46E5',
    });
  } finally {
    isSavingBudget.value = false;
  }
};

// ============================================
// REFRESH
// ============================================
const refreshData = async () => {
  isRefreshing.value = true;
  await loadBudgetRequests();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadBudgetRequests();
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

.hr-budget-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.hr-budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.hr-budget-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .hr-budget-header h2 {
  color: #e2e8f0;
}

.hr-budget-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .hr-budget-header p {
  color: #9ca3af;
}

.btn-request-budget {
  background: #4F46E5;
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

.btn-request-budget:hover {
  background: #4338CA;
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

.hr-budget-table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .hr-budget-table-wrapper {
  background: #1e293b;
}

.hr-budget-table {
  width: 100%;
  border-collapse: collapse;
}

.hr-budget-table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .hr-budget-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.hr-budget-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .hr-budget-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.hr-budget-table tr:last-child td {
  border-bottom: none;
}

.hr-budget-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .hr-budget-table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

.department-name {
  font-weight: 600;
  color: #1a1a2e;
}

body.dark-mode .department-name {
  color: #e2e8f0;
}

.amount-cell {
  font-weight: 600;
  color: #4F46E5;
}

body.dark-mode .amount-cell {
  color: #818cf8;
}

.status-approved {
  background: #d1fae5;
  color: #065f46;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-approved {
  background: #064e3b;
  color: #6ee7b7;
}

.status-rejected {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-rejected {
  background: #7f1d1d;
  color: #fca5a5;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-pending {
  background: #78350f;
  color: #fcd34d;
}

.hr-budget-footer {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .hr-budget-footer {
  background: #1e293b;
  color: #9ca3af;
}

.hr-budget-footer strong {
  color: #1a1a2e;
}

body.dark-mode .hr-budget-footer strong {
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
  max-width: 480px;
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

.info-box {
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

body.dark-mode .info-box {
  background: #312e81;
  color: #818cf8;
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
  .hr-budget-container {
    padding: 1rem;
  }

  .hr-budget-header {
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

  .hr-budget-table-wrapper {
    overflow-x: auto;
  }

  .hr-budget-table {
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