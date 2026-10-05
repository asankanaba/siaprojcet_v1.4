<template>
  <div class="requests-container">
    <!-- Header -->
    <div class="requests-header">
      <div>
        <h2><i class="fas fa-hand-holding-usd"></i> Supply Chain Requests</h2>
        <p>Manage inventory requests and track supply chain workflow</p>
      </div>
      <div class="header-actions">
        <button @click="openNewRequest" class="btn-primary">
          <i class="fas fa-plus"></i> New Request
        </button>
        <button @click="refreshData" class="btn-secondary">
          <i class="fas fa-sync" :class="{ spinning: loading }"></i>
        </button>
      </div>
    </div>

    <!-- Workflow Status -->
    <div class="workflow-status">
      <div class="workflow-step" v-for="step in workflowSteps" :key="step.key">
        <div class="step-icon" :class="{ active: step.active, completed: step.completed }">
          <i :class="step.icon"></i>
        </div>
        <div class="step-label">{{ step.label }}</div>
        <div class="step-line" v-if="!step.last"></div>
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
        <span>Completed</span>
        <strong class="text-info">{{ completedCount }}</strong>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-row">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input v-model="searchQuery" placeholder="Search requests..." />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="budget_check">Budget Check</option>
        <option value="approved">Approved</option>
        <option value="ordered">Ordered</option>
        <option value="received">Received</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <!-- Requests Table -->
    <div class="table-wrapper">
      <table class="requests-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Quantity</th>
            <th>Status</th>
            <th>Requested By</th>
            <th>Supplier</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="text-center">Loading...</td>
          </tr>
          <tr v-else-if="filteredRequests.length === 0">
            <td colspan="7" class="text-center">No requests found</td>
          </tr>
          <tr v-for="request in filteredRequests" :key="request.id">
            <td><strong>{{ request.product_name || 'N/A' }}</strong></td>
            <td>{{ request.quantity }}</td>
            <td>
              <span :class="getStatusClass(request.status)">
                {{ getStatusLabel(request.status) }}
              </span>
            </td>
            <td>{{ request.requester_name || request.requested_by_name || 'Unknown' }}</td>
            <td>{{ request.supplier_name || 'N/A' }}</td>
            <td>{{ formatDate(request.created_at) }}</td>
            <td>
              <div class="action-buttons">
                <button @click="viewRequest(request)" class="btn-view" title="View Details">
                  <i class="fas fa-eye"></i>
                </button>
                <button v-if="request.status === 'pending' && isFinance"
                        @click="approveBudget(request.id)"
                        class="btn-approve"
                        title="Approve Budget">
                  <i class="fas fa-check"></i>
                </button>
                <button v-if="request.status === 'approved' && isSupplyChain"
                        @click="processOrder(request.id)"
                        class="btn-order"
                        title="Process Order">
                  <i class="fas fa-truck"></i>
                </button>
                <button v-if="request.status === 'ordered' && isSupplyChain"
                        @click="receiveOrder(request.id)"
                        class="btn-receive"
                        title="Receive Order">
                  <i class="fas fa-box"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="requests-footer">
      <span>Showing <strong>{{ filteredRequests.length }}</strong> requests</span>
    </div>

    <!-- New Request Modal -->
    <div v-if="showNewRequest" class="modal-overlay" @click.self="showNewRequest = false">
      <div class="modal-content">
        <div class="modal-header">
          <h5><i class="fas fa-file-invoice"></i> New Supply Request</h5>
          <button @click="showNewRequest = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Product <span class="required">*</span></label>
            <select v-model="newRequest.product_id" class="form-control">
              <option value="">Select Product</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.name }} (Stock: {{ product.stock }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Quantity <span class="required">*</span></label>
            <input v-model.number="newRequest.quantity" type="number" class="form-control" min="1" />
          </div>
          <div class="form-group">
            <label>Reason / Notes</label>
            <textarea v-model="newRequest.notes" class="form-control" rows="2" placeholder="Why is this needed?"></textarea>
          </div>
          <div class="info-box">
            <i class="fas fa-info-circle"></i>
            Flow: Inventory Check → Finance Check → Supplier Check → Order → Receive
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showNewRequest = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitRequest" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Submitting...' : 'Submit Request' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Request Details Modal -->
    <div v-if="showDetails" class="modal-overlay" @click.self="showDetails = false">
      <div class="modal-content details-modal">
        <div class="modal-header">
          <h5><i class="fas fa-file-invoice"></i> Request Details</h5>
          <button @click="showDetails = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body" v-if="selectedRequest">
          <div class="detail-row"><label>Product</label><span>{{ selectedRequest.product_name || 'N/A' }}</span></div>
          <div class="detail-row"><label>Quantity</label><span>{{ selectedRequest.quantity }}</span></div>
          <div class="detail-row">
            <label>Status</label>
            <span :class="getStatusClass(selectedRequest.status)">
              {{ getStatusLabel(selectedRequest.status) }}
            </span>
          </div>
          <div class="detail-row"><label>Requested By</label><span>{{ selectedRequest.requester_name || selectedRequest.requested_by_name || 'Unknown' }}</span></div>
          <div class="detail-row"><label>Supplier</label><span>{{ selectedRequest.supplier_name || 'N/A' }}</span></div>
          <div class="detail-row"><label>Date</label><span>{{ formatDate(selectedRequest.created_at) }}</span></div>
          <div class="detail-row" v-if="selectedRequest.notes"><label>Notes</label><span>{{ selectedRequest.notes }}</span></div>
          <div class="detail-row" v-if="selectedRequest.total_cost"><label>Total Cost</label><span class="text-success">₱{{ formatPrice(selectedRequest.total_cost) }}</span></div>
        </div>
        <div class="modal-footer">
          <button @click="showDetails = false" class="btn btn-secondary">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/index.js'
import Swal from 'sweetalert2'

const authStore = useAuthStore()

// ============================================
// STATE
// ============================================
const loading        = ref(false)
const submitting     = ref(false)
const searchQuery    = ref('')
const statusFilter   = ref('')
const showNewRequest = ref(false)
const showDetails    = ref(false)
const selectedRequest = ref(null)

const requests = ref([])
const products = ref([])

const newRequest = ref({
  product_id: '',
  quantity: 1,
  notes: ''
})

// ============================================
// COMPUTED
// ============================================
const isFinance     = computed(() => authStore.isFinance)
const isSupplyChain = computed(() => authStore.isSupplyChain)

const pendingCount = computed(() =>
  requests.value.filter(r => r.status === 'pending' || r.status === 'budget_check').length
)

const approvedCount = computed(() =>
  requests.value.filter(r => r.status === 'approved' || r.status === 'ordered').length
)

const completedCount = computed(() =>
  requests.value.filter(r => r.status === 'received').length
)

const filteredRequests = computed(() => {
  let result = requests.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(r =>
      (r.product_name || '').toLowerCase().includes(q) ||
      (r.requester_name || r.requested_by_name || '').toLowerCase().includes(q)
    )
  }
  if (statusFilter.value) result = result.filter(r => r.status === statusFilter.value)
  return result
})

const workflowSteps = computed(() => {
  const steps = [
    { key: 'inventory', label: 'Inventory Check', icon: 'fas fa-boxes', active: false, completed: false },
    { key: 'finance',   label: 'Finance Check',   icon: 'fas fa-coins', active: false, completed: false },
    { key: 'supplier',  label: 'Supplier Check',  icon: 'fas fa-building', active: false, completed: false },
    { key: 'order',     label: 'Order Process',   icon: 'fas fa-truck', active: false, completed: false },
    { key: 'complete',  label: 'Complete',        icon: 'fas fa-check-circle', active: false, completed: false, last: true }
  ]
  if (requests.value.length === 0) return steps
  const latest = requests.value[0]
  if (!latest) return steps
  const map = {
    'pending': 0, 'budget_check': 1, 'approved': 2,
    'ordered': 3, 'received': 4, 'cancelled': -1
  }
  const currentStep = map[latest.status] ?? 0
  steps.forEach((step, i) => {
    if (i < currentStep) step.completed = true
    else if (i === currentStep) step.active = true
  })
  return steps
})

// ============================================
// METHODS
// ============================================
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'
const formatPrice = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const getStatusClass = (s) => ({
  'pending': 'status-pending',
  'budget_check': 'status-pending',
  'approved': 'status-ordered',
  'ordered': 'status-ordered',
  'received': 'status-completed',
  'cancelled': 'status-cancelled'
}[s] || 'status-pending')

const getStatusLabel = (s) => ({
  'pending': 'Pending',
  'budget_check': 'Budget Check',
  'approved': 'Approved',
  'ordered': 'Ordered',
  'received': 'Received',
  'cancelled': 'Cancelled'
}[s] || s || 'Pending')

const loadRequests = async () => {
  loading.value = true
  try {
    const response = await api.get('/supply_chain.php')
    let list = []
    if (Array.isArray(response.data)) {
      list = response.data
    } else if (response.data && Array.isArray(response.data.data)) {
      list = response.data.data
    }
    requests.value = list
  } catch (error) {
    console.error('Error loading requests:', error)
    requests.value = []
  } finally {
    loading.value = false
  }
}

const loadProducts = async () => {
  try {
    const response = await api.get('/products.php')
    let list = []
    if (Array.isArray(response.data)) {
      list = response.data
    } else if (response.data && Array.isArray(response.data.data)) {
      list = response.data.data
    }
    products.value = list
  } catch (error) {
    console.error('Error loading products:', error)
    products.value = []
  }
}

const refreshData = async () => {
  await Promise.all([loadRequests(), loadProducts()])
}

const openNewRequest = () => {
  newRequest.value = { product_id: '', quantity: 1, notes: '' }
  showNewRequest.value = true
}

const submitRequest = async () => {
  if (!newRequest.value.product_id) {
    return Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Please select a product', confirmButtonColor: '#4F46E5' })
  }
  if (!newRequest.value.quantity || newRequest.value.quantity < 1) {
    return Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Quantity must be at least 1', confirmButtonColor: '#4F46E5' })
  }

  submitting.value = true
  try {
    const response = await api.post('/supply_chain.php', {
      product_id: newRequest.value.product_id,
      quantity: newRequest.value.quantity,
      requested_by: authStore.user?.id || 1,
      notes: newRequest.value.notes
    })

    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Request Submitted!',
        text: response.data.message || 'Your request has been submitted.',
        confirmButtonColor: '#4F46E5',
        timer: 2000,
        showConfirmButton: false
      })
      showNewRequest.value = false
      await loadRequests()
    } else {
      await Swal.fire({
        icon: 'info',
        title: 'Processed',
        text: response.data.message || 'Handled by the system.',
        confirmButtonColor: '#4F46E5'
      })
      showNewRequest.value = false
      await loadRequests()
    }
  } catch (error) {
    console.error('Error submitting request:', error)
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to submit request.',
      confirmButtonColor: '#4F46E5'
    })
  } finally {
    submitting.value = false
  }
}

