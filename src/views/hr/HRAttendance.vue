<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="attendance-container">
          <!-- Header -->
          <header class="page-header">
            <div>
              <h2><i class="fas fa-clipboard-check"></i> Attendance</h2>
              <p>Manage employee attendance records</p>
            </div>
            <div class="header-actions">
              <button @click="refreshData" class="btn btn-outline" :disabled="loading">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
              <button @click="exportAttendance" class="btn btn-primary">
                <i class="fas fa-file-export"></i> Export CSV
              </button>
            </div>
          </header>

          <!-- Stats -->
          <div class="stats glass-panel">
            <div class="stat">
              <span>Total</span>
              <strong>{{ totalRecords }}</strong>
            </div>
            <div class="stat">
              <span>Present</span>
              <strong class="text-success">{{ presentCount }}</strong>
            </div>
            <div class="stat">
              <span>Late</span>
              <strong class="text-warning">{{ lateCount }}</strong>
            </div>
            <div class="stat">
              <span>Absent</span>
              <strong class="text-danger">{{ absentCount }}</strong>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters">
            <!-- Month -->
            <div class="filter-group">
              <label>Month</label>
              <GlassSelect
                v-model="filterMonth"
                :options="monthOptions"
                @change="onFilterChange"
              />
            </div>

            <!-- Year -->
            <div class="filter-group">
              <label>Year</label>
              <GlassSelect
                v-model="filterYear"
                :options="yearOptions"
                @change="onFilterChange"
              />
            </div>

            <!-- Day (optional) -->
            <div class="filter-group">
              <label>Day <small>(optional)</small></label>
              <GlassSelect
                v-model="filterDay"
                :options="dayOptions"
                @change="resetPage"
              />
            </div>

            <!-- Status -->
            <div class="filter-group">
              <label>Status</label>
              <GlassSelect
                v-model="filterStatus"
                :options="statusOptions"
                @change="resetPage"
              />
            </div>

            <!-- Search -->
            <div class="filter-group search-group">
              <label>Search</label>
              <div class="search glass-input">
                <i class="fas fa-search"></i>
                <input
                  v-model="searchQuery"
                  placeholder="Name, department..."
                  @input="resetPage"
                />
                <button
                  v-if="searchQuery"
                  @click="searchQuery = ''"
                  class="clear-btn"
                  type="button"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>

            <!-- Apply -->
            <div class="filter-group btn-group">
              <button @click="loadAttendance" class="btn btn-primary">
                <i class="fas fa-search"></i> Apply
              </button>
            </div>
          </div>

          <!-- Table -->
          <div class="table-wrapper glass-panel">
            <table class="data-table">
              <thead>
                <tr>
                  <th @click="sortBy('full_name')" class="sortable">
                    Employee <i :class="sortIcon('full_name')"></i>
                  </th>
                  <th @click="sortBy('department')" class="sortable">
                    Department <i :class="sortIcon('department')"></i>
                  </th>
                  <th @click="sortBy('date')" class="sortable">
                    Date <i :class="sortIcon('date')"></i>
                  </th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th @click="sortBy('hours')" class="sortable">
                    Hours <i :class="sortIcon('hours')"></i>
                  </th>
                  <th @click="sortBy('status')" class="sortable">
                    Status <i :class="sortIcon('status')"></i>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="8" class="state-loading">
                    <div class="spinner"></div>
                    <span>Loading...</span>
                  </td>
                </tr>
                <tr v-else-if="paginated.length === 0">
                  <td colspan="8" class="state-empty">
                    <i class="fas fa-inbox"></i>
                    <p>No attendance records found</p>
                    <span class="hint">Try changing the filters</span>
                  </td>
                </tr>
                <tr v-for="record in paginated" :key="record.id ?? `${record.user_id}-${record.date}`">
                  <td>
                    <div class="employee-info">
                      <div class="avatar-sm">{{ initialsOf(record.full_name) }}</div>
                      <span class="employee-name">{{ record.full_name || 'Unknown' }}</span>
                    </div>
                  </td>
                  <td>{{ record.department || 'General' }}</td>
                  <td>{{ formatDate(record.date) }}</td>
                  <td>{{ record.clock_in || '—' }}</td>
                  <td>{{ record.clock_out || '—' }}</td>
                  <td>{{ record.hours || '0h 0m' }}</td>
                  <td>
                    <span :class="getStatusClass(record.status)">
                      {{ (record.status || 'present').toUpperCase() }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button @click="editRecord(record)" class="action-btn edit" title="Edit">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button @click="deleteRecord(record.id)" class="action-btn delete" title="Delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div v-if="totalFiltered > 0" class="pagination glass-panel">
            <span class="pagination-info">
              Showing <strong>{{ startIndex }}</strong>–<strong>{{ endIndex }}</strong> of <strong>{{ totalFiltered }}</strong>
            </span>
            <div class="pagination-controls">
              <GlassSelect
                v-model="pageSize"
                :options="pageSizeOptions"
                class="page-size-glass"
                @change="resetPage"
              />
              <button @click="page--" :disabled="page === 1" class="page-btn">
                <i class="fas fa-chevron-left"></i>
              </button>
              <span class="page-current">{{ page }} / {{ totalPages }}</span>
              <button @click="page++" :disabled="page >= totalPages" class="page-btn">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
    <div class="modal-content glass-modal">
      <div class="modal-header">
        <h5><i class="fas fa-edit"></i> Edit Attendance</h5>
        <button @click="closeEditModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Employee</label>
          <input :value="editForm.full_name" type="text" class="form-control" disabled />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Clock In</label>
            <input v-model="editForm.clock_in" type="time" class="form-control" />
          </div>
          <div class="form-group">
            <label>Clock Out</label>
            <input v-model="editForm.clock_out" type="time" class="form-control" />
          </div>
        </div>
        <div class="form-group">
          <label>Status</label>
          <GlassSelect
            v-model="editForm.status"
            :options="editStatusOptions"
          />
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeEditModal" class="btn btn-secondary">Cancel</button>
        <button @click="updateRecord" class="btn btn-primary" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import GlassSelect from '@/components/common/GlassSelect.vue'
import api from '@/api/index.js'
import Swal from 'sweetalert2'

const authStore = useAuthStore()

// ============================================
// STATE
// ============================================
const attendanceRecords = ref([])
const loading = ref(false)
const isRefreshing = ref(false)
const isSaving = ref(false)
const showEditModal = ref(false)

// Filters — Month/Year default to current
const now = new Date()
const filterMonth = ref(now.getMonth() + 1)
const filterYear = ref(now.getFullYear())
const filterDay = ref('')
const filterStatus = ref('all')
const searchQuery = ref('')

// Pagination / sort
const page = ref(1)
const pageSize = ref(25)
const sortKey = ref('date')
const sortDir = ref('desc')

// ============================================
// OPTIONS (for GlassSelect)
// ============================================
const months = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

const monthOptions = months.map((name, i) => ({ label: name, value: i + 1 }))

const yearOptions = (() => {
  const y = now.getFullYear()
  return [y - 2, y - 1, y, y + 1].map(v => ({ label: String(v), value: v }))
})()

const statusOptions = [
  { label: 'All Status', value: 'all' },
  { label: 'Present', value: 'present' },
  { label: 'Late', value: 'late' },
  { label: 'Absent', value: 'absent' }
]

const editStatusOptions = [
  { label: 'Present', value: 'present' },
  { label: 'Late', value: 'late' },
  { label: 'Absent', value: 'absent' }
]

const pageSizeOptions = [
  { label: '10 / page', value: 10 },
  { label: '25 / page', value: 25 },
  { label: '50 / page', value: 50 },
  { label: '100 / page', value: 100 }
]

const dayOptions = computed(() => {
  const days = new Set()
  attendanceRecords.value.forEach(r => {
    if (r.date) {
      const d = new Date(r.date).getDate()
      days.add(d)
    }
  })
  const sorted = Array.from(days).sort((a, b) => a - b)
  return [
    { label: 'All Days', value: '' },
    ...sorted.map(d => ({ label: `Day ${d}`, value: d }))
  ]
})

// ============================================
// EDIT FORM
// ============================================
const editForm = ref({
  id: null,
  user_id: null,
  full_name: '',
  date: '',
  clock_in: '',
  clock_out: '',
  status: 'present'
})

// ============================================
// COMPUTED
// ============================================
const filtered = computed(() => {
  let records = attendanceRecords.value

  if (filterDay.value !== '') {
    records = records.filter(r => {
      if (!r.date) return false
      return new Date(r.date).getDate() === Number(filterDay.value)
    })
  }

  if (filterStatus.value !== 'all') {
    records = records.filter(r => (r.status || '').toLowerCase() === filterStatus.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    records = records.filter(r =>
      (r.full_name || '').toLowerCase().includes(q) ||
      (r.department || '').toLowerCase().includes(q) ||
      (r.username || '').toLowerCase().includes(q)
    )
  }

  return records
})

const sorted = computed(() => {
  const arr = [...filtered.value]
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1

  arr.sort((a, b) => {
    let va = a[key] ?? ''
    let vb = b[key] ?? ''
    if (key === 'date') {
      va = new Date(va).getTime() || 0
      vb = new Date(vb).getTime() || 0
    } else {
      va = String(va).toLowerCase()
      vb = String(vb).toLowerCase()
    }
    if (va < vb) return -1 * dir
    if (va > vb) return 1 * dir
    return 0
  })
  return arr
})

const totalFiltered = computed(() => sorted.value.length)
const totalPages    = computed(() => Math.max(1, Math.ceil(totalFiltered.value / pageSize.value)))
const paginated     = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return sorted.value.slice(start, start + pageSize.value)
})
const startIndex    = computed(() => totalFiltered.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1)
const endIndex      = computed(() => Math.min(page.value * pageSize.value, totalFiltered.value))

