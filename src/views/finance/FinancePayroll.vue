<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="finance-payroll-container">
          <!-- Header -->
          <div class="page-header">
            <div>
              <h2><i class="fas fa-money-check-alt"></i> Payroll Approvals</h2>
              <p>Review and approve payroll requests from HR</p>
            </div>
            <div class="header-actions">
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: loading }"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Stats -->
          <div class="stats-cards">
            <div class="stat-card" style="border-left: 4px solid #F59E0B;">
              <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;">
                <i class="fas fa-clock"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Pending Approvals</p>
                <p class="stat-value">{{ pendingCount }}</p>
              </div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #10B981;">
              <div class="stat-icon" style="background: #d1fae5; color: #10b981;">
                <i class="fas fa-check-circle"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Approved</p>
                <p class="stat-value">{{ approvedCount }}</p>
              </div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #EF4444;">
              <div class="stat-icon" style="background: #fee2e2; color: #ef4444;">
                <i class="fas fa-times-circle"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Rejected</p>
                <p class="stat-value">{{ rejectedCount }}</p>
              </div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #4F46E5;">
              <div class="stat-icon" style="background: #e0e7ff; color: #4F46E5;">
                <i class="fas fa-coins"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Total Payroll</p>
                <p class="stat-value">₱{{ formatPrice(totalPayroll) }}</p>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-section">
            <div class="filter-group">
              <label>Status</label>
              <select v-model="filterStatus" class="form-control" @change="loadPayroll">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Department</label>
              <select v-model="filterDepartment" class="form-control">
                <option value="">All Departments</option>
                <option v-for="dept in departments" :key="dept" :value="dept">
                  {{ dept }}
                </option>
              </select>
            </div>
            <div class="filter-group">
              <label>Search</label>
              <input v-model="searchQuery" class="form-control" placeholder="Search employee..." @input="loadPayroll" />
            </div>
            <div class="filter-group">
              <button @click="loadPayroll" class="btn-filter">
                <i class="fas fa-search"></i> Apply
              </button>
            </div>
          </div>

          <!-- Payroll Table -->
          <div class="table-wrapper">
            <table class="payroll-table">
              <thead>
                <tr>
                  <th>EMPLOYEE</th>
                  <th>DEPARTMENT</th>
                  <th>PERIOD</th>
                  <th>SALARY</th>
                  <th>DEDUCTIONS</th>
                  <th>NET PAY</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="8" class="text-center">
                    <i class="fas fa-spinner spin"></i> Loading...
                  </td>
                </tr>
                <tr v-else-if="filteredPayroll.length === 0">
                  <td colspan="8" class="text-center">No payroll records found</td>
                </tr>
                <tr v-for="record in filteredPayroll" :key="record.id">
                  <td>
                    <div class="employee-cell">
                      <strong>{{ record.full_name }}</strong>
                      <span class="employee-email">{{ record.email }}</span>
                    </div>
                  </td>
                  <td>{{ record.department || 'General' }}</td>
                  <td>
                    <span class="period-text">
                      {{ formatDateShort(record.period_start) }} - {{ formatDateShort(record.period_end) }}
                    </span>
                  </td>
                  <td>₱{{ formatPrice(record.basic_salary) }}</td>
                  <td class="text-danger">-₱{{ formatPrice(record.deductions) }}</td>
                  <td class="text-success">₱{{ formatPrice(record.net_pay) }}</td>
                  <td>
                    <span :class="getStatusClass(record.status)">
                      {{ getStatusLabel(record.status) }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons" v-if="record.status === 'pending'">
                      <button @click="approvePayroll(record)" class="btn-approve" title="Approve">
                        <i class="fas fa-check"></i> Approve
                      </button>
                      <button @click="rejectPayroll(record)" class="btn-reject" title="Reject">
                        <i class="fas fa-times"></i> Reject
                      </button>
                    </div>
                    <button v-else @click="viewPayrollDetail(record)" class="btn-view" title="View Details">
                      <i class="fas fa-eye"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="footer">
            <span>Showing <strong>{{ filteredPayroll.length }}</strong> records</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Payroll Detail Modal -->
  <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
    <div class="modal-content detail-modal">
      <div class="modal-header">
        <h5><i class="fas fa-file-invoice"></i> Payroll Details</h5>
        <button @click="closeDetailModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body" v-if="selectedRecord">
        <div class="detail-grid">
          <div class="detail-item">
            <label>Employee</label>
            <span class="value">{{ selectedRecord.full_name }}</span>
          </div>
          <div class="detail-item">
            <label>Department</label>
            <span class="value">{{ selectedRecord.department || 'General' }}</span>
          </div>
          <div class="detail-item">
            <label>Period</label>
            <span class="value">{{ formatDateShort(selectedRecord.period_start) }} - {{ formatDateShort(selectedRecord.period_end) }}</span>
          </div>
          <div class="detail-item">
            <label>Status</label>
            <span :class="getStatusClass(selectedRecord.status)">{{ getStatusLabel(selectedRecord.status) }}</span>
          </div>
          <div class="detail-item">
            <label>Basic Salary</label>
            <span class="value">₱{{ formatPrice(selectedRecord.basic_salary) }}</span>
          </div>
          <div class="detail-item">
            <label>Allowances</label>
            <span class="value">₱{{ formatPrice(selectedRecord.allowances) }}</span>
          </div>
          <div class="detail-item">
            <label>Deductions</label>
            <span class="value text-danger">-₱{{ formatPrice(selectedRecord.deductions) }}</span>
          </div>
          <div class="detail-item">
            <label>Net Pay</label>
            <span class="value text-success">₱{{ formatPrice(selectedRecord.net_pay) }}</span>
          </div>
          <div class="detail-item full-width" v-if="selectedRecord.notes">
            <label>Notes</label>
            <span class="value">{{ selectedRecord.notes }}</span>
          </div>
          <div class="detail-item full-width" v-if="selectedRecord.approved_at">
            <label>Approved At</label>
            <span class="value">{{ formatDateTime(selectedRecord.approved_at) }}</span>
          </div>
        </div>
      </div>
      <div class="modal-footer" v-if="selectedRecord?.status === 'pending'">
        <button @click="closeDetailModal" class="btn btn-secondary">Close</button>
        <button @click="approvePayroll(selectedRecord)" class="btn btn-success">
          <i class="fas fa-check"></i> Approve
        </button>
        <button @click="rejectPayroll(selectedRecord)" class="btn btn-danger">
          <i class="fas fa-times"></i> Reject
        </button>
      </div>
      <div class="modal-footer" v-else>
        <button @click="closeDetailModal" class="btn btn-secondary">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import Swal from 'sweetalert2'
import api from '@/api/index.js'

const authStore = useAuthStore()

// ============================================
// STATE
// ============================================
const loading = ref(false)
const payrollRecords = ref([])
const filterStatus = ref('')
const filterDepartment = ref('')
const searchQuery = ref('')
const showDetailModal = ref(false)
const selectedRecord = ref(null)

// ============================================
// COMPUTED
// ============================================
const pendingCount = computed(() => {
  return payrollRecords.value.filter(r => r.status === 'pending').length
})

const approvedCount = computed(() => {
  return payrollRecords.value.filter(r => r.status === 'approved' || r.status === 'paid').length
})

const rejectedCount = computed(() => {
  return payrollRecords.value.filter(r => r.status === 'rejected').length
})

const totalPayroll = computed(() => {
  return payrollRecords.value
    .filter(r => r.status === 'approved' || r.status === 'paid')
    .reduce((sum, r) => sum + parseFloat(r.net_pay || 0), 0)
})

const departments = computed(() => {
  const depts = new Set()
  payrollRecords.value.forEach(r => {
    if (r.department) depts.add(r.department)
  })
  return Array.from(depts)
})

const filteredPayroll = computed(() => {
  let result = payrollRecords.value
  
  if (filterStatus.value) {
    result = result.filter(r => r.status === filterStatus.value)
  }
  if (filterDepartment.value) {
    result = result.filter(r => r.department === filterDepartment.value)
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(r => 
      r.full_name.toLowerCase().includes(query) ||
      r.email?.toLowerCase().includes(query)
    )
  }
  return result
})

// ============================================
// HELPERS
// ============================================
const formatPrice = (price) => {
  return Number(price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDateShort = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const formatDateTime = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusClass = (status) => {
  const s = (status || 'pending').toLowerCase()
  if (s === 'approved' || s === 'paid') return 'status-approved'
  if (s === 'rejected') return 'status-rejected'
  return 'status-pending'
}

const getStatusLabel = (status) => {
  const s = (status || 'pending').toLowerCase()
  if (s === 'approved') return 'APPROVED'
  if (s === 'paid') return 'PAID'
  if (s === 'rejected') return 'REJECTED'
  return 'PENDING'
}

// ============================================
// LOAD PAYROLL
// ============================================
const loadPayroll = async () => {
  loading.value = true
  try {
    let url = '/payroll.php'
    const params = new URLSearchParams()
    if (filterStatus.value) params.append('status', filterStatus.value)
    if (params.toString()) url += '?' + params.toString()
    
    const response = await api.get(url)
    if (response.data && response.data.data) {
      payrollRecords.value = response.data.data
    }
  } catch (error) {
    console.error('Error loading payroll:', error)
    // Sample data for demo
    payrollRecords.value = [
      {
        id: 1,
        user_id: 1,
        full_name: 'Administrator',
        email: 'admin@smartpos.com',
        department: 'Engineering',
        period_start: '2026-08-01',
        period_end: '2026-08-15',
        basic_salary: 8000,
        allowances: 1000,
        deductions: 500,
        net_pay: 8500,
        status: 'pending',
        notes: 'August 1-15 payroll',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        user_id: 7,
        full_name: 'HR Manager',
        email: 'hr@smartpos.com',
        department: 'Finance',
        period_start: '2026-08-01',
        period_end: '2026-08-15',
        basic_salary: 7000,
        allowances: 500,
        deductions: 300,
        net_pay: 7200,
        status: 'approved',
        notes: 'Approved by Finance',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        approved_at: new Date(Date.now() - 43200000).toISOString()
      }
    ]
  } finally {
    loading.value = false
  }
}

// ============================================
// APPROVE PAYROLL (Finance)
// ============================================
const approvePayroll = async (record) => {
  const result = await Swal.fire({
    title: 'Approve Payroll?',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${record.full_name}</p>
        <p><strong>Department:</strong> ${record.department || 'General'}</p>
        <p><strong>Period:</strong> ${formatDateShort(record.period_start)} - ${formatDateShort(record.period_end)}</p>
        <p><strong>Net Pay:</strong> <span style="color: #10B981; font-weight: 700;">₱${formatPrice(record.net_pay)}</span></p>
        <p><strong>This will credit the employee's wallet.</strong></p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Approve',
    cancelButtonText: 'Cancel'
  })

  if (result.isConfirmed) {
    loading.value = true
    try {
      const response = await api.put(`/payroll.php?id=${record.id}`, {
        status: 'approved',
        approved_by: authStore.user?.id || 1,
        notes: `Approved by ${authStore.user?.full_name || 'Finance'} on ${new Date().toLocaleString()}`
      })

      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Payroll Approved!',
          html: `
            <p>Salary of <strong>₱${formatPrice(record.net_pay)}</strong> has been credited to ${record.full_name}'s wallet.</p>
          `,
          confirmButtonColor: '#4F46E5'
        })
        await loadPayroll()
      }
    } catch (error) {
      console.error('Error approving payroll:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to approve payroll',
        confirmButtonColor: '#EF4444'
      })
    } finally {
      loading.value = false
    }
  }
}

