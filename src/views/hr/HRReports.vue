<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="hr-reports-container">
          <!-- Header -->
          <div class="hr-reports-header">
            <div>
              <h2><i class="fas fa-file-alt"></i> HR Reports</h2>
              <p>Human Resources analytics and reports</p>
            </div>
            <div class="header-actions">
              <button @click="exportReport" class="btn-export">
                <i class="fas fa-file-excel"></i> Export Report
              </button>
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Stats Cards -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="background: #d1fae5; color: #10b981;">
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-info">
                <p class="stat-value">{{ stats.total_employees || 0 }}</p>
                <p class="stat-label">Total Employees</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #e0e7ff; color: #4F46E5;">
                <i class="fas fa-user-check"></i>
              </div>
              <div class="stat-info">
                <p class="stat-value">{{ stats.active_employees || 0 }}</p>
                <p class="stat-label">Active Employees</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;">
                <i class="fas fa-user-plus"></i>
              </div>
              <div class="stat-info">
                <p class="stat-value">{{ stats.new_hires || 0 }}</p>
                <p class="stat-label">New Hires (This Month)</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: #fee2e2; color: #ef4444;">
                <i class="fas fa-user-slash"></i>
              </div>
              <div class="stat-info">
                <p class="stat-value">{{ stats.attrition_rate || 0 }}%</p>
                <p class="stat-label">Attrition Rate</p>
              </div>
            </div>
          </div>

          <!-- Budget Requests - VIEW ONLY -->
          <div class="budget-requests-section">
            <div class="section-header">
              <h3><i class="fas fa-file-invoice-dollar"></i> Budget Requests</h3>
              <router-link to="/hr/budget-requests" class="btn-view-all">
                View All <i class="fas fa-arrow-right"></i>
              </router-link>
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

          <!-- Hiring Sources Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Hiring Sources</h3>
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

          <!-- Department Breakdown -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Employees by Department</h3>
            </div>
            <div class="department-breakdown">
              <div v-for="dept in departments" :key="dept.department" class="dept-item">
                <div class="dept-info">
                  <span class="dept-name">{{ dept.department || 'General' }}</span>
                  <span class="dept-count">{{ dept.count }}</span>
                </div>
                <div class="dept-bar">
                  <div class="dept-fill" :style="{ width: getDeptPercentage(dept.count) + '%' }"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="activity-section">
            <div class="section-header">
              <h3><i class="fas fa-clock"></i> Recent Activity</h3>
            </div>
            <div class="activity-list">
              <div v-if="activities.length === 0" class="empty-state">
                <i class="fas fa-clock"></i>
                <p>No recent activity</p>
              </div>
              <div v-for="(activity, index) in activities" :key="index" class="activity-item">
                <div class="activity-icon" :class="activity.type">
                  <i :class="getActivityIcon(activity.type)"></i>
                </div>
                <div class="activity-content">
                  <p class="activity-text">{{ activity.message }}</p>
                  <span class="activity-time">{{ formatTime(activity.time) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
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

// State
const loading = ref(false);
const isRefreshing = ref(false);
const stats = ref({
  total_employees: 0,
  active_employees: 0,
  new_hires: 0,
  attrition_rate: 0,
});
const departments = ref([]);
const hiringSources = ref([]);
const budgetRequests = ref([]);
const activities = ref([]);

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
    day: 'numeric',
  });
};

const formatTime = (date) => {
  if (!date) return 'Just now';
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
  return Math.floor(diff / 86400) + ' days ago';
};

const getSourcePercentage = (count) => {
  const total = hiringSources.value.reduce((sum, s) => sum + s.hires, 0);
  if (total === 0) return 0;
  return (count / total) * 100;
};

const getDeptPercentage = (count) => {
  const total = departments.value.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) return 0;
  return (count / total) * 100;
};

