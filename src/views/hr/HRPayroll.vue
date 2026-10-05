<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="payroll-container">
          <!-- Header -->
          <div class="page-header">
            <div>
              <h2><i class="fas fa-wallet"></i> Payroll Management</h2>
              <p>Select employees with <kbd>Ctrl</kbd>+Click to process payroll for specific employees</p>
            </div>
            <div class="header-actions">
              <button @click="processPayroll" class="btn-process" :disabled="loading || selectedEmployees.length === 0">
                <i class="fas fa-calculator"></i> 
                Process Payroll 
                <span v-if="selectedEmployees.length > 0" class="btn-badge">{{ selectedEmployees.length }}</span>
              </button>
              <button @click="clearSelection" class="btn-clear" v-if="selectedEmployees.length > 0">
                <i class="fas fa-times"></i> Clear ({{ selectedEmployees.length }})
              </button>
              <button @click="exportPayroll" class="btn-export">
                <i class="fas fa-download"></i> Export
              </button>
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: loading }"></i>
              </button>
            </div>
          </div>

          <!-- Stats -->
          <div class="stats-cards">
            <div class="stat-card">
              <<div class="stat-icon" style="background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4F46E5;">>
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Total Employees</p>
                <p class="stat-value">{{ employees.length }}</p>
              </div>
            </div>
            <div class="stat-card" :class="{ 'selected-highlight': selectedEmployees.length > 0 }">
              <div class="stat-icon" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #10b981;">
                <i class="fas fa-user-check"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Selected</p>
                <p class="stat-value">{{ selectedEmployees.length }}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #fee2e2, #fecaca); color: #ef4444;">
                <i class="fas fa-times-circle"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Total Deductions</p>
                <p class="stat-value">₱{{ formatPrice(stats.totalDeductions) }}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #fef3c7, #fde68a); color: #f59e0b;">
                <i class="fas fa-percent"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Attendance Rate</p>
                <p class="stat-value">{{ attendanceRate }}%</p>
              </div>
            </div>
          </div>

          <!-- Employee List -->
          <div class="employees-list">
            <div class="list-header">
              <div class="header-info">
                <span><strong>{{ filteredEmployees.length }}</strong> employees</span>
                <span v-if="selectedEmployees.length > 0" class="selected-info">
                  <i class="fas fa-check-circle" style="color: #10b981;"></i>
                  {{ selectedEmployees.length }} selected
                </span>
              </div>
              <div class="header-actions-small">
                <button @click="selectAll" class="btn-select-all">
                  <i class="fas fa-check-double"></i> Select All
                </button>
                <button @click="clearSelection" class="btn-clear-small">
                  <i class="fas fa-times"></i> Clear
                </button>
              </div>
            </div>

            <div class="employee-grid">
              <div 
                v-for="employee in filteredEmployees" 
                :key="employee.id"
                @click="toggleEmployee(employee)"
                class="employee-card"
                :class="{ 
                  selected: isSelected(employee.id),
                  'has-attendance': employee.hasAttendance
                }"
                tabindex="0"
              >
                <div class="employee-check">
                  <i :class="isSelected(employee.id) ? 'fas fa-check-circle' : 'far fa-circle'"></i>
                </div>
                <div class="employee-avatar">
                  {{ getInitials(employee.full_name) }}
                </div>
                <div class="employee-info">
                  <div class="employee-name">{{ employee.full_name }}</div>
                  <div class="employee-details">
                    <span class="employee-dept">{{ employee.department || 'General' }}</span>
                    <span class="employee-role">{{ employee.role || 'Staff' }}</span>
                  </div>
                  <div class="employee-salary">
                    <span class="salary-type">{{ employee.salary_type || 'Daily' }}</span>
                    <span class="salary-rate">₱{{ formatPrice(employee.salary_rate || 0) }}</span>
                  </div>
                </div>
                <div class="employee-status">
                  <span v-if="employee.hasAttendance" class="status-badge present">
                    <i class="fas fa-check-circle"></i> Active
                  </span>
                  <span v-else class="status-badge absent">
                    <i class="fas fa-clock"></i> No Records
                  </span>
                </div>
                <div class="employee-select-hint">
                  <kbd>Ctrl</kbd> + Click
                </div>
              </div>

              <div v-if="filteredEmployees.length === 0" class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>No employees found</p>
              </div>
            </div>
          </div>

          <!-- Selected Summary -->
          <div v-if="selectedEmployees.length > 0" class="selected-summary">
            <div class="summary-header">
              <h4><i class="fas fa-user-check"></i> Selected Employees</h4>
              <span>{{ selectedEmployees.length }} selected</span>
            </div>
            <div class="selected-tags">
              <span v-for="emp in selectedEmployees" :key="emp.id" class="selected-tag">
                {{ emp.full_name }}
                <button @click="removeSelection(emp.id)" class="tag-remove">×</button>
              </span>
            </div>
          </div>

          <!-- Payroll Results -->
          <div class="table-wrapper" v-if="payrollRecords.length > 0 || loading">
            <table class="payroll-table">
              <thead>
                <tr>
                  <th style="width: 30px;">#</th>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Salary Rate</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="9" class="text-center">
                    <i class="fas fa-spinner spin"></i> Processing...
                  </td>
                </tr>
                <tr v-else-if="payrollRecords.length === 0">
                  <td colspan="9" class="text-center">No payroll records. Select employees and process payroll.</td>
                </tr>
                <tr v-for="(record, index) in payrollRecords" :key="`${record.user_id ?? 'u'}-${index}`">
                  <td>{{ index + 1 }}</td>
                  <td>{{ record.full_name || 'Unknown' }}</td>
                  <td>{{ record.department || 'General' }}</td>
                  <td>{{ formatDate(record.date) }}</td>
                  <td>
                    <span :class="getStatusClass(record.status)">
                      {{ (record.status || 'pending').toUpperCase() }}
                    </span>
                  </td>
                  <td>₱{{ formatPrice(record.salary_rate || 0) }}</td>
                  <td class="text-danger">-₱{{ formatPrice(record.deductions || record.deduction || 0) }}</td>
                  <td class="text-success">₱{{ formatPrice(record.net_pay || 0) }}</td>
                  <td>
                    <button @click="viewDetails(record)" class="btn-view" title="View Details">
                      <i class="fas fa-eye"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="payrollRecords.length > 0">
                <tr>
                  <td colspan="6" class="text-right"><strong>Totals:</strong></td>
                  <td class="text-danger"><strong>-₱{{ formatPrice(totalDeductions) }}</strong></td>
                  <td class="text-success"><strong>₱{{ formatPrice(totalNetPay) }}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePayrollStore } from '@/stores/payroll'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import Swal from 'sweetalert2'