const totalRecords  = computed(() => attendanceRecords.value.length)
const presentCount  = computed(() => attendanceRecords.value.filter(r => r.status === 'present').length)
const lateCount     = computed(() => attendanceRecords.value.filter(r => r.status === 'late').length)
const absentCount   = computed(() => attendanceRecords.value.filter(r => r.status === 'absent').length)

// ============================================
// METHODS
// ============================================
const initialsOf = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (isNaN(d)) return 'N/A'
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const getStatusClass = (status) => ({
  present: 'status-present',
  late: 'status-late',
  absent: 'status-absent'
}[status] || 'status-present')

const onFilterChange = () => {
  resetPage()
  loadAttendance()
}

const resetPage = () => { page.value = 1 }

const sortBy = (key) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

const sortIcon = (key) => {
  if (sortKey.value !== key) return 'fas fa-sort'
  return sortDir.value === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'
}

const loadAttendance = async () => {
  loading.value = true
  try {
    const url = `/attendance.php?month=${filterMonth.value}&year=${filterYear.value}`
    const response = await api.get(url)

    if (Array.isArray(response.data)) {
      attendanceRecords.value = response.data
    } else if (response.data && response.data.success) {
      attendanceRecords.value = response.data.data || []
    } else {
      attendanceRecords.value = []
    }
    resetPage()
  } catch (error) {
    console.error('Error loading attendance:', error)
    attendanceRecords.value = []
  } finally {
    loading.value = false
  }
}