// ============================================
// REJECT PAYROLL (Finance)
// ============================================
const rejectPayroll = async (record) => {
  const { value: notes } = await Swal.fire({
    title: 'Reject Payroll',
    text: 'Please provide a reason for rejection:',
    input: 'textarea',
    inputPlaceholder: 'Enter reason for rejection...',
    inputAttributes: {
      'aria-label': 'Rejection reason'
    },
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Reject',
    cancelButtonText: 'Cancel'
  })

  if (notes !== undefined) {
    loading.value = true
    try {
      const response = await api.put(`/payroll.php?id=${record.id}`, {
        status: 'rejected',
        approved_by: authStore.user?.id || 1,
        notes: `Rejected by ${authStore.user?.full_name || 'Finance'}: ${notes || 'No reason provided'}`
      })

      if (response.data.success) {
        await Swal.fire({
          icon: 'info',
          title: 'Payroll Rejected',
          text: 'The payroll has been rejected.',
          confirmButtonColor: '#4F46E5'
        })
        await loadPayroll()
      }
    } catch (error) {
      console.error('Error rejecting payroll:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to reject payroll',
        confirmButtonColor: '#EF4444'
      })
    } finally {
      loading.value = false
    }
  }
}

// ============================================
// VIEW DETAILS
// ============================================
const viewPayrollDetail = (record) => {
  selectedRecord.value = record
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRecord.value = null
}