const getActivityIcon = (type) => {
  const icons = {
    hire: 'fas fa-user-plus',
    budget: 'fas fa-file-invoice-dollar',
    leave: 'fas fa-user-slash',
    promotion: 'fas fa-arrow-up',
  };
  return icons[type] || 'fas fa-circle';
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
// LOAD REPORTS
// ============================================
const loadReports = async () => {
  loading.value = true;
  try {
    const response = await api.get('/hr_reports.php');
    console.log('📊 HR Reports response:', response.data);

    if (response.data && response.data.success) {
      const data = response.data.data;

      stats.value = data.stats || { total_employees: 0, active_employees: 0, new_hires: 0, attrition_rate: 0 };
      departments.value = data.departments || [];
      hiringSources.value = data.hiring_sources || [
        { source: 'Direct', hires: 45 },
        { source: 'WeWork', hires: 30 },
        { source: 'LinkedIn', hires: 25 },
        { source: 'Hired', hires: 20 },
        { source: 'Internal', hires: 15 },
        { source: 'Referral', hires: 15 },
      ];
      budgetRequests.value = data.budget_requests || [];
      activities.value = data.activities || [];

      console.log('✅ HR Reports loaded successfully');
    }
  } catch (error) {
    console.error('❌ Error loading HR Reports:', error);
  } finally {
    loading.value = false;
  }
};

// ============================================
// EXPORT REPORT
// ============================================
const exportReport = async () => {
  try {
    await Swal.fire({
      icon: 'info',
      title: 'Exporting Report',
      text: 'Your report is being generated...',
      confirmButtonColor: '#4F46E5',
      timer: 1500,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    const formData = new FormData();
    formData.append('type', 'all');

    const response = await fetch('http://localhost/smart-pos-api/api/export_hr_excel.php', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hr_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      await Swal.fire({
        icon: 'success',
        title: 'Export Complete!',
        text: 'HR Report has been downloaded successfully.',
        confirmButtonColor: '#4F46E5',
        timer: 2000,
        showConfirmButton: false,
      });
    }
  } catch (error) {
    console.error('Error exporting report:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Export Failed',
      text: 'Failed to export report. Please try again.',
      confirmButtonColor: '#4F46E5',
    });
  }
};

const refreshData = async () => {
  isRefreshing.value = true;
  await loadReports();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadReports();
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

.hr-reports-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.hr-reports-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.hr-reports-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .hr-reports-header h2 {
  color: #e2e8f0;
}

.hr-reports-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .hr-reports-header p {
  color: #9ca3af;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
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
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.budget-requests-section {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.department-breakdown {
  padding: 0.25rem 0;
}

.dept-item {
  padding: 0.3rem 0;
}

.dept-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #1f2937;
}

body.dark-mode .dept-info {
  color: #e2e8f0;
}

.dept-name {
  font-weight: 500;
}

.dept-count {
  font-weight: 600;
  color: #10B981;
}

body.dark-mode .dept-count {
  color: #6ee7b7;
}

.dept-bar {
  width: 100%;
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.2rem;
}

body.dark-mode .dept-bar {
  background: #2d3748;
}

.dept-fill {
  height: 100%;
  background: linear-gradient(90deg, #10B981, #34D399);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.activity-section {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .activity-section {
  background: #1e293b;
}

.activity-list {
  max-height: 250px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

body.dark-mode .activity-item {
  border-bottom-color: #2d3748;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.8rem;
}

.activity-icon.hire {
  background: #d1fae5;
  color: #10b981;
}

body.dark-mode .activity-icon.hire {
  background: #064e3b;
}

.activity-icon.budget {
  background: #e0e7ff;
  color: #4F46E5;
}

body.dark-mode .activity-icon.budget {
  background: #312e81;
}

.activity-content {
  flex: 1;
}

.activity-text {
  margin: 0;
  font-size: 0.85rem;
  color: #1f2937;
}

body.dark-mode .activity-text {
  color: #e2e8f0;
}

.activity-time {
  font-size: 0.7rem;
  color: #6b7280;
}

body.dark-mode .activity-time {
  color: #9ca3af;
}

.empty-state {
  text-align: center;
  padding: 1rem 0;
  color: #6b7280;
}

.empty-state i {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.25rem;
}

@media (max-width: 768px) {
  .hr-reports-container {
    padding: 1rem;
  }

  .hr-reports-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .request-details {
    flex-direction: column;
    gap: 0.2rem;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>