const viewRequest = (r) => {
  selectedRequest.value = r
  showDetails.value = true
}

const approveBudget = async (id) => {
  const result = await Swal.fire({
    title: 'Approve Budget?',
    text: 'Approve budget for this request?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Approve'
  })
  if (!result.isConfirmed) return

  try {
    const response = await api.put(`/supply_chain.php?id=${id}`, {
      status: 'approved',
      approved_by: authStore.user?.id || 1
    })
    if (response.data.success) {
      await Swal.fire({ icon: 'success', title: 'Approved!', timer: 1200, showConfirmButton: false })
      await loadRequests()
    }
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Failed', text: error.response?.data?.message || 'Approve failed' })
  }
}

const processOrder = async (id) => {
  const result = await Swal.fire({
    title: 'Process Order?',
    text: 'Place order with supplier?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#8B5CF6',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Process'
  })
  if (!result.isConfirmed) return

  try {
    const response = await api.put(`/supply_chain.php?id=${id}`, { status: 'ordered' })
    if (response.data.success) {
      await Swal.fire({ icon: 'success', title: 'Order Placed!', timer: 1200, showConfirmButton: false })
      await loadRequests()
    }
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Failed', text: error.response?.data?.message || 'Failed' })
  }
}

const receiveOrder = async (id) => {
  const result = await Swal.fire({
    title: 'Receive Order?',
    text: 'Mark this order as received? Stock will be updated.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Receive'
  })
  if (!result.isConfirmed) return

  try {
    const response = await api.put(`/supply_chain.php?id=${id}`, { status: 'received' })
    if (response.data.success) {
      await Swal.fire({ icon: 'success', title: 'Received!', timer: 1200, showConfirmButton: false })
      await loadRequests()
    }
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Failed', text: error.response?.data?.message || 'Failed' })
  }
}

