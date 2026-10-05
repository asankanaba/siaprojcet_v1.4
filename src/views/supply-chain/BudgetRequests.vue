<template>
  <div class="budget-requests-container">
    <div class="page-header">
      <div>
        <h2><i class="fas fa-hand-holding-usd"></i> Budget Requests</h2>
        <p>Manage supply chain budget requests</p>
      </div>
      <div class="header-actions">
        <button @click="showCreateModal = true" class="btn-primary">
          <i class="fas fa-plus"></i> New Request
        </button>
        <button @click="refreshData" class="btn-secondary">
          <i class="fas fa-sync" :class="{ spinning: loading }"></i>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-item">
        <span>Total Requests</span>
        <strong>{{ requests.length }}</strong>
      </div>
      <div class="stat-item">
        <span>Pending</span>
        <strong class="text-warning">{{ pendingCount }}</strong>
      </div>
      <div class="stat-item">
        <span>Approved</span>
        <strong class="text-success">{{ approvedCount }}</strong>
      </div>
      <div class="stat-item">
        <span>Rejected</span>
        <strong class="text-danger">{{ rejectedCount }}</strong>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-row">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input v-model="searchQuery" placeholder="Search..." @input="filterRequests" />
      </div>
      <select v-model="statusFilter" class="filter-select" @change="filterRequests">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>

    <!-- Table -->
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Department</th>
            <th>Purpose</th>
            <th>Amount</th>
            <th>Requested By</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="text-center">Loading...</td>
          </tr>
          <tr v-else-if="filteredRequests.length === 0">
            <td colspan="7" class="text-center">No budget requests found</td>
          </tr>
          <tr v-for="request in filteredRequests" :key="request.id">
            <td><strong>{{ request.department }}</strong></td>
            <td>{{ request.purpose }}</td>
            <td>₱{{ formatPrice(request.amount) }}</td>
            <td>{{ request.requested_by_name || 'Unknown' }}</td>
            <td>{{ formatDate(request.created_at) }}</td>
            <td>
              <span :class="getStatusClass(request.status)">
                {{ (request.status || 'pending').toUpperCase() }}
              </span>
            </td>
            <td>
              <button @click="viewRequest(request)" class="btn-view">
                <i class="fas fa-eye"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h5>New Budget Request</h5>
          <button @click="showCreateModal = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Department <span class="required">*</span></label>
            <input v-model="newRequest.department" type="text" class="form-control" placeholder="Enter department" />
          </div>
          <div class="form-group">
            <label>Amount <span class="required">*</span></label>
            <input v-model="newRequest.amount" type="number" class="form-control" placeholder="0.00" step="0.01" />
          </div>
          <div class="form-group">
            <label>Purpose <span class="required">*</span></label>
            <textarea v-model="newRequest.purpose" class="form-control" rows="3" placeholder="Describe the purpose..."></textarea>
          </div>
          <div class="info-box">
            <i class="fas fa-info-circle"></i>
            This request will be sent for approval. You'll be notified when it's processed.
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showCreateModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitRequest" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Submitting...' : 'Submit Request' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api/index.js'
import Swal from 'sweetalert2'

const loading = ref(false)
const submitting = ref(false)
const showCreateModal = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const requests = ref([])

const newRequest = ref({
  department: '',
  amount: '',
  purpose: '',
  requested_by: 1
})

// Computed
const pendingCount = computed(() => requests.value.filter(r => r.status === 'pending').length)
const approvedCount = computed(() => requests.value.filter(r => r.status === 'approved').length)
const rejectedCount = computed(() => requests.value.filter(r => r.status === 'rejected').length)

const filteredRequests = computed(() => {
  let result = requests.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(r => 
      r.department.toLowerCase().includes(query) ||
      r.purpose.toLowerCase().includes(query)
    )
  }
  
  if (statusFilter.value) {
    result = result.filter(r => r.status === statusFilter.value)
  }
  
  return result
})