const refreshData = async () => {
  isRefreshing.value = true
  await loadAttendance()
  setTimeout(() => { isRefreshing.value = false }, 500)
}

const exportAttendance = () => {
  if (filtered.value.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'No Data',
      text: 'No attendance records to export',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  let csv = 'Employee,Department,Date,Clock In,Clock Out,Hours,Status\n'
  filtered.value.forEach(r => {
    csv += `"${r.full_name || 'Unknown'}",${r.department || 'General'},${r.date},${r.clock_in || ''},${r.clock_out || ''},${r.hours || ''},${r.status || ''}\n`
  })

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance_${filterYear.value}-${String(filterMonth.value).padStart(2, '0')}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}

const editRecord = (record) => {
  editForm.value = {
    id: record.id,
    user_id: record.user_id,
    full_name: record.full_name || 'Unknown',
    date: record.date || '',
    clock_in: record.clock_in ? record.clock_in.substring(0, 5) : '',
    clock_out: record.clock_out ? record.clock_out.substring(0, 5) : '',
    status: record.status || 'present'
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  isSaving.value = false
}

const updateRecord = async () => {
  isSaving.value = true
  try {
    const response = await api.put(`/attendance.php?id=${editForm.value.id}`, {
      status: editForm.value.status
    })

    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'Attendance record updated successfully',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      })
      closeEditModal()
      await loadAttendance()
    } else {
      throw new Error(response.data.message || 'Update failed')
    }
  } catch (error) {
    console.error('Error updating attendance:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to update attendance',
      confirmButtonColor: '#4F46E5'
    })
  } finally {
    isSaving.value = false
  }
}

const deleteRecord = async (id) => {
  const result = await Swal.fire({
    title: 'Delete Record?',
    text: 'Are you sure you want to delete this attendance record?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel'
  })

  if (!result.isConfirmed) return

  try {
    const response = await api.delete(`/attendance.php?id=${id}`)
    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Attendance record deleted successfully',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      })
      await loadAttendance()
    } else {
      throw new Error(response.data.message || 'Delete failed')
    }
  } catch (error) {
    console.error('Error deleting attendance:', error)
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to delete attendance',
      confirmButtonColor: '#4F46E5'
    })
  }
}

// ============================================
// LIFECYCLE
// ============================================
onMounted(loadAttendance)
</script>