onMounted(refreshData)
</script>

<style scoped>
.requests-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
.requests-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
.requests-header h2 { font-size: 1.5rem; font-weight: 700; color: #1a1a2e; margin: 0; }
.requests-header h2 i { color: #8B5CF6; margin-right: .4rem; }
.requests-header p { color: #6b7280; margin: .25rem 0 0; }
.header-actions { display: flex; gap: .5rem; }
.btn-primary { background: #8B5CF6; color: #fff; border: none; padding: .5rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: .5rem; }
.btn-primary:hover { background: #7C3AED; }
.btn-secondary { background: #f3f4f6; color: #6b7280; border: none; padding: .5rem 1rem; border-radius: 8px; cursor: pointer; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.workflow-status { display: flex; align-items: center; justify-content: center; padding: 1.5rem 2rem; background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.1); margin-bottom: 1.5rem; flex-wrap: wrap; gap: .5rem; }
.workflow-step { display: flex; align-items: center; gap: .5rem; }
.step-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #9ca3af; font-size: .8rem; }
.step-icon.active { background: #8B5CF6; color: #fff; box-shadow: 0 0 0 4px rgba(139,92,246,.2); }
.step-icon.completed { background: #10B981; color: #fff; }
.step-label { font-size: .7rem; color: #6b7280; font-weight: 500; }
.step-line { width: 40px; height: 2px; background: #e5e7eb; }

.stats-row { display: flex; gap: 2rem; padding: .75rem 1rem; background: #fff; border-radius: 10px; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); flex-wrap: wrap; }
.stat-item { display: flex; align-items: center; gap: .5rem; }
.stat-item span { font-size: .8rem; color: #6b7280; }
.stat-item strong { font-size: 1rem; }
.text-warning { color: #f59e0b !important; }
.text-success { color: #10b981 !important; }
.text-info { color: #4F46E5 !important; }

.filters-row { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.search-box { display: flex; align-items: center; background: #fff; border-radius: 8px; padding: .4rem .8rem; border: 2px solid #e5e7eb; flex: 1; min-width: 200px; max-width: 400px; }
.search-box input { border: none; outline: none; background: transparent; width: 100%; font-size: .9rem; }
.filter-select { padding: .4rem .8rem; border: 2px solid #e5e7eb; border-radius: 8px; background: #fff; font-size: .9rem; }

.table-wrapper { background: #fff; border-radius: 12px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.requests-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
.requests-table th { padding: .6rem .75rem; text-align: left; font-size: .7rem; text-transform: uppercase; color: #6b7280; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
.requests-table td { padding: .6rem .75rem; border-bottom: 1px solid #f3f4f6; }
.text-center { text-align: center; padding: 1.5rem; color: #6b7280; }

.status-pending { background: #fef3c7; color: #92400e; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 600; display: inline-block; }
.status-ordered { background: #e0e7ff; color: #3730a3; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 600; display: inline-block; }
.status-completed { background: #d1fae5; color: #065f46; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 600; display: inline-block; }
.status-cancelled { background: #fee2e2; color: #991b1b; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 600; display: inline-block; }

.action-buttons { display: flex; gap: .25rem; flex-wrap: wrap; }
.btn-view { background: none; border: none; color: #4F46E5; cursor: pointer; padding: .2rem .4rem; border-radius: 4px; }
.btn-view:hover { background: #e0e7ff; }
.btn-approve { background: #10B981; color: #fff; border: none; padding: .2rem .5rem; border-radius: 4px; cursor: pointer; font-size: .7rem; }
.btn-order { background: #8B5CF6; color: #fff; border: none; padding: .2rem .5rem; border-radius: 4px; cursor: pointer; font-size: .7rem; }
.btn-receive { background: #10B981; color: #fff; border: none; padding: .2rem .5rem; border-radius: 4px; cursor: pointer; font-size: .7rem; }

.requests-footer { margin-top: 1rem; padding: .5rem 1rem; background: #fff; border-radius: 8px; text-align: center; font-size: .85rem; color: #6b7280; box-shadow: 0 1px 3px rgba(0,0,0,.1); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
.modal-content { background: #fff; border-radius: 16px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
.modal-header h5 { margin: 0; font-size: 1.1rem; }
.btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
.modal-body { padding: 1.5rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-weight: 600; font-size: .85rem; margin-bottom: .25rem; }
.form-control { width: 100%; padding: .5rem .75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: .9rem; }
.form-control:focus { outline: none; border-color: #8B5CF6; }
.required { color: #ef4444; }
.info-box { background: #ede9fe; color: #5b21b6; padding: .75rem 1rem; border-radius: 8px; font-size: .85rem; display: flex; align-items: center; gap: .5rem; margin-top: .5rem; }
.modal-footer { display: flex; gap: .5rem; padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; justify-content: flex-end; }
.btn { padding: .5rem 1.25rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-secondary { background: #f3f4f6; color: #1f2937; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }

.detail-row { display: flex; justify-content: space-between; padding: .4rem 0; border-bottom: 1px solid #f3f4f6; }
.detail-row label { font-weight: 600; color: #6b7280; font-size: .85rem; }
.detail-row span { color: #1f2937; font-size: .85rem; }

@media (max-width: 768px) {
  .requests-container { padding: 1rem; }
  .requests-header { flex-direction: column; align-items: flex-start; }
  .filters-row { flex-direction: column; }
  .stats-row { flex-direction: column; gap: .5rem; }
  .workflow-status { flex-direction: column; padding: 1rem; }
  .step-line { width: 2px; height: 20px; }
}
</style>