// Methods
const formatPrice = (amount) => {
  return Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const getStatusClass = (status) => {
  if (status === 'approved') return 'status-approved'
  if (status === 'rejected') return 'status-rejected'
  return 'status-pending'
}

const refreshData = async () => {
  loading.value = true
  try {
    const response = await api.get('/budget_requests.php')
    requests.value = response.data || []
  } catch (error) {
    console.error('Error loading budget requests:', error)
  } finally {
    loading.value = false
  }
}

const filterRequests = () => {
  // Computed handles filtering
}

const submitRequest = async () => {
  if (!newRequest.value.department.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Department is required',
      confirmButtonColor: '#4F46E5'
    })
    return
  }
  
  if (!newRequest.value.amount || parseFloat(newRequest.value.amount) <= 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Amount must be greater than 0',
      confirmButtonColor: '#4F46E5'
    })
    return
  }
  
  if (!newRequest.value.purpose.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Purpose is required',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  submitting.value = true
  try {
    const response = await api.post('/budget_requests.php', newRequest.value)
    if (response.data.success) {
      showCreateModal.value = false
      await refreshData()
      await Swal.fire({
        icon: 'success',
        title: 'Request Submitted!',
        text: 'Your budget request has been sent for approval.',
        confirmButtonColor: '#4F46E5',
        timer: 2000,
        showConfirmButton: false
      })
      newRequest.value = { department: '', amount: '', purpose: '', requested_by: 1 }
    }
  } catch (error) {
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to submit request',
      confirmButtonColor: '#4F46E5'
    })
  } finally {
    submitting.value = false
  }
}

const viewRequest = (request) => {
  Swal.fire({
    title: 'Budget Request Details',
    html: `
      <div style="text-align: left;">
        <p><strong>Department:</strong> ${request.department}</p>
        <p><strong>Amount:</strong> ₱${formatPrice(request.amount)}</p>
        <p><strong>Purpose:</strong> ${request.purpose}</p>
        <p><strong>Requested By:</strong> ${request.requested_by_name || 'Unknown'}</p>
        <p><strong>Status:</strong> ${(request.status || 'pending').toUpperCase()}</p>
        <p><strong>Date:</strong> ${formatDate(request.created_at)}</p>
      </div>
    `,
    confirmButtonColor: '#4F46E5',
    confirmButtonText: 'Close'
  })
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.budget-requests-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Reuse styles from other components */
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

.btn-primary {
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

.btn-primary:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}

.btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

body.dark-mode .btn-secondary {
  background: #2d3748;
  color: #9ca3af;
}

body.dark-mode .btn-secondary:hover {
  background: #374151;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

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

.stat-item span {
  font-size: 0.8rem;
  color: #6b7280;
}

body.dark-mode .stat-item span {
  color: #9ca3af;
}

.stat-item strong {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
}

body.dark-mode .stat-item strong {
  color: #e2e8f0;
}

.text-warning {
  color: #f59e0b !important;
}

.text-success {
  color: #10b981 !important;
}

.text-danger {
  color: #ef4444 !important;
}

.filters-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  border: 2px solid #e5e7eb;
  flex: 1;
  min-width: 200px;
  max-width: 400px;
  transition: border-color 0.2s;
}

body.dark-mode .search-box {
  background: #1e293b;
  border-color: #374151;
}

.search-box:focus-within {
  border-color: #4F46E5;
}

.search-box i {
  color: #6b7280;
  margin-right: 0.5rem;
}

body.dark-mode .search-box i {
  color: #9ca3af;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-size: 0.9rem;
  color: #1f2937;
}

body.dark-mode .search-box input {
  color: #e2e8f0;
}

.filter-select {
  padding: 0.4rem 0.8rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 0.9rem;
  color: #1f2937;
  cursor: pointer;
  min-width: 130px;
}

body.dark-mode .filter-select {
  background: #1e293b;
  border-color: #374151;
  color: #e2e8f0;
}

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

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
  padding: 0.15rem 0.5rem;
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
  padding: 0.15rem 0.5rem;
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
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-rejected {
  background: #7f1d1d;
  color: #fca5a5;
}

.btn-view {
  background: none;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn-view:hover {
  background: #e0e7ff;
}

body.dark-mode .btn-view:hover {
  background: #312e81;
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

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
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
}

body.dark-mode .modal-content {
  background: #1e293b;
}

@keyframes slideDown {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
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
}

body.dark-mode .btn-close {
  color: #9ca3af;
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
  .budget-requests-container {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filters-row {
    flex-direction: column;
  }
  
  .search-box {
    max-width: 100%;
  }
  
  .stats-row {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>