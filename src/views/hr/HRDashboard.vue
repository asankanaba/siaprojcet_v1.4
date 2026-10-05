<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="hr-dashboard">
          <!-- Header -->
          <div class="dashboard-header">
            <h1>HR Dashboard</h1>
            <p>Human Resources Management Overview</p>
          </div>

          <!-- Stats Grid -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="background: #d1fae5; color: #10b981;">
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-info">
                <p class="stat-value">{{ totalEmployees }}</p>
                <p class="stat-label">Total Employees</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #e0e7ff; color: #4F46E5;">
                <i class="fas fa-user-check"></i>
              </div>
              <div class="stat-info">
                <p class="stat-value">{{ activeEmployees }}</p>
                <p class="stat-label">Active Employees</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;">
                <i class="fas fa-user-clock"></i>
              </div>
              <div class="stat-info">
                <p class="stat-value">{{ onLeave }}</p>
                <p class="stat-label">On Leave</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #fee2e2; color: #ef4444;">
                <i class="fas fa-user-slash"></i>
              </div>
              <div class="stat-info">
                <p class="stat-value">{{ archivedEmployees }}</p>
                <p class="stat-label">Archived</p>
              </div>
            </div>
          </div>

          <!-- Hiring Sources Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Hiring Sources Breakdown</h3>
            </div>
            <div class="hiring-sources">
              <div v-for="source in hiringSources" :key="source.source" class="source-item">
                <div class="source-info">
                  <span class="source-name">{{ source.source }}</span>
                  <span class="source-count">{{ source.hires }}</span>
                </div>
                <div class="source-bar">
                  <div class="source-fill" :style="{ width: getSourcePercentage(source.hires) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Budget Requests Section -->
          <div class="budget-requests-section">
            <div class="section-header">
              <h3><i class="fas fa-file-invoice-dollar"></i> Budget Requests</h3>
              <div class="header-actions">
                <button @click="openBudgetRequestModal" class="btn-request-budget">
                  <i class="fas fa-plus"></i> Request Budget
                </button>
                <router-link to="/hr/budget-requests" class="btn-view-all">
                  View All <i class="fas fa-arrow-right"></i>
                </router-link>
              </div>
            </div>
            <div class="budget-requests-list">
              <div v-if="budgetRequests.length === 0" class="empty-state">
                <i class="fas fa-check-circle"></i>
                <p>No budget requests</p>
              </div>
              <div v-for="request in budgetRequests" :key="request.id" class="budget-request-item">
                <div class="request-header">
                  <div class="request-info">
                    <span class="request-department">{{ request.department }}</span>
                    <span class="request-amount">₱{{ formatNumber(request.amount) }}</span>
                  </div>
                  <span :class="getStatusClass(request.status)">
                    {{ getStatusLabel(request.status) }}
                  </span>
                </div>
                <div class="request-details">
                  <span class="request-purpose">{{ request.purpose }}</span>
                  <span class="request-by">by {{ request.requested_by_name || 'Unknown' }}</span>
                  <span class="request-date">{{ formatDate(request.created_at) }}</span>
                </div>
                <div class="request-status-note" v-if="request.status === 'pending'">
                  <i class="fas fa-clock"></i> Waiting for Finance approval
                </div>
                <div class="request-status-note approved" v-else-if="request.status === 'approved'">
                  <i class="fas fa-check-circle"></i> Approved by Finance
                </div>
                <div class="request-status-note rejected" v-else-if="request.status === 'rejected'">
                  <i class="fas fa-times-circle"></i> Rejected by Finance
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="quick-actions">
            <h3>Quick Actions</h3>
            <div class="actions-grid">
              <div class="action-card" @click="goToEmployees">
                <i class="fas fa-users"></i>
                <span>View Employees</span>
              </div>
              <div class="action-card" @click="goToAddEmployee">
                <i class="fas fa-user-plus"></i>
                <span>Add Employee</span>
              </div>
              <div class="action-card" @click="goToAttendance">
                <i class="fas fa-clock"></i>
                <span>Attendance</span>
              </div>
              <div class="action-card" @click="goToJobPosts">
                <i class="fas fa-briefcase"></i>
                <span>Job Posts</span>
              </div>
            </div>
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
import api from '@/api/index.js';
import Swal from 'sweetalert2';