import api from '@/api/index.js'

const payrollStore = usePayrollStore()
const authStore = useAuthStore()

// ============================================
// STATE
// ============================================
const loading = ref(false)
const selectedEmployees = ref([])
const employees = ref([])
const payrollRecords = ref([])
const stats = ref({
  totalDeductions: 0,
  totalNetPay: 0
})

// ============================================
// DATE HELPERS (Philippines Timezone)
// ============================================
const getPhilippinesDate = () => {
  const now = new Date()
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
  return phTime
}

const formatDateInput = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDateRange = (periodType) => {
  const now = getPhilippinesDate()
  let startDate = new Date(now)
  let endDate = new Date(now)
  
  switch(periodType) {
    case 'daily':
      startDate = new Date(now)
      endDate = new Date(now)
      break
      
    case 'semi_monthly':
      const day = now.getDate()
      if (day <= 15) {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 15)
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 16)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
      break
      
    case 'monthly':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
  }
  
  return {
    start: formatDateInput(startDate),
    end: formatDateInput(endDate)
  }
}

// ============================================
// GLOBAL FUNCTION FOR SWEETALERT
// ============================================
// Define the updateDates function globally so it can be called from the HTML
window.updateDates = function() {
  const periodType = document.getElementById('periodType').value;
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  
  if (!startInput || !endInput) return;
  
  // Get current date in Philippines timezone
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  };
  
  let startDate, endDate;
  
  switch(periodType) {
    case 'daily':
      startDate = new Date(phTime);
      endDate = new Date(phTime);
      break;
    case 'semi_monthly':
      const day = phTime.getDate();
      if (day <= 15) {
        startDate = new Date(phTime.getFullYear(), phTime.getMonth(), 1);
        endDate = new Date(phTime.getFullYear(), phTime.getMonth(), 15);
      } else {
        startDate = new Date(phTime.getFullYear(), phTime.getMonth(), 16);
        endDate = new Date(phTime.getFullYear(), phTime.getMonth() + 1, 0);
      }
      break;
    case 'monthly':
    default:
      startDate = new Date(phTime.getFullYear(), phTime.getMonth(), 1);
      endDate = new Date(phTime.getFullYear(), phTime.getMonth() + 1, 0);
      break;
  }
  
  startInput.value = formatDate(startDate);
  endInput.value = formatDate(endDate);
}