// ============================================
// REFRESH
// ============================================
const refreshData = () => {
  loadPayroll()
  Swal.fire({
    icon: 'success',
    title: 'Refreshed!',
    timer: 1000,
    showConfirmButton: false
  })
}

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadPayroll()
})
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

.finance-payroll-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.page-header h2 i {
  color: #4F46E5;
}

.page-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .page-header h2 {
  color: #e2e8f0;
}

body.dark-mode .page-header p {
  color: #9ca3af;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-refresh {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: #4338CA;
  transform: translateY(-2px);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Stats */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

body.dark-mode .stat-card {
  background: #1e293b;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 0.7rem;
  color: #6b7280;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

body.dark-mode .stat-label {
  color: #9ca3af;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0.1rem 0 0 0;
}

body.dark-mode .stat-value {
  color: #e2e8f0;
}

/* Filters */
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

/* Table */
.table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow-x: auto;
}

body.dark-mode .table-wrapper {
  background: #1e293b;
}

.payroll-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

.payroll-table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .payroll-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.payroll-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .payroll-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.payroll-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .payroll-table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

.text-danger {
  color: #ef4444 !important;
}

.text-success {
  color: #10b981 !important;
}

.employee-cell {
  display: flex;
  flex-direction: column;
}

.employee-cell strong {
  color: #1a1a2e;
}

body.dark-mode .employee-cell strong {
  color: #e2e8f0;
}

.employee-email {
  font-size: 0.7rem;
  color: #6b7280;
}

body.dark-mode .employee-email {
  color: #9ca3af;
}

.period-text {
  font-size: 0.8rem;
  color: #1f2937;
}

body.dark-mode .period-text {
  color: #e2e8f0;
}

/* Status */
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

/* Actions */
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
  font-size: 0.75rem;
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
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: all 0.2s;
}

