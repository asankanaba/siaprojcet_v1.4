<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="budget-approvals-container">
          <!-- Header -->
          <div class="budget-approvals-header">
            <div>
              <h2><i class="fas fa-check-double"></i> Budget Approvals</h2>
              <p>Review and approve budget requests from departments</p>
            </div>
            <div class="header-actions">
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
                <p class="summary-label">Total Budget</p>
                <p class="summary-value">{{ formatCurrency(totalBudget) }}</p>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-section">
            <div class="filter-group">
              <label>Status</label>
              <select v-model="filterStatus" class="form-control" @change="loadBudgetApprovals">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Department</label>
              <select v-model="filterDepartment" class="form-control" @change="loadBudgetApprovals">
                <option value="">All Departments</option>
                <option v-for="dept in departments" :key="dept" :value="dept">
                  {{ dept }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>Search</label>
              <input v-model="searchQuery" class="form-control" placeholder="Search..." @input="loadBudgetApprovals" />
            </div>
            <div class="filter-group">
              <button @click="loadBudgetApprovals" class="btn-filter">
                <i class="fas fa-search"></i> Apply
              </button>
            </div>
          </div>

          <!-- Budget Approvals Table -->
          <div class="budget-approvals-table-wrapper">
            <table class="budget-approvals-table">
              <thead>
                <tr>
                  <th>DEPARTMENT</th>
                  <th>PURPOSE</th>
                  <th>AMOUNT</th>
                  <th>REQUESTED BY</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th style="width: 200px;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="text-center">
                    <i class="fas fa-spinner spin"></i> Loading...
                  </td>
                </tr>
                <tr v-else-if="filteredBudgetApprovals.length === 0">
                  <td colspan="7" class="text-center">No budget approval requests found</td>
                </tr>
                <tr v-for="approval in filteredBudgetApprovals" :key="approval.id">
                  <td>
                    <span class="department-name">{{ approval.department }}</span>
                  </td>
                  <td>{{ truncateText(approval.purpose, 30) }}</td>
                  <td class="amount-cell">{{ formatCurrency(approval.amount) }}</td>
                  <td>{{ approval.requested_by_name || 'Unknown' }}</td>
                  <td>{{ formatDate(approval.created_at) }}</td>
                  <td>
                    <span :class="getBudgetApprovalStatusClass(approval.status)">
                      {{ (approval.status || 'PENDING').toUpperCase() }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <!-- ✅ Only show Approve/Reject for PENDING requests -->
                      <template v-if="approval.status === 'pending'">
                        <button 
                          @click="approveBudget(approval.id)" 
                          class="btn-approve" 
                          title="Approve"
                        >
                          <i class="fas fa-check"></i> Approve
                        </button>
                        <button 
                          @click="rejectBudget(approval.id)" 
                          class="btn-reject" 
                          title="Reject"
                        >
                          <i class="fas fa-times"></i> Reject
                        </button>
                      </template>
                      <span v-else class="text-muted">Processed</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="budget-approvals-footer">
            <span>Showing <strong>{{ filteredBudgetApprovals.length }}</strong> requests</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Approval Details Modal -->
  <div v-if="showDetailsModal" class="modal-overlay" @click.self="closeDetailsModal">
    <div class="modal-content details-modal">
      <div class="modal-header">
        <h5><i class="fas fa-file-invoice-dollar"></i> Budget Approval Details</h5>
        <button @click="closeDetailsModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body" v-if="selectedApproval">
        <div class="detail-row">
          <label>Department</label>
          <span class="detail-value">{{ selectedApproval.department }}</span>
        </div>
        <div class="detail-row">
          <label>Amount</label>
          <span class="detail-value price">{{ formatCurrency(selectedApproval.amount) }}</span>
        </div>
        <div class="detail-row">
          <label>Purpose</label>
          <span class="detail-value">{{ selectedApproval.purpose || 'No purpose specified' }}</span>
        </div>
        <div class="detail-row">
          <label>Requested By</label>
          <span class="detail-value">{{ selectedApproval.requested_by_name || 'Unknown' }}</span>
        </div>
        <div class="detail-row">
          <label>Request Date</label>
          <span class="detail-value">{{ formatDate(selectedApproval.created_at) }}</span>
        </div>
        <div class="detail-row">
          <label>Status</label>
          <span :class="getBudgetApprovalStatusClass(selectedApproval.status)">
            {{ (selectedApproval.status || 'PENDING').toUpperCase() }}
          </span>
        </div>
        <div class="detail-row" v-if="selectedApproval.notes">
          <label>Notes</label>
          <span class="detail-value">{{ selectedApproval.notes }}</span>
        </div>
      </div>
      <div class="modal-footer" v-if="selectedApproval?.status === 'pending'">
        <button @click="closeDetailsModal" class="btn btn-secondary">Close</button>
        <button @click="approveBudget(selectedApproval.id)" class="btn btn-success">
          <i class="fas fa-check"></i> Approve
        </button>
        <button @click="rejectBudget(selectedApproval.id)" class="btn btn-danger">
          <i class="fas fa-times"></i> Reject
        </button>
      </div>
      <div class="modal-footer" v-else>
        <button @click="closeDetailsModal" class="btn btn-secondary">Close</button>
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
const budgetApprovals = ref([]);
const loading = ref(false);
const isRefreshing = ref(false);
const filterStatus = ref('');
const filterDepartment = ref('');
const searchQuery = ref('');
const showDetailsModal = ref(false);
const selectedApproval = ref(null);

// ============================================
// COMPUTED
// ============================================
const pendingCount = computed(() => {
  return budgetApprovals.value.filter(a => a.status === 'pending' || a.status === '').length;
});

const approvedCount = computed(() => {
  return budgetApprovals.value.filter(a => a.status === 'approved').length;
});

const rejectedCount = computed(() => {
  return budgetApprovals.value.filter(a => a.status === 'rejected').length;
});

const totalBudget = computed(() => {
  const total = budgetApprovals.value
    .filter(a => a.status === 'approved')
    .reduce((sum, a) => {
      const amount = parseFloat(a.amount) || 0;
      return sum + amount;
    }, 0);
  return total;
});

const departments = computed(() => {
  const depts = new Set();
  budgetApprovals.value.forEach(a => {
    if (a.department) depts.add(a.department);
  });
  return Array.from(depts);
});

const filteredBudgetApprovals = computed(() => {
  let result = budgetApprovals.value;
  
  if (filterStatus.value) {
    result = result.filter(a => a.status === filterStatus.value);
  }
  if (filterDepartment.value) {
    result = result.filter(a => a.department === filterDepartment.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(a => 
      a.department.toLowerCase().includes(query) ||
      (a.purpose && a.purpose.toLowerCase().includes(query))
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
    day: 'numeric'
  });
};

const truncateText = (text, length = 30) => {
  if (!text) return '';
  return text.length > length ? text.substring(0, length) + '...' : text;
};

const getBudgetApprovalStatusClass = (status) => {
  if (status === 'approved') return 'status-approved';
  if (status === 'rejected') return 'status-rejected';
  return 'status-pending';
};

// ============================================
// LOAD DATA
// ============================================
const loadBudgetApprovals = async () => {
  loading.value = true;
  try {
    // ✅ FIXED: Removed leading /api
    let url = '/budget_approvals.php';
    const params = new URLSearchParams();
    if (filterStatus.value) params.append('status', filterStatus.value);
    if (filterDepartment.value) params.append('department', filterDepartment.value);
    if (searchQuery.value) params.append('search', searchQuery.value);
    if (params.toString()) url += '?' + params.toString();
    
    const response = await api.get(url);
    console.log('📊 Budget Approvals response:', response.data);
    
    if (Array.isArray(response.data)) {
      budgetApprovals.value = response.data;
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      budgetApprovals.value = response.data.data;
    } else {
      budgetApprovals.value = [];
    }
    console.log('✅ Loaded:', budgetApprovals.value.length, 'approvals');
  } catch (error) {
    console.error('Error loading budget approvals:', error);
    budgetApprovals.value = [];
  } finally {
    loading.value = false;
  }
};

// ============================================
// APPROVE BUDGET
// ============================================
const approveBudget = async (id) => {
  const result = await Swal.fire({
    title: 'Approve Budget?',
    text: 'Are you sure you want to approve this budget request?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Approve',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      // ✅ FIXED: Removed leading /api
      const response = await api.put(`/budget_approvals.php?id=${id}`, {
        status: 'approved',
        approved_by: authStore.user?.id || 1
      });
      
      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Approved!',
          text: 'Budget request has been approved.',
          confirmButtonColor: '#4F46E5',
          timer: 1500,
          showConfirmButton: false
        });
        await loadBudgetApprovals();
      }
    } catch (error) {
      console.error('Error approving budget:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to approve budget.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

// ============================================
// REJECT BUDGET
// ============================================
const rejectBudget = async (id) => {
  const result = await Swal.fire({
    title: 'Reject Budget?',
    text: 'Are you sure you want to reject this budget request?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Reject',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      // ✅ FIXED: Removed leading /api
      const response = await api.put(`/budget_approvals.php?id=${id}`, {
        status: 'rejected',
        approved_by: authStore.user?.id || 1,
        notes: 'Rejected by Finance'
      });
      
      if (response.data.success) {
        await Swal.fire({
          icon: 'info',
          title: 'Rejected',
          text: 'Budget request has been rejected.',
          confirmButtonColor: '#4F46E5',
          timer: 1500,
          showConfirmButton: false
        });
        await loadBudgetApprovals();
      }
    } catch (error) {
      console.error('Error rejecting budget:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to reject budget.',
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
  await loadBudgetApprovals();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadBudgetApprovals();
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

.budget-approvals-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* ============================================
   HEADER
   ============================================ */
.budget-approvals-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.budget-approvals-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .budget-approvals-header h2 {
  color: #e2e8f0;
}

.budget-approvals-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .budget-approvals-header p {
  color: #9ca3af;
}

.btn-refresh {
  background: white;
  border: 1px solid #e5e7eb;
  padding: 0.4rem 0.8rem;
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
  to { transform: rotate(360deg); }
}

/* ============================================
   SUMMARY CARDS
   ============================================ */
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
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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

/* ============================================
   FILTERS
   ============================================ */
.filters-section {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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

/* ============================================
   TABLE
   ============================================ */
.budget-approvals-table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .budget-approvals-table-wrapper {
  background: #1e293b;
}

.budget-approvals-table {
  width: 100%;
  border-collapse: collapse;
}

.budget-approvals-table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .budget-approvals-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.budget-approvals-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .budget-approvals-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.budget-approvals-table tr:last-child td {
  border-bottom: none;
}

.budget-approvals-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .budget-approvals-table tr:hover td {
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

/* ============================================
   STATUS
   ============================================ */
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

/* ============================================
   ACTIONS
   ============================================ */
.action-buttons {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.btn-approve {
  background: #10B981;
  color: white;
  border: none;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.btn-approve:hover {
  background: #059669;
}

.btn-reject {
  background: #EF4444;
  color: white;
  border: none;
  padding: 0.3rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.btn-reject:hover {
  background: #DC2626;
}

.text-muted {
  color: #6b7280;
  font-size: 0.8rem;
}

/* ============================================
   FOOTER
   ============================================ */
.budget-approvals-footer {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .budget-approvals-footer {
  background: #1e293b;
  color: #9ca3af;
}

.budget-approvals-footer strong {
  color: #1a1a2e;
}

body.dark-mode .budget-approvals-footer strong {
  color: #e2e8f0;
}

/* ============================================
   MODAL
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
  max-width: 500px;
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

.details-modal {
  max-width: 550px;
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

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f3f4f6;
}

body.dark-mode .detail-row {
  border-bottom-color: #2d3748;
}

.detail-row label {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.85rem;
}

body.dark-mode .detail-row label {
  color: #9ca3af;
}

.detail-value {
  color: #1f2937;
  font-size: 0.85rem;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}

body.dark-mode .detail-value {
  color: #e2e8f0;
}

.detail-value.price {
  color: #4F46E5;
  font-weight: 600;
}

body.dark-mode .detail-value.price {
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

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .budget-approvals-container {
    padding: 1rem;
  }
  
  .budget-approvals-header {
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
  
  .budget-approvals-table-wrapper {
    overflow-x: auto;
  }
  
  .budget-approvals-table {
    font-size: 0.8rem;
    min-width: 600px;
  }
  
  .modal-content {
    margin: 1rem;
    max-width: 100%;
  }
  
  .detail-row {
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .detail-value {
    text-align: left;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
}
</style>