const router = useRouter();
const authStore = useAuthStore();

// Stats
const totalEmployees = ref(0);
const activeEmployees = ref(0);
const onLeave = ref(0);
const archivedEmployees = ref(0);
const hiringSources = ref([]);
const budgetRequests = ref([]);
const showBudgetModal = ref(false);
const isSavingBudget = ref(false);

// Budget Form
const budgetForm = ref({
  department: '',
  amount: '',
  purpose: ''
});

// ============================================
// HELPERS
// ============================================
const formatNumber = (amount) => {
  return Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getSourcePercentage = (count) => {
  const total = hiringSources.value.reduce((sum, s) => sum + s.hires, 0);
  if (total === 0) return 0;
  return (count / total) * 100;
};

const getStatusClass = (status) => {
  if (status === 'approved') return 'status-approved';
  if (status === 'rejected') return 'status-rejected';
  return 'status-pending';
};

const getStatusLabel = (status) => {
  if (status === 'approved') return '✅ APPROVED';
  if (status === 'rejected') return '❌ REJECTED';
  return '⏳ PENDING';
};

// ============================================
// LOAD DATA
// ============================================
const loadDashboardData = async () => {
  try {
    const response = await api.get('/hr_reports.php');
    console.log('📊 HR Dashboard response:', response.data);
    
    if (response.data && response.data.success) {
      const data = response.data.data;
      
      totalEmployees.value = data.stats?.total_employees || 0;
      activeEmployees.value = data.stats?.active_employees || 0;
      archivedEmployees.value = totalEmployees.value - activeEmployees.value;
      hiringSources.value = data.hiring_sources || [
        { source: 'Direct', hires: 45 },
        { source: 'WeWork', hires: 30 },
        { source: 'LinkedIn', hires: 25 },
        { source: 'Hired', hires: 20 },
        { source: 'Internal', hires: 15 },
        { source: 'Referral', hires: 15 }
      ];
      budgetRequests.value = data.budget_requests || [];
    }
  } catch (error) {
    console.error('Error loading HR dashboard:', error);
    hiringSources.value = [
      { source: 'Direct', hires: 45 },
      { source: 'WeWork', hires: 30 },
      { source: 'LinkedIn', hires: 25 },
      { source: 'Hired', hires: 20 },
      { source: 'Internal', hires: 15 },
      { source: 'Referral', hires: 15 }
    ];
  }
};

// ============================================
// BUDGET REQUEST
// ============================================
const openBudgetRequestModal = () => {
  budgetForm.value = {
    department: '',
    amount: '',
    purpose: ''
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
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  if (!budgetForm.value.amount || parseFloat(budgetForm.value.amount) <= 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Amount must be greater than 0',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  if (!budgetForm.value.purpose.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Purpose is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  isSavingBudget.value = true;
  
  try {
    const payload = {
      department: budgetForm.value.department,
      amount: parseFloat(budgetForm.value.amount),
      purpose: budgetForm.value.purpose,
      requested_by: authStore.user?.id || 1
    };
    
    const response = await api.post('/budget_requests.php', payload);
    
    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Request Submitted!',
        text: 'Your budget request has been sent to Finance for approval.',
        confirmButtonColor: '#4F46E5',
        timer: 2000,
        showConfirmButton: false
      });
      closeBudgetModal();
      await loadDashboardData();
    }
  } catch (error) {
    console.error('Error submitting budget request:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to submit budget request. Please try again.',
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    isSavingBudget.value = false;
  }
};

// ============================================
// NAVIGATION
// ============================================
const goToEmployees = () => {
  router.push('/hr/employees');
};

const goToAddEmployee = () => {
  router.push('/hr/add-employee');
};

const goToAttendance = () => {
  router.push('/hr/attendance');
};

const goToJobPosts = () => {
  router.push('/hr/jobs');
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadDashboardData();
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

.hr-dashboard {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 1.5rem;
}

.dashboard-header h1 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .dashboard-header h1 {
  color: #e2e8f0;
}

.dashboard-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .dashboard-header p {
  color: #9ca3af;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

body.dark-mode .stat-card {
  background: #1e293b;
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .stat-value {
  color: #e2e8f0;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0.1rem 0 0 0;
}

body.dark-mode .stat-label {
  color: #9ca3af;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

body.dark-mode .chart-card {
  background: #1e293b;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.chart-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .chart-header h3 {
  color: #e2e8f0;
}

.hiring-sources {
  padding: 0.25rem 0;
}

.source-item {
  padding: 0.3rem 0;
}

.source-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #1f2937;
}

body.dark-mode .source-info {
  color: #e2e8f0;
}

.source-name {
  font-weight: 500;
}

.source-count {
  font-weight: 600;
  color: #4F46E5;
}

body.dark-mode .source-count {
  color: #818cf8;
}

.source-bar {
  width: 100%;
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.2rem;
}

body.dark-mode .source-bar {
  background: #2d3748;
}

.source-fill {
  height: 100%;
  background: linear-gradient(90deg, #4F46E5, #7C3AED);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.budget-requests-section {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

body.dark-mode .budget-requests-section {
  background: #1e293b;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.section-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .section-header h3 {
  color: #e2e8f0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-request-budget {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s;
}

.btn-request-budget:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}

.btn-view-all {
  color: #4F46E5;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.btn-view-all:hover {
  color: #4338CA;
}

.budget-requests-list {
  max-height: 350px;
  overflow-y: auto;
}

.budget-request-item {
  padding: 0.75rem;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

body.dark-mode .budget-request-item {
  border-color: #2d3748;
}

.budget-request-item:last-child {
  margin-bottom: 0;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.request-info {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.request-department {
  font-weight: 600;
  color: #1a1a2e;
}

body.dark-mode .request-department {
  color: #e2e8f0;
}

.request-amount {
  font-weight: 700;
  color: #4F46E5;
}

body.dark-mode .request-amount {
  color: #818cf8;
}

.request-details {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: #6b7280;
  flex-wrap: wrap;
}

body.dark-mode .request-details {
  color: #9ca3af;
}

.request-date {
  color: #9ca3af;
  font-size: 0.75rem;
}

.request-status-note {
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #f3f4f6;
  color: #6b7280;
}

body.dark-mode .request-status-note {
  background: #2d3748;
  color: #9ca3af;
}

.request-status-note.approved {
  background: #d1fae5;
  color: #065f46;
}

body.dark-mode .request-status-note.approved {
  background: #064e3b;
  color: #6ee7b7;
}

.request-status-note.rejected {
  background: #fee2e2;
  color: #991b1b;
}

body.dark-mode .request-status-note.rejected {
  background: #7f1d1d;
  color: #fca5a5;
}

.status-approved {
  background: #d1fae5;
  color: #065f46;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
}

body.dark-mode .status-approved {
  background: #064e3b;
  color: #6ee7b7;
}

.status-rejected {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
}

body.dark-mode .status-rejected {
  background: #7f1d1d;
  color: #fca5a5;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
}

body.dark-mode .status-pending {
  background: #78350f;
  color: #fcd34d;
}

.quick-actions {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .quick-actions {
  background: #1e293b;
}

.quick-actions h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 1rem 0;
}

body.dark-mode .quick-actions h3 {
  color: #e2e8f0;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: #f9fafb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

body.dark-mode .action-card {
  background: #2d3748;
}

.action-card:hover {
  border-color: #4F46E5;
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.action-card i {
  font-size: 1.8rem;
  color: #4F46E5;
  margin-bottom: 0.5rem;
}

.action-card span {
  font-size: 0.9rem;
  font-weight: 500;
  color: #1a1a2e;
}

body.dark-mode .action-card span {
  color: #e2e8f0;
}

.empty-state {
  text-align: center;
  padding: 1.5rem 0;
  color: #6b7280;
}

.empty-state i {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

/* Modal */
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
  .hr-dashboard {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .request-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .request-info {
    flex-wrap: wrap;
  }
  
  .request-details {
    flex-direction: column;
    gap: 0.2rem;
  }
  
  .actions-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .modal-content {
    margin: 1rem;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>