// ============================================
// COMPUTED
// ============================================
const filteredEmployees = computed(() => employees.value)

const attendanceRate = computed(() => payrollStore.attendanceRate || 0)

const totalDeductions = computed(() => {
  return payrollRecords.value.reduce((sum, r) => sum + parseFloat(r.deductions || r.deduction || 0), 0)
})

const totalNetPay = computed(() => {
  return payrollRecords.value.reduce((sum, r) => sum + parseFloat(r.net_pay || 0), 0)
})

// ============================================
// METHODS
// ============================================
const formatPrice = (price) => {
  return Number(price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getInitials = (name) => {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

const getStatusClass = (status) => {
  const s = (status || 'pending').toLowerCase()
  if (s === 'approved') return 'status-approved'
  if (s === 'paid') return 'status-paid'
  if (s === 'present') return 'status-present'
  if (s === 'late') return 'status-late'
  if (s === 'absent') return 'status-absent'
  return 'status-pending'
}

const toggleEmployee = (employee) => {
  const index = selectedEmployees.value.findIndex(e => e.id === employee.id)
  if (index > -1) {
    selectedEmployees.value.splice(index, 1)
  } else {
    selectedEmployees.value.push(employee)
  }
}

const isSelected = (employeeId) => {
  return selectedEmployees.value.some(e => e.id === employeeId)
}

const selectAll = () => {
  selectedEmployees.value = [...filteredEmployees.value]
}

const clearSelection = () => {
  selectedEmployees.value = []
}

const removeSelection = (employeeId) => {
  selectedEmployees.value = selectedEmployees.value.filter(e => e.id !== employeeId)
}

const loadEmployees = async () => {
  loading.value = true
  try {
    const response = await api.get('/users.php')
    if (Array.isArray(response.data)) {
      employees.value = response.data.map(emp => ({
        ...emp,
        hasAttendance: false
      }))
      
      const today = formatDateInput(getPhilippinesDate())
      const attendanceResponse = await api.get(`/attendance.php?date=${today}`)
      if (Array.isArray(attendanceResponse.data)) {
        const attendedIds = new Set(attendanceResponse.data.map(r => r.user_id))
        employees.value.forEach(emp => {
          emp.hasAttendance = attendedIds.has(emp.id)
        })
      }
    }
  } catch (error) {
    console.error('Error loading employees:', error)
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to load employees',
      confirmButtonColor: '#EF4444'
    })
  } finally {
    loading.value = false
  }
}

const processPayroll = async () => {
  if (selectedEmployees.value.length === 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'No Employees Selected',
      text: 'Please select at least one employee using Ctrl+Click',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  // Get auto date ranges
  const dailyRange = getDateRange('daily')
  const semiMonthlyRange = getDateRange('semi_monthly')
  const monthlyRange = getDateRange('monthly')

  // Create a unique ID for this modal to avoid conflicts
  const modalId = 'payroll-modal-' + Date.now()

  const result = await Swal.fire({
    title: 'Process Payroll',
    html: `
      <div class="swal-emp-list">
            ${selectedEmployees.value.map(e => 
              `<div class="swal-emp-item">• ${e.full_name} (${e.department || 'General'})</div>`
            ).join('')}
          </div>
        <hr>
        <p><strong>Auto-deductions:</strong></p>
        <ul style="list-style: none; padding: 0;">
          <li>✅ Absences - Full day deduction</li>
          <li>✅ Lates - Pro-rated (10-min grace)</li>
          <li>✅ On Leave - No deduction</li>
        </ul>
        <hr>
        <div style="margin-top: 10px;">
          <label>Period Type:</label>
          <select id="periodType" class="form-control" onchange="window.updateDates()">
            <option value="daily">Daily</option>
            <option value="semi_monthly" selected>Semi-Monthly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div style="margin-top: 10px;">
          <label>Start Date:</label>
          <input id="startDate" type="date" class="form-control" value="${semiMonthlyRange.start}" />
        </div>
        <div style="margin-top: 10px;">
          <label>End Date:</label>
          <input id="endDate" type="date" class="form-control" value="${semiMonthlyRange.end}" />
        </div>
      </div>
    `,
    showCancelButton: true,
    confirmButtonColor: '#4F46E5',
    confirmButtonText: 'Process Now',
    cancelButtonText: 'Cancel',
    preConfirm: () => {
      const periodType = document.getElementById('periodType').value
      const startDate = document.getElementById('startDate').value
      const endDate = document.getElementById('endDate').value
      
      if (!startDate || !endDate) {
        Swal.showValidationMessage('Please select both start and end dates')
        return false
      }
      
      return { periodType, startDate, endDate }
    },
    width: '480px',
    didOpen: () => {
      // Ensure updateDates is called when the modal opens
      setTimeout(() => {
        if (typeof window.updateDates === 'function') {
          window.updateDates()
        }
      }, 100)
    }
  })

  if (result.isConfirmed) {
    loading.value = true
    try {
      const employeeIds = selectedEmployees.value.map(e => e.id)
      
      console.log('📤 Sending payroll request:', {
        periodType: result.value.periodType,
        startDate: result.value.startDate,
        endDate: result.value.endDate,
        employeeIds: employeeIds
      })
      
      const response = await payrollStore.processPayroll(
        result.value.periodType,
        result.value.startDate,
        result.value.endDate,
        employeeIds
      )

      console.log('📊 Payroll Response:', response)

      if (response && response.success !== undefined) {
        const summary = response.data?.summary || {}
        const details = response.data?.details || []
        
        payrollRecords.value = details
        stats.value.totalDeductions = summary.total_deductions || 0
        stats.value.totalNetPay = summary.total_net_pay || 0
        
        let message = ''
        if (details.length === 0) {
          message = '⚠️ No attendance records found for the selected period.<br>Make sure employees have clocked in/out.'
        } else {
          message = `
            <div style="text-align: left;">
              <p><strong>Period:</strong> ${result.value.startDate} to ${result.value.endDate}</p>
              <p><strong>Employees Processed:</strong> ${summary.total_employees || 0}</p>
              <p><strong>Total Records:</strong> ${summary.total_records || 0}</p>
              <p><strong>Total Deductions:</strong> ₱${(summary.total_deductions || 0).toFixed(2)}</p>
              <p><strong>Total Net Pay:</strong> ₱${(summary.total_net_pay || 0).toFixed(2)}</p>
              ${details.length > 0 ? `<p><strong>First Record:</strong> ${details[0].full_name} - ₱${(details[0].net_pay || 0).toFixed(2)}</p>` : ''}
            </div>
          `
        }
        
        await Swal.fire({
          icon: details.length > 0 ? 'success' : 'info',
          title: details.length > 0 ? 'Payroll Processed!' : 'No Records Found',
          html: message,
          confirmButtonColor: '#4F46E5'
        })
        
        await loadEmployees()
        
      } else {
        const errorMsg = response?.message || response?.data?.message || 'Failed to process payroll'
        console.error('❌ Payroll failed:', errorMsg)
        
        await Swal.fire({
          icon: 'error',
          title: 'Payroll Failed',
          text: errorMsg,
          confirmButtonColor: '#EF4444'
        })
      }
    } catch (error) {
      console.error('❌ Error processing payroll:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || error.message || 'Failed to process payroll',
        confirmButtonColor: '#EF4444'
      })
    } finally {
      loading.value = false
    }
  }
}

const exportPayroll = () => {
  if (payrollRecords.value.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'No Data',
      text: 'No payroll records to export',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  const headers = ['Employee', 'Department', 'Date', 'Status', 'Salary Rate', 'Deduction', 'Net Pay']
  const rows = payrollRecords.value.map(r => [
    r.full_name || 'Unknown',
    r.department || 'General',
    r.date || 'N/A',
    r.status?.toUpperCase() || 'N/A',
    r.salary_rate || 0,
    r.deduction || 0,
    r.net_pay || 0
  ])

  let csv = headers.join(',') + '\n'
  rows.forEach(row => {
    csv += row.join(',') + '\n'
  })

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payroll_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}

const refreshData = () => {
  loadEmployees()
  Swal.fire({
    icon: 'success',
    title: 'Refreshed!',
    timer: 1000,
    showConfirmButton: false
  })
}

const viewDetails = (record) => {
  Swal.fire({
    title: 'Payroll Details',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${record.full_name || 'Unknown'}</p>
        <p><strong>Department:</strong> ${record.department || 'General'}</p>
        <p><strong>Date:</strong> ${formatDate(record.date)}</p>
        <p><strong>Status:</strong> ${(record.status || 'pending').toUpperCase()}</p>
        <hr>
        <p><strong>Salary Rate:</strong> ₱${formatPrice(record.salary_rate || 0)}</p>
        <p><strong>Deduction:</strong> <span class="text-danger">-₱${formatPrice(record.deduction || 0)}</span></p>
        <p><strong>Reason:</strong> ${record.deduction_reason || 'N/A'}</p>
        <p><strong>Net Pay:</strong> <span class="text-success">₱${formatPrice(record.net_pay || 0)}</span></p>
      </div>
    `,
    confirmButtonColor: '#4F46E5',
    confirmButtonText: 'Close'
  })
}

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadEmployees()
})
</script>

<style scoped>
/* ============================================
   BASE LAYOUT
============================================ */
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
  min-height: 100vh;
}

body.dark-mode .page-content {
  background: #0f172a;
}

.payroll-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* ============================================
   HEADER
============================================ */
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

.page-header kbd {
  background: #e5e7eb;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
}

body.dark-mode .page-header kbd {
  background: #374151;
  color: #e2e8f0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn-process {
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

.btn-process:hover:not(:disabled) {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-process:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-badge {
  background: rgba(255,255,255,0.3);
  border-radius: 50%;
  padding: 0.05rem 0.4rem;
  font-size: 0.7rem;
  font-weight: 700;
}

.btn-clear {
  background: #ef4444;
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

.btn-clear:hover {
  background: #dc2626;
}

.btn-export {
  background: #10B981;
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

.btn-export:hover {
  background: #059669;
}

.btn-refresh {
  background: #f3f4f6;
  color: #6b7280;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: #e5e7eb;
}

body.dark-mode .btn-refresh {
  background: #2d3748;
  color: #9ca3af;
}

body.dark-mode .btn-refresh:hover {
  background: #374151;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============================================
   STATS CARDS
============================================ */
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
  transition: transform 0.2s;
}

body.dark-mode .stat-card {
  background: #1e293b;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.selected-highlight {
  border: 2px solid #10b981 !important;
  background: #ecfdf5 !important;
}

body.dark-mode .selected-highlight {
  background: #064e3b !important;
  border-color: #6ee7b7 !important;
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

/* ============================================
   EMPLOYEE LIST
============================================ */
.employees-list {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .employees-list {
  background: #1e293b;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.selected-info {
  color: #10b981;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.header-actions-small {
  display: flex;
  gap: 0.5rem;
}

.btn-select-all,
.btn-clear-small {
  padding: 0.3rem 0.8rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-select-all {
  background: #4F46E5;
  color: white;
}

.btn-select-all:hover {
  background: #4338CA;
}

.btn-clear-small {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-clear-small:hover {
  background: #e5e7eb;
}

body.dark-mode .btn-clear-small {
  background: #2d3748;
  color: #9ca3af;
}

body.dark-mode .btn-clear-small:hover {
  background: #374151;
}

.employee-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.employee-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-radius: 10px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

body.dark-mode .employee-card {
  background: #2d3748;
}

.employee-card:hover {
  border-color: #4F46E5;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.employee-card.selected {
  border-color: #10b981;
  background: #ecfdf5;
}

body.dark-mode .employee-card.selected {
  background: #064e3b;
  border-color: #6ee7b7;
}

.employee-card.has-attendance {
  border-left: 4px solid #10b981;
}

.employee-check {
  font-size: 1.1rem;
  color: #9ca3af;
  flex-shrink: 0;
}

.employee-card.selected .employee-check {
  color: #10b981;
}

.employee-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #4F46E5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.employee-info {
  flex: 1;
  min-width: 0;
}

.employee-name {
  font-weight: 600;
  color: #1a1a2e;
  font-size: 0.9rem;
}

body.dark-mode .employee-name {
  color: #e2e8f0;
}

.employee-details {
  display: flex;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #6b7280;
  margin-top: 0.1rem;
}

body.dark-mode .employee-details {
  color: #9ca3af;
}

.employee-salary {
  display: flex;
  gap: 0.5rem;
  font-size: 0.7rem;
  margin-top: 0.1rem;
}

.salary-type {
  background: #e0e7ff;
  color: #4F46E5;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
}

body.dark-mode .salary-type {
  background: #312e81;
  color: #a5b4fc;
}

.salary-rate {
  font-weight: 600;
  color: #1a1a2e;
}

body.dark-mode .salary-rate {
  color: #e2e8f0;
}

.employee-status {
  flex-shrink: 0;
}

.status-badge {
  font-size: 0.6rem;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.status-badge.present {
  background: #d1fae5;
  color: #065f46;
}

body.dark-mode .status-badge.present {
  background: #064e3b;
  color: #6ee7b7;
}

.status-badge.absent {
  background: #fef3c7;
  color: #92400e;
}

body.dark-mode .status-badge.absent {
  background: #78350f;
  color: #fcd34d;
}

.employee-select-hint {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 0.5rem;
  color: #9ca3af;
  opacity: 0.5;
}

.employee-select-hint kbd {
  background: #e5e7eb;
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
  font-size: 0.5rem;
  font-weight: 700;
}

body.dark-mode .employee-select-hint kbd {
  background: #374151;
  color: #e2e8f0;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
  grid-column: 1 / -1;
}

body.dark-mode .empty-state {
  color: #9ca3af;
}

.empty-state i {
  font-size: 2.5rem;
  color: #d1d5db;
  display: block;
  margin-bottom: 0.5rem;
}

body.dark-mode .empty-state i {
  color: #374151;
}

/* ============================================
   SELECTED SUMMARY
============================================ */
.selected-summary {
  background: #ecfdf5;
  border: 2px solid #10b981;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
}

body.dark-mode .selected-summary {
  background: #064e3b;
  border-color: #6ee7b7;
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.summary-header h4 {
  margin: 0;
  color: #065f46;
  font-weight: 600;
}

body.dark-mode .summary-header h4 {
  color: #6ee7b7;
}

.summary-header span {
  color: #065f46;
  font-weight: 600;
}

body.dark-mode .summary-header span {
  color: #6ee7b7;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.selected-tag {
  background: white;
  padding: 0.25rem 0.6rem;
  border-radius: 50px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid #10b981;
  color: #065f46;
}

body.dark-mode .selected-tag {
  background: #2d3748;
  color: #6ee7b7;
  border-color: #6ee7b7;
}

.tag-remove {
  background: transparent;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 1rem;
  padding: 0 0.2rem;
  font-weight: 700;
}

.tag-remove:hover {
  color: #dc2626;
}

/* ============================================
   PAYROLL TABLE
============================================ */
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
  min-width: 800px;
}

.payroll-table th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.75rem;
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
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}

body.dark-mode .payroll-table td {
  border-bottom-color: #2d3748;
}

.payroll-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .payroll-table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

body.dark-mode .text-center {
  color: #9ca3af;
}

.text-right {
  text-align: right;
}

.text-danger {
  color: #ef4444 !important;
  font-weight: 600;
}

.text-success {
  color: #10b981 !important;
  font-weight: 600;
}

.spin {
  animation: spin 1s linear infinite;
}

/* ============================================
   STATUS BADGES
============================================ */
.status-approved,
.status-paid {
  background: #d1fae5;
  color: #065f46;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-approved,
body.dark-mode .status-paid {
  background: #064e3b;
  color: #6ee7b7;
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

.status-present {
  background: #d1fae5;
  color: #065f46;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-present {
  background: #064e3b;
  color: #6ee7b7;
}

.status-late {
  background: #fef3c7;
  color: #92400e;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-late {
  background: #78350f;
  color: #fcd34d;
}

.status-absent {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-absent {
  background: #7f1d1d;
  color: #fca5a5;
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

/* ============================================
   RESPONSIVE
============================================ */
@media (max-width: 768px) {
  .payroll-container {
    padding: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions button {
    flex: 1;
    justify-content: center;
    min-width: 80px;
    font-size: 0.8rem;
    padding: 0.4rem 0.8rem;
  }

  .stats-cards {
    grid-template-columns: 1fr 1fr;
  }

  .employee-grid {
    grid-template-columns: 1fr;
  }

  .employee-card {
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .list-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* ============================================
   SWEETALERT OVERRIDES
============================================ */
:deep(.swal2-html-container .form-control) {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  color: #1f2937;
  transition: border-color 0.2s;
  font-family: inherit;
}

:deep(.swal2-html-container .form-control:focus) {
  outline: none;
  border-color: #4F46E5;
}

body.dark-mode :deep(.swal2-html-container .form-control) {
  background: #2d3748;
  border-color: #374151;
  color: #e2e8f0;
}

body.dark-mode :deep(.swal2-html-container .form-control:focus) {
  border-color: #4F46E5;
}

:deep(.swal2-html-container label) {
  display: block;
  font-weight: 600;
  font-size: 0.8rem;
  color: #1f2937;
  margin-bottom: 0.2rem;
}

body.dark-mode :deep(.swal2-html-container label) {
  color: #e2e8f0;
}

:deep(.swal2-html-container hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 0.75rem 0;
}

body.dark-mode :deep(.swal2-html-container hr) {
  border-top-color: #374151;
}
</style>    