.btn-reject:hover {
  background: #DC2626;
}

.btn-view {
  background: transparent;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-view:hover {
  background: #e0e7ff;
}

body.dark-mode .btn-view:hover {
  background: #312e81;
}

.footer {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .footer {
  background: #1e293b;
  color: #9ca3af;
}

.footer strong {
  color: #1a1a2e;
}

body.dark-mode .footer strong {
  color: #e2e8f0;
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
  max-width: 550px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideDown 0.3s ease;
}

body.dark-mode .modal-content {
  background: #1e293b;
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

.btn-close:hover {
  color: #1f2937;
}

body.dark-mode .btn-close {
  color: #9ca3af;
}

body.dark-mode .btn-close:hover {
  color: #e2e8f0;
}

.modal-body {
  padding: 1.5rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

body.dark-mode .detail-item label {
  color: #9ca3af;
}

.detail-item .value {
  font-size: 0.95rem;
  font-weight: 500;
  color: #1a1a2e;
  margin-top: 0.1rem;
}

body.dark-mode .detail-item .value {
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

.btn-secondary:hover {
  background: #e5e7eb;
}

body.dark-mode .btn-secondary {
  background: #2d3748;
  color: #e2e8f0;
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

/* Responsive */
@media (max-width: 768px) {
  .finance-payroll-container {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-group {
    min-width: 100%;
  }

  .stats-cards {
    grid-template-columns: 1fr 1fr;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  .payroll-table {
    font-size: 0.8rem;
    min-width: 700px;
  }

  .modal-content {
    margin: 1rem;
    max-width: 100%;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
}
</style>