<style scoped>
/* ============================================
   LAYOUT
   ============================================ */
.app-layout {
  display: flex;
  min-height: 100vh;
  background: transparent;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.page-content {
  flex: 1;
  padding: 1.5rem;
  background: transparent;
}

.attendance-container {
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
  background: transparent;
  border: none;
  box-shadow: none;
}

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.page-header h2 i { color: #4f46e5; }

.page-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
}

body.dark-mode .page-header h2 { color: #f1f5f9; }
body.dark-mode .page-header h2 i { color: #a78bfa; }
body.dark-mode .page-header p { color: #94a3b8; }

.header-actions { display: flex; gap: 0.5rem; }

/* ============================================
   BUTTONS
   ============================================ */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.3);
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.45);
}
body.dark-mode .btn-primary {
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.45);
}

.btn-outline {
  background: rgba(255, 255, 255, 0.55);
  color: #374151;
  border: 1px solid rgba(255, 255, 255, 0.7);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}
.btn-outline:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.75);
}
body.dark-mode .btn-outline {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border-color: rgba(167, 139, 250, 0.2);
}
body.dark-mode .btn-outline:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.15);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.6);
  color: #1f2937;
  border: 1px solid rgba(255, 255, 255, 0.75);
}
body.dark-mode .btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border-color: rgba(167, 139, 250, 0.2);
}

.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ============================================
   STATS
   ============================================ */
.stats {
  display: flex;
  gap: 2rem;
  padding: 0.9rem 1.25rem;
  border-radius: 14px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.stat { display: flex; align-items: center; gap: 0.5rem; }

.stat span {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}
body.dark-mode .stat span { color: #94a3b8; }

.stat strong {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
}
body.dark-mode .stat strong { color: #f1f5f9; }

.text-success { color: #10b981 !important; }
.text-warning { color: #f59e0b !important; }
.text-danger  { color: #ef4444 !important; }

/* ============================================
   FILTERS
   ============================================ */
.filters {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 130px;
}

.filter-group label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
body.dark-mode .filter-group label { color: #94a3b8; }

.filter-group label small {
  text-transform: none;
  font-weight: 400;
  color: #9ca3af;
}

.search-group { flex: 1; min-width: 220px; }
.btn-group { min-width: auto; }

.glass-input {
  background: rgba(255, 255, 255, 0.6);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 2px 12px rgba(31, 38, 135, 0.05);
}

body.dark-mode .glass-input {
  background: rgba(26, 22, 48, 0.55);
  border: 1px solid rgba(167, 139, 250, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

.search {
  display: flex;
  align-items: center;
  padding: 0.55rem 0.9rem;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.search:focus-within {
  border-color: rgba(79, 70, 229, 0.5);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
}

body.dark-mode .search:focus-within {
  border-color: rgba(167, 139, 250, 0.5);
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2);
}

.search i { color: #9ca3af; margin-right: 0.5rem; font-size: 0.85rem; }

.search input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-size: 0.9rem;
  color: #1f2937;
}
body.dark-mode .search input { color: #e2e8f0; }
.search input::placeholder { color: #9ca3af; }

.clear-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: all 0.15s;
}
.clear-btn:hover { color: #4f46e5; }

/* ============================================
   TABLE
   ============================================ */
.table-wrapper {
  border-radius: 14px;
  overflow: hidden;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}

.data-table th {
  padding: 0.75rem 0.85rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  background: rgba(255, 255, 255, 0.35);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  white-space: nowrap;
  position: sticky;
  top: 0;
  z-index: 2;
}

body.dark-mode .data-table th {
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  border-bottom-color: rgba(167, 139, 250, 0.1);
}

.data-table th.sortable { cursor: pointer; user-select: none; }
.data-table th.sortable:hover { color: #4f46e5; }
body.dark-mode .data-table th.sortable:hover { color: #a78bfa; }
.data-table th i { margin-left: 0.25rem; opacity: 0.5; }
.data-table th.sortable i { opacity: 0.8; }

.data-table td {
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .data-table td {
  border-bottom-color: rgba(167, 139, 250, 0.06);
  color: #e2e8f0;
}

.data-table tr:last-child td { border-bottom: none; }

.data-table tbody tr {
  transition: background 0.15s ease;
}

.data-table tbody tr:hover td {
  background: rgba(255, 255, 255, 0.4);
}
body.dark-mode .data-table tbody tr:hover td {
  background: rgba(124, 58, 237, 0.08);
}

.employee-info { display: flex; align-items: center; gap: 0.6rem; }

.avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.7rem;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.25);
}

.employee-name { font-weight: 500; }

/* Status pills */
.status-present,
.status-late,
.status-absent {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.status-present { background: rgba(16, 185, 129, 0.15); color: #059669; }
.status-late    { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.status-absent  { background: rgba(239, 68, 68, 0.15); color: #dc2626; }

body.dark-mode .status-present { background: rgba(16, 185, 129, 0.2); color: #34d399; }
body.dark-mode .status-late    { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
body.dark-mode .status-absent  { background: rgba(239, 68, 68, 0.2); color: #f87171; }

/* Actions */
.action-buttons { display: flex; gap: 0.25rem; }

.action-btn {
  background: none;
  border: none;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.85rem;
}

.action-btn.edit { color: #4f46e5; }
.action-btn.edit:hover { background: rgba(79, 70, 229, 0.1); }

.action-btn.delete { color: #ef4444; }
.action-btn.delete:hover { background: rgba(239, 68, 68, 0.1); }

body.dark-mode .action-btn.edit { color: #a78bfa; }
body.dark-mode .action-btn.edit:hover { background: rgba(124, 58, 237, 0.2); }

/* ============================================
   STATES
   ============================================ */
.state-loading,
.state-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  color: #6b7280;
  gap: 0.5rem;
  text-align: center;
}
body.dark-mode .state-loading,
body.dark-mode .state-empty { color: #94a3b8; }

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(79, 70, 229, 0.15);
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
body.dark-mode .spinner {
  border-color: rgba(167, 139, 250, 0.2);
  border-top-color: #a78bfa;
}

.state-empty i {
  font-size: 2.5rem;
  color: #d1d5db;
  margin-bottom: 0.5rem;
}
body.dark-mode .state-empty i { color: #475569; }

.state-empty p { font-weight: 600; margin: 0; }
.hint { font-size: 0.8rem; color: #9ca3af; }

/* ============================================
   PAGINATION
   ============================================ */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  margin-top: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.pagination-info { font-size: 0.85rem; color: #6b7280; }
.pagination-info strong { color: #1f2937; font-weight: 600; }
body.dark-mode .pagination-info { color: #94a3b8; }
body.dark-mode .pagination-info strong { color: #f1f5f9; }

.pagination-controls { display: flex; align-items: center; gap: 0.5rem; }

.page-size-glass {
  width: 110px;
}

.page-btn {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 0.35rem 0.65rem;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s ease;
}
body.dark-mode .page-btn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2);
  color: #cbd5e1;
}
.page-btn:hover:not(:disabled) {
  background: rgba(79, 70, 229, 0.1);
  border-color: #4f46e5;
  color: #4f46e5;
}
body.dark-mode .page-btn:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.2);
  border-color: #a78bfa;
  color: #a78bfa;
}
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.page-current {
  font-weight: 600;
  color: #1a1a2e;
  min-width: 60px;
  text-align: center;
  font-size: 0.85rem;
}
body.dark-mode .page-current { color: #f1f5f9; }

/* ============================================
   MODAL
   ============================================ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 15, 30, 0.4);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}
body.dark-mode .modal-overlay { background: rgba(0, 0, 0, 0.6); }

.modal-content {
  border-radius: 20px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideDown 0.25s ease;
}

@keyframes slideDown {
  from { transform: translateY(-30px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
body.dark-mode .modal-header { border-bottom-color: rgba(167, 139, 250, 0.1); }

.modal-header h5 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}
body.dark-mode .modal-header h5 { color: #f1f5f9; }

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}
.btn-close:hover { color: #1f2937; }
body.dark-mode .btn-close:hover { color: #e2e8f0; }

.modal-body { padding: 1.5rem; }
.form-group { margin-bottom: 1rem; }
.form-group label {
  display: block;
  font-weight: 600;
  font-size: 0.85rem;
  color: #1f2937;
  margin-bottom: 0.35rem;
}
body.dark-mode .form-group label { color: #e2e8f0; }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

.form-control {
  width: 100%;
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  font-size: 0.9rem;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.9);
  transition: all 0.2s;
}
.form-control:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
}
body.dark-mode .form-control {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2);
  color: #e2e8f0;
}

.modal-footer {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  justify-content: flex-end;
}
body.dark-mode .modal-footer { border-top-color: rgba(167, 139, 250, 0.1); }

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .page-content { padding: 1rem; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; }
  .header-actions .btn { flex: 1; justify-content: center; }
  .filters { flex-direction: column; }
  .filter-group { min-width: 100%; }
  .stats { flex-direction: column; gap: 0.5rem; }
  .form-row { grid-template-columns: 1fr; }
  .pagination { flex-direction: column; text-align: center; }
}
</style>