<template>
  <div class="requests-container">
    <div class="requests-header">
      <div>
        <h2><i class="fas fa-hand-holding-usd"></i> Supply Chain Requests</h2>
        <p>Manage inventory requests and track the full procurement cycle</p>
      </div>
      <div class="header-actions">
        <button @click="openNewRequest" class="btn-primary"><i class="fas fa-plus"></i> New Request</button>
        <button @click="refreshData" class="btn-secondary"><i class="fas fa-sync" :class="{ spinning: loading }"></i></button>
      </div>
    </div>

    <div class="workflow-status">
      <div class="workflow-step" v-for="step in workflowSteps" :key="step.key">
        <div class="step-icon" :class="{ active: step.active, completed: step.completed }">
          <i :class="step.icon"></i>
        </div>
        <div class="step-label">{{ step.label }}</div>
        <div class="step-line" v-if="!step.last"></div>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-item"><span>Total</span><strong>{{ requests.length }}</strong></div>
      <div class="stat-item"><span>Pending</span><strong class="text-warning">{{ pendingCount }}</strong></div>
      <div class="stat-item"><span>Approved</span><strong class="text-success">{{ approvedCount }}</strong></div>
      <div class="stat-item"><span>Completed</span><strong class="text-info">{{ completedCount }}</strong></div>
    </div>

    <div class="filters-row">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input v-model="searchQuery" placeholder="Search requests..." />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option value="">All Status</option>
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="ordered">Ordered</option>
        <option value="unavailable">Unavailable</option>
        <option value="received">Received</option>
        <option value="paid">Paid</option>
        <option value="completed">Completed</option>
      </select>
    </div>

    <div class="table-wrapper">
      <table class="requests-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Requested By</th>
            <th>Supplier</th>
            <th>PO #</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="8" class="text-center">Loading...</td></tr>
          <tr v-else-if="filteredRequests.length === 0"><td colspan="8" class="text-center">No requests found</td></tr>
          <tr v-for="request in filteredRequests" :key="request.id">
            <td><strong>{{ request.product_name || 'N/A' }}</strong></td>
            <td>{{ request.quantity }}</td>
            <td><span :class="getStatusClass(request.status)">{{ getStatusLabel(request.status) }}</span></td>
            <td>{{ request.requester_name || 'Unknown' }}</td>
            <td>{{ request.supplier_name || 'N/A' }}</td>
            <td>
              <span v-if="request.po_number" class="po-link">{{ request.po_number }}</span>
              <span v-else class="muted">—</span>
            </td>
            <td>{{ formatDate(request.created_at) }}</td>
            <td>
              <div class="action-buttons">
                <button @click="viewRequest(request)" class="btn-view" title="View"><i class="fas fa-eye"></i></button>

                <template v-if="canApprove && request.status === 'pending'">
                  <button @click="openApproveModal(request)" class="btn-approve" title="Approve"><i class="fas fa-check"></i></button>
                  <button @click="openRejectModal(request)" class="btn-reject" title="Reject"><i class="fas fa-times"></i></button>
                </template>

                <template v-if="canOrder && request.status === 'approved'">
                  <button @click="openOrderModal(request)" class="btn-order" title="Place Order"><i class="fas fa-truck"></i> Order</button>
                  <button @click="openUnavailableModal(request)" class="btn-unavailable" title="Unavailable"><i class="fas fa-exclamation-triangle"></i></button>
                </template>

                <template v-if="canOrder && request.status === 'ordered'">
                  <button @click="openReceiveModal(request)" class="btn-receive" title="Receive"><i class="fas fa-box"></i> Receive</button>
                </template>

                <template v-if="canApprove && request.status === 'received'">
                  <button @click="openPayModal(request)" class="btn-pay" title="Pay via PayMongo"><i class="fas fa-credit-card"></i> Pay</button>
                </template>

                <template v-if="canApprove && request.status === 'paid'">
                  <button @click="openCloseModal(request)" class="btn-close-rate" title="Close & Rate"><i class="fas fa-check-double"></i> Close</button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ============== MODALS ============== -->

    <!-- NEW REQUEST -->
    <div v-if="modals.new" class="modal-overlay" @click.self="modals.new = false">
      <div class="modal-content">
        <div class="modal-header"><h5><i class="fas fa-file-invoice"></i> New Supply Request</h5>
          <button @click="modals.new = false" class="btn-close">&times;</button></div>
        <div class="modal-body">
          <div class="form-group">
            <label>Product <span class="required">*</span></label>
            <select v-model="forms.new.product_id" class="form-control">
              <option value="">Select Product</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (Stock: {{ p.stock }})</option>
            </select>
          </div>
          <div class="form-group"><label>Quantity <span class="required">*</span></label>
            <input v-model.number="forms.new.quantity" type="number" min="1" class="form-control" /></div>
          <div class="form-group"><label>Reason / Notes</label>
            <textarea v-model="forms.new.notes" rows="2" class="form-control"></textarea></div>
          <div class="info-box"><i class="fas fa-info-circle"></i> Flow: Inventory → Finance → Supplier → Order → Receive → Pay → Close</div>
        </div>
        <div class="modal-footer">
          <button @click="modals.new = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitNewRequest" class="btn btn-primary" :disabled="busy">{{ busy ? 'Submitting…' : 'Submit' }}</button>
        </div>
      </div>
    </div>

    <!-- APPROVE -->
    <div v-if="modals.approve" class="modal-overlay" @click.self="modals.approve = false">
      <div class="modal-content">
        <div class="modal-header"><h5><i class="fas fa-check-circle"></i> Approve Budget</h5>
          <button @click="modals.approve = false" class="btn-close">&times;</button></div>
        <div class="modal-body">
          <p>Approve <strong>{{ activeRequest?.product_name }}</strong> × {{ activeRequest?.quantity }}?</p>
          <div class="form-group"><label>Notes (optional)</label>
            <textarea v-model="forms.approve.notes" rows="2" class="form-control"></textarea></div>
        </div>
        <div class="modal-footer">
          <button @click="modals.approve = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitApprove" class="btn btn-success" :disabled="busy">Approve</button>
        </div>
      </div>
    </div>

    <!-- REJECT -->
    <div v-if="modals.reject" class="modal-overlay" @click.self="modals.reject = false">
      <div class="modal-content">
        <div class="modal-header"><h5><i class="fas fa-times-circle"></i> Reject Request</h5>
          <button @click="modals.reject = false" class="btn-close">&times;</button></div>
        <div class="modal-body">
          <p>Reject <strong>{{ activeRequest?.product_name }}</strong>?</p>
          <div class="form-group"><label>Reason <span class="required">*</span></label>
            <textarea v-model="forms.reject.reason" rows="3" class="form-control" placeholder="Why is this being rejected?"></textarea></div>
        </div>
        <div class="modal-footer">
          <button @click="modals.reject = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitReject" class="btn btn-danger" :disabled="busy || !forms.reject.reason">Reject</button>
        </div>
      </div>
    </div>

    <!-- ORDER -->
    <div v-if="modals.order" class="modal-overlay" @click.self="modals.order = false">
      <div class="modal-content">
        <div class="modal-header"><h5><i class="fas fa-truck"></i> Place Order</h5>
          <button @click="modals.order = false" class="btn-close">&times;</button></div>
        <div class="modal-body">
          <div class="summary-box">
            <div><span>Product</span><strong>{{ activeRequest?.product_name }}</strong></div>
            <div><span>Quantity</span><strong>{{ forms.order.quantity }}</strong></div>
          </div>
          <div class="form-group"><label>Quantity</label>
            <input v-model.number="forms.order.quantity" type="number" min="1" class="form-control" /></div>
          <div class="form-group"><label>Supplier <span class="required">*</span></label>
            <select v-model="forms.order.supplier_id" class="form-control">
              <option value="">-- Choose Supplier --</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id" :disabled="parseInt(s.stock_available) < forms.order.quantity">
                {{ s.name }} — ₱{{ formatPrice(s.price_per_unit) }}/unit · Stock: {{ s.stock_available }}
                {{ parseInt(s.stock_available) < forms.order.quantity ? '(insufficient)' : '' }}
              </option>
            </select>
          </div>
          <div class="info-box"><i class="fas fa-info-circle"></i> Only suppliers with sufficient stock are selectable.</div>
        </div>
        <div class="modal-footer">
          <button @click="modals.order = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitOrder" class="btn btn-primary" :disabled="busy || !forms.order.supplier_id">Confirm Order</button>
        </div>
      </div>
    </div>

    <!-- UNAVAILABLE -->
    <div v-if="modals.unavailable" class="modal-overlay" @click.self="modals.unavailable = false">
      <div class="modal-content">
        <div class="modal-header"><h5><i class="fas fa-exclamation-triangle"></i> Mark Unavailable</h5>
          <button @click="modals.unavailable = false" class="btn-close">&times;</button></div>
        <div class="modal-body">
          <p>Mark <strong>{{ activeRequest?.product_name }}</strong> as unavailable?</p>
          <div class="form-group"><label>Reason</label>
            <textarea v-model="forms.unavailable.reason" rows="2" class="form-control" placeholder="e.g. Supplier out of stock, lead time too long"></textarea></div>
        </div>
        <div class="modal-footer">
          <button @click="modals.unavailable = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitUnavailable" class="btn btn-warning" :disabled="busy">Mark Unavailable</button>
        </div>
      </div>
    </div>

    <!-- RECEIVE -->
    <div v-if="modals.receive" class="modal-overlay" @click.self="modals.receive = false">
      <div class="modal-content">
        <div class="modal-header"><h5><i class="fas fa-box-open"></i> Receive Goods</h5>
          <button @click="modals.receive = false" class="btn-close">&times;</button></div>
        <div class="modal-body">
          <div class="summary-box">
            <div><span>Product</span><strong>{{ activeRequest?.product_name }}</strong></div>
            <div><span>Ordered Qty</span><strong>{{ activeRequest?.quantity }}</strong></div>
            <div><span>Supplier</span><strong>{{ activeRequest?.supplier_name }}</strong></div>
          </div>
          <div class="form-group"><label>Received Qty</label>
            <input v-model.number="forms.receive.qty" type="number" min="1" class="form-control" /></div>
          <div class="form-group"><label>Condition Notes</label>
            <textarea v-model="forms.receive.notes" rows="2" class="form-control" placeholder="Any damage, shortfall, or issues?"></textarea></div>
          <div class="info-box"><i class="fas fa-check-circle"></i> This creates a GRN and adds {{ forms.receive.qty }} to stock.</div>
        </div>
        <div class="modal-footer">
          <button @click="modals.receive = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitReceive" class="btn btn-primary" :disabled="busy">Confirm Receipt</button>
        </div>
      </div>
    </div>

    <!-- PAY — Centered PayMongo modal -->
    <div v-if="modals.pay" class="modal-overlay" @click.self="!payLoading && (modals.pay = false)">
      <div class="modal-content pay-modal">
        <div class="modal-header">
          <h5><i class="fas fa-credit-card"></i> Pay Supplier via PayMongo</h5>
          <button @click="modals.pay = false" class="btn-close" :disabled="payLoading">&times;</button>
        </div>

        <div class="modal-body">
          <div class="pay-summary">
            <div class="pay-row"><span>PO</span><strong>{{ activeRequest?.po_number || '—' }}</strong></div>
            <div class="pay-row"><span>Supplier</span><strong>{{ activeRequest?.supplier_name || '—' }}</strong></div>
            <div class="pay-row"><span>Product</span><strong>{{ activeRequest?.product_name }} × {{ activeRequest?.quantity }}</strong></div>
            <div class="pay-row amount-row">
              <span>Amount</span>
              <strong class="amount">₱{{ formatPrice(activeRequest?.total_cost) }}</strong>
            </div>
          </div>

          <div class="form-group">
            <label>Payment Method</label>
            <div class="method-grid">
              <button type="button" class="method-btn" :class="{ selected: forms.pay.method === 'checkout' }" @click="forms.pay.method = 'checkout'">
                <i class="fas fa-credit-card"></i>
                <span>Checkout</span>
                <small>Card · GCash · Maya · GrabPay · QR Ph</small>
              </button>
              <button type="button" class="method-btn" :class="{ selected: forms.pay.method === 'source' }" @click="forms.pay.method = 'source'">
                <i class="fas fa-mobile-alt"></i>
                <span>Source</span>
                <small>GCash · Maya · GrabPay only</small>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Notes (optional)</label>
            <input v-model="forms.pay.notes" class="form-control" placeholder="Optional payment note" />
          </div>

          <div v-if="payError" class="error-box">
            <i class="fas fa-exclamation-triangle"></i> {{ payError }}
          </div>

          <div class="info-box">
            <i class="fas fa-lock"></i>
            You'll be securely redirected to PayMongo to complete the payment.
          </div>
        </div>

        <div class="modal-footer">
          <button @click="modals.pay = false" class="btn btn-secondary" :disabled="payLoading">Cancel</button>
          <button @click="submitPay" class="btn btn-primary" :disabled="payLoading">
            <i v-if="payLoading" class="fas fa-spinner fa-spin"></i>
            {{ payLoading ? 'Redirecting…' : `Pay ₱${formatPrice(activeRequest?.total_cost)}` }}
          </button>
        </div>
      </div>
    </div>

    <!-- CLOSE & RATE -->
    <div v-if="modals.close" class="modal-overlay" @click.self="modals.close = false">
      <div class="modal-content">
        <div class="modal-header"><h5><i class="fas fa-check-double"></i> Close & Rate Supplier</h5>
          <button @click="modals.close = false" class="btn-close">&times;</button></div>
        <div class="modal-body">
          <div class="summary-box">
            <div><span>Supplier</span><strong>{{ activeRequest?.supplier_name }}</strong></div>
            <div><span>Product</span><strong>{{ activeRequest?.product_name }}</strong></div>
          </div>
          <div class="form-group">
            <label>Rating <span class="required">*</span></label>
            <div class="rating-stars">
              <i v-for="n in 5" :key="n" class="fas fa-star"
                 :class="{ filled: n <= forms.close.rating }"
                 @click="forms.close.rating = n"></i>
            </div>
          </div>
          <div class="form-group"><label>Comment (optional)</label>
            <textarea v-model="forms.close.comment" rows="2" class="form-control" placeholder="Quality, delivery, communication…"></textarea></div>
          <div class="info-box"><i class="fas fa-info-circle"></i> Closing the request archives the PO and records the rating for future sourcing.</div>
        </div>
        <div class="modal-footer">
          <button @click="modals.close = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitClose" class="btn btn-primary" :disabled="busy || !forms.close.rating">Close Request</button>
        </div>
      </div>
    </div>

    <!-- DETAILS -->
    <div v-if="modals.details" class="modal-overlay" @click.self="modals.details = false">
      <div class="modal-content details-modal">
        <div class="modal-header"><h5><i class="fas fa-file-invoice"></i> Request Details</h5>
          <button @click="modals.details = false" class="btn-close">&times;</button></div>
        <div class="modal-body" v-if="activeRequest">
          <div class="detail-row"><label>Product</label><span>{{ activeRequest.product_name }}</span></div>
          <div class="detail-row"><label>Quantity</label><span>{{ activeRequest.quantity }}</span></div>
          <div class="detail-row"><label>Status</label>
            <span :class="getStatusClass(activeRequest.status)">{{ getStatusLabel(activeRequest.status) }}</span></div>
          <div class="detail-row"><label>Requested By</label><span>{{ activeRequest.requester_name || 'N/A' }}</span></div>
          <div class="detail-row"><label>Approved By</label><span>{{ activeRequest.approver_name || '—' }}</span></div>
          <div class="detail-row"><label>Ordered By</label><span>{{ activeRequest.orderer_name || '—' }}</span></div>
          <div class="detail-row"><label>Received By</label><span>{{ activeRequest.receiver_name || '—' }}</span></div>
          <div class="detail-row"><label>Paid By</label><span>{{ activeRequest.payer_name || '—' }}</span></div>
          <div class="detail-row"><label>Supplier</label><span>{{ activeRequest.supplier_name || 'N/A' }}</span></div>
          <div class="detail-row" v-if="activeRequest.po_number"><label>PO #</label><span>{{ activeRequest.po_number }}</span></div>
          <div class="detail-row" v-if="activeRequest.notes"><label>Notes</label><span>{{ activeRequest.notes }}</span></div>
          <div class="detail-row" v-if="activeRequest.rejected_reason"><label>Rejection Reason</label><span>{{ activeRequest.rejected_reason }}</span></div>
          <div class="detail-row" v-if="activeRequest.total_cost"><label>Total Cost</label><span class="text-success">₱{{ formatPrice(activeRequest.total_cost) }}</span></div>
        </div>
        <div class="modal-footer"><button @click="modals.details = false" class="btn btn-secondary">Close</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/index.js'
import Swal from 'sweetalert2'

const authStore = useAuthStore()
const route = useRoute()

const loading = ref(false)
const busy = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const requests = ref([])
const products = ref([])
const suppliers = ref([])
const activeRequest = ref(null)

const modals = ref({ new: false, approve: false, reject: false, order: false, unavailable: false, receive: false, pay: false, close: false, details: false })
const forms = ref({
  new:         { product_id: '', quantity: 1, notes: '' },
  approve:     { notes: '' },
  reject:      { reason: '' },
  order:       { supplier_id: '', quantity: 1 },
  unavailable: { reason: '' },
  receive:     { qty: 0, notes: '' },
  pay:         { method: 'checkout', notes: '' },
  close:       { rating: 5, comment: '' },
})

const payLoading = ref(false)
const payError = ref(null)

const canApprove = computed(() => authStore.hasAnyRole(['finance', 'admin', 'super_admin']))
const canOrder   = computed(() => authStore.hasAnyRole(['supply_chain', 'admin', 'super_admin']))

const pendingCount   = computed(() => requests.value.filter(r => r.status === 'pending').length)
const approvedCount  = computed(() => requests.value.filter(r => ['approved','ordered'].includes(r.status)).length)
const completedCount = computed(() => requests.value.filter(r => ['received','paid','completed'].includes(r.status)).length)

const filteredRequests = computed(() => {
  let r = requests.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    r = r.filter(x =>
      (x.product_name || '').toLowerCase().includes(q) ||
      (x.requester_name || '').toLowerCase().includes(q) ||
      (x.po_number || '').toLowerCase().includes(q)
    )
  }
  if (statusFilter.value) r = r.filter(x => x.status === statusFilter.value)
  return r
})

const workflowSteps = computed(() => {
  const steps = [
    { key: 'inv',  label: 'Inventory Check', icon: 'fas fa-boxes',         active: false, completed: false },
    { key: 'fin',  label: 'Finance Check',   icon: 'fas fa-coins',         active: false, completed: false },
    { key: 'sup',  label: 'Supplier Check',  icon: 'fas fa-building',      active: false, completed: false },
    { key: 'ord',  label: 'Order Process',   icon: 'fas fa-truck',         active: false, completed: false },
    { key: 'done', label: 'Complete',        icon: 'fas fa-check-circle',  active: false, completed: false, last: true },
  ]
  if (!requests.value.length) return steps
  const latest = requests.value[0]
  const map = { pending: 0, approved: 1, ordered: 3, unavailable: 2, received: 4, paid: 4, completed: 4, rejected: -1 }
  const idx = map[latest.status] ?? 0
  steps.forEach((s, i) => { if (i < idx) s.completed = true; else if (i === idx) s.active = true })
  return steps
})

const formatDate  = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'
const formatPrice = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const getStatusClass = (s) => ({
  pending:'status-pending', approved:'status-approved', rejected:'status-rejected',
  ordered:'status-ordered', unavailable:'status-unavailable', received:'status-completed',
  paid:'status-paid', completed:'status-paid', cancelled:'status-rejected'
}[s] || 'status-pending')

const getStatusLabel = (s) => ({
  pending:'Pending', approved:'Approved', rejected:'Rejected', ordered:'Ordered',
  unavailable:'Unavailable', received:'Received', paid:'Paid', completed:'Completed', cancelled:'Cancelled'
}[s] || s)

const loadRequests = async () => {
  loading.value = true
  try {
    const res = await api.get('/supply_chain.php')
    let list = []
    if (Array.isArray(res.data)) list = res.data
    else if (res.data && Array.isArray(res.data.data)) list = res.data.data
    requests.value = list
  } catch (e) { console.error(e); requests.value = [] }
  finally { loading.value = false }
}

const loadProducts = async () => {
  try {
    const res = await api.get('/products.php')
    let list = []
    if (Array.isArray(res.data)) list = res.data
    else if (res.data && Array.isArray(res.data.data)) list = res.data.data
    products.value = list
  } catch (e) { console.error(e) }
}

const loadSuppliers = async () => {
  try {
    const res = await api.get('/suppliers.php?status=active')
    suppliers.value = res.data?.data || []
  } catch (e) { console.error(e) }
}

const refreshData = async () => {
  await Promise.all([loadRequests(), loadProducts()])
}

const openNewRequest = () => {
  forms.value.new = { product_id: '', quantity: 1, notes: '' }
  modals.value.new = true
}
const openApproveModal = (req) => {
  activeRequest.value = req
  forms.value.approve = { notes: '' }
  modals.value.approve = true
}
const openRejectModal = (req) => {
  activeRequest.value = req
  forms.value.reject = { reason: '' }
  modals.value.reject = true
}
const openOrderModal = async (req) => {
  activeRequest.value = req
  forms.value.order = { supplier_id: req.supplier_id || '', quantity: req.quantity }
  modals.value.order = true
  await loadSuppliers()
}
const openUnavailableModal = (req) => {
  activeRequest.value = req
  forms.value.unavailable = { reason: '' }
  modals.value.unavailable = true
}
const openReceiveModal = (req) => {
  activeRequest.value = req
  forms.value.receive = { qty: parseInt(req.quantity) || 0, notes: '' }
  modals.value.receive = true
}
const openPayModal = (req) => {
  activeRequest.value = req
  forms.value.pay = { method: 'checkout', notes: '' }
  payError.value = null
  modals.value.pay = true
}
const openCloseModal = (req) => {
  activeRequest.value = req
  forms.value.close = { rating: 5, comment: '' }
  modals.value.close = true
}
const viewRequest = (req) => {
  activeRequest.value = req
  modals.value.details = true
}

const updateStatus = async (reqId, status, extra = {}) => {
  const payload = { status, actor_id: authStore.user?.id || 1, ...extra }
  const res = await api.put(`/supply_chain.php?id=${reqId}`, payload)
  if (!res.data.success) throw new Error(res.data.message || 'Update failed')
  return res.data
}

const submitNewRequest = async () => {
  if (!forms.value.new.product_id) return Swal.fire({ icon:'warning', title:'Select a product' })
  if (!forms.value.new.quantity || forms.value.new.quantity < 1) return Swal.fire({ icon:'warning', title:'Quantity must be ≥ 1' })

  busy.value = true
  try {
    const res = await api.post('/supply_chain.php', {
      product_id: forms.value.new.product_id,
      quantity: forms.value.new.quantity,
      requested_by: authStore.user?.id || 1,
      notes: forms.value.new.notes,
    })
    if (res.data.success) {
      modals.value.new = false
      await loadRequests()
      Swal.fire({ icon: res.data.status === 'available' ? 'info' : 'success',
        title: res.data.status === 'available' ? 'Stock Sufficient' : 'Request Submitted',
        text: res.data.message, timer: 2200, showConfirmButton: false })
    }
  } catch (e) {
    Swal.fire({ icon:'error', title:'Failed', text: e.response?.data?.message || e.message })
  } finally { busy.value = false }
}

const submitApprove = async () => {
  busy.value = true
  try {
    await updateStatus(activeRequest.value.id, 'approved', { notes: forms.value.approve.notes })
    modals.value.approve = false
    await loadRequests()
    Swal.fire({ icon:'success', title:'Approved', timer: 1200, showConfirmButton: false })
  } catch (e) { Swal.fire({ icon:'error', title:'Failed', text: e.response?.data?.message || e.message }) }
  finally { busy.value = false }
}

const submitReject = async () => {
  busy.value = true
  try {
    await updateStatus(activeRequest.value.id, 'rejected', { reject_reason: forms.value.reject.reason, notes: forms.value.reject.reason })
    modals.value.reject = false
    await loadRequests()
    Swal.fire({ icon:'success', title:'Rejected', timer: 1200, showConfirmButton: false })
  } catch (e) { Swal.fire({ icon:'error', title:'Failed', text: e.response?.data?.message || e.message }) }
  finally { busy.value = false }
}

const submitOrder = async () => {
  if (!forms.value.order.supplier_id) return Swal.fire({ icon:'warning', title:'Select a supplier' })
  busy.value = true
  try {
    const r = await updateStatus(activeRequest.value.id, 'ordered', {
      supplier_id: forms.value.order.supplier_id,
      quantity: forms.value.order.quantity,
    })
    modals.value.order = false
    await loadRequests()
    Swal.fire({ icon:'success', title:'Order Placed', text: r.po_number ? `PO ${r.po_number} created` : '', timer: 1800, showConfirmButton: false })
  } catch (e) { Swal.fire({ icon:'error', title:'Failed', text: e.response?.data?.message || e.message }) }
  finally { busy.value = false }
}

const submitUnavailable = async () => {
  busy.value = true
  try {
    await updateStatus(activeRequest.value.id, 'unavailable', { reject_reason: forms.value.unavailable.reason || 'Supplier out of stock' })
    modals.value.unavailable = false
    await loadRequests()
    Swal.fire({ icon:'info', title:'Marked Unavailable', timer: 1200, showConfirmButton: false })
  } catch (e) { Swal.fire({ icon:'error', title:'Failed', text: e.response?.data?.message || e.message }) }
  finally { busy.value = false }
}

const submitReceive = async () => {
  busy.value = true
  try {
    const r = await updateStatus(activeRequest.value.id, 'received', { notes: forms.value.receive.notes })
    modals.value.receive = false
    await loadRequests()
    Swal.fire({ icon:'success', title:'Received', text: r.grn_number ? `GRN ${r.grn_number}` : '', timer: 1800, showConfirmButton: false })
  } catch (e) { Swal.fire({ icon:'error', title:'Failed', text: e.response?.data?.message || e.message }) }
  finally { busy.value = false }
}

const submitPay = async () => {
  payLoading.value = true
  payError.value = null
  try {
    const returnUrl = `${window.location.origin}/supply-chain/requests?paid=${activeRequest.value.id}`
    const r = await api.post('/payments.php', {
      kind: forms.value.pay.method === 'source' ? 'create_source' : 'create_checkout',
      amount: Number(activeRequest.value.total_cost),
      description: forms.value.pay.notes || `Payment for ${activeRequest.value.po_number || 'PO'} — ${activeRequest.value.product_name}`,
      po_id: activeRequest.value.po_id,
      return_url: returnUrl,
      request_id: activeRequest.value.id,
      supplier_id: activeRequest.value.supplier_id,
    })
    const payload = r.data?.data || r.data
    const url = payload?.checkout_url || payload?.redirect_url
    if (!url) throw new Error(r.data?.message || 'No checkout URL returned')
    window.location.href = url
  } catch (e) {
    payError.value = e.response?.data?.message || e.message || 'Payment failed to start'
  } finally { payLoading.value = false }
}

const submitClose = async () => {
  busy.value = true
  try {
    await updateStatus(activeRequest.value.id, 'completed')

    if (activeRequest.value.po_id && activeRequest.value.supplier_id) {
      try {
        await api.post('/supplier_ratings.php', {
          supplier_id: activeRequest.value.supplier_id,
          po_id:       activeRequest.value.po_id,
          request_id:  activeRequest.value.id,
          rated_by:    authStore.user?.id || 1,
          rating:      forms.value.close.rating,
          comment:     forms.value.close.comment,
        })
      } catch (ratingErr) {
        console.warn('Rating save failed:', ratingErr)
      }
    }

    modals.value.close = false
    await loadRequests()
    Swal.fire({ icon:'success', title:'Closed & Rated', timer: 1500, showConfirmButton: false })
  } catch (e) { Swal.fire({ icon:'error', title:'Failed', text: e.response?.data?.message || e.message }) }
  finally { busy.value = false }
}

const handlePaymentReturn = async () => {
  const paidId = route.query.paid
  if (!paidId) return
  const req = requests.value.find(r => String(r.id) === String(paidId))
  if (!req || req.status === 'paid') return

  try {
    const r = await api.get('/payments.php', { params: { action: 'retrieve_latest_for_request', request_id: paidId } })
    const method = r.data?.data?.method || 'paymongo'
    const ref    = r.data?.data?.payment_ref || ''
    await updateStatus(paidId, 'paid', { payment_method: method, payment_reference: ref })
    await loadRequests()
    Swal.fire({ icon:'success', title:'Payment Recorded', timer: 1500, showConfirmButton: false })
  } catch (e) {
    console.warn('Return handling failed:', e)
  }
}

onMounted(async () => {
  await refreshData()
  await handlePaymentReturn()
})
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
.muted { color: #9ca3af; }
.po-link { font-family: ui-monospace, monospace; color: #4F46E5; font-weight: 600; font-size: .8rem; }

.status-pending { background: #fef3c7; color: #92400e; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 600; display: inline-block; }
.status-approved { background: #dbeafe; color: #1e40af; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 600; display: inline-block; }
.status-rejected { background: #fee2e2; color: #991b1b; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 600; display: inline-block; }
.status-ordered { background: #e0e7ff; color: #3730a3; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 600; display: inline-block; }
.status-unavailable { background: #fef3c7; color: #b45309; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 600; display: inline-block; }
.status-completed { background: #d1fae5; color: #065f46; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 600; display: inline-block; }
.status-paid { background: #dcfce7; color: #166534; padding: .15rem .5rem; border-radius: 50px; font-size: .7rem; font-weight: 700; display: inline-block; }

.action-buttons { display: flex; gap: .25rem; flex-wrap: wrap; }
.btn-view { background: none; border: none; color: #4F46E5; cursor: pointer; padding: .2rem .4rem; border-radius: 4px; }
.btn-view:hover { background: #e0e7ff; }
.btn-approve { background: #10B981; color: #fff; border: none; padding: .25rem .55rem; border-radius: 4px; cursor: pointer; font-size: .7rem; display: inline-flex; align-items: center; gap: .2rem; }
.btn-reject { background: #EF4444; color: #fff; border: none; padding: .25rem .55rem; border-radius: 4px; cursor: pointer; font-size: .7rem; display: inline-flex; align-items: center; gap: .2rem; }
.btn-order { background: #2563EB; color: #fff; border: none; padding: .25rem .55rem; border-radius: 4px; cursor: pointer; font-size: .7rem; display: inline-flex; align-items: center; gap: .2rem; }
.btn-unavailable { background: #F59E0B; color: #fff; border: none; padding: .25rem .55rem; border-radius: 4px; cursor: pointer; font-size: .7rem; }
.btn-receive { background: #10B981; color: #fff; border: none; padding: .25rem .55rem; border-radius: 4px; cursor: pointer; font-size: .7rem; display: inline-flex; align-items: center; gap: .2rem; }
.btn-pay { background: #059669; color: #fff; border: none; padding: .25rem .55rem; border-radius: 4px; cursor: pointer; font-size: .7rem; display: inline-flex; align-items: center; gap: .2rem; }
.btn-close-rate { background: #7C3AED; color: #fff; border: none; padding: .25rem .55rem; border-radius: 4px; cursor: pointer; font-size: .7rem; display: inline-flex; align-items: center; gap: .2rem; }

/* MODAL */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  background: #fff;
  border-radius: 16px;
  max-width: 520px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalPop 0.2s ease;
}

@keyframes modalPop {
  from { transform: translateY(10px) scale(0.98); opacity: 0; }
  to   { transform: translateY(0) scale(1);       opacity: 1; }
}

.pay-modal { max-width: 480px; }

.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
.modal-header h5 { margin: 0; font-size: 1.05rem; }
.btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; }
.modal-body { padding: 1.5rem; }
.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-weight: 600; font-size: .85rem; margin-bottom: .25rem; }
.form-control { width: 100%; padding: .5rem .75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: .9rem; }
.form-control:focus { outline: none; border-color: #8B5CF6; }
.required { color: #ef4444; }
.info-box { background: #ede9fe; color: #5b21b6; padding: .75rem 1rem; border-radius: 8px; font-size: .85rem; display: flex; align-items: center; gap: .5rem; margin-top: .5rem; }
.error-box { background: #fee2e2; color: #991b1b; padding: .75rem 1rem; border-radius: 8px; font-size: .85rem; margin-top: .5rem; display: flex; gap: .5rem; align-items: center; }
.modal-footer { display: flex; gap: .5rem; padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; justify-content: flex-end; }
.btn { padding: .5rem 1.25rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: .85rem; }
.btn-secondary { background: #f3f4f6; color: #1f2937; }
.btn-success { background: #10B981; color: #fff; }
.btn-danger  { background: #EF4444; color: #fff; }
.btn-warning { background: #F59E0B; color: #fff; }
.btn-primary:disabled { opacity: .6; cursor: not-allowed; }

.summary-box { display: flex; flex-direction: column; gap: .4rem; background: #f9fafb; padding: 1rem; border-radius: 10px; margin-bottom: 1rem; font-size: .9rem; }
.summary-box > div { display: flex; justify-content: space-between; }
.summary-box span { color: #6b7280; }
.summary-box .amount { color: #059669; font-weight: 700; }

/* Pay modal specific */
.pay-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: #f9fafb;
  padding: 1rem;
  border-radius: 10px;
  margin-bottom: 1.25rem;
  font-size: 0.9rem;
}

.pay-row {
  display: flex;
  justify-content: space-between;
}

.pay-row span {
  color: #6b7280;
}

.pay-row.amount-row {
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
  margin-top: 0.25rem;
}

.pay-row .amount {
  color: #059669;
  font-size: 1.25rem;
  font-weight: 700;
}

.method-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.method-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 1rem 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
  font-family: inherit;
}

.method-btn:hover {
  border-color: #8B5CF6;
  background: #faf5ff;
}

.method-btn.selected {
  border-color: #8B5CF6;
  background: #ede9fe;
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
}

.method-btn i {
  font-size: 1.5rem;
  color: #8B5CF6;
}

.method-btn span {
  font-weight: 600;
  font-size: 0.85rem;
  color: #1f2937;
}

.method-btn small {
  font-size: 0.68rem;
  color: #6b7280;
  line-height: 1.2;
}

.rating-stars { display: flex; gap: .4rem; font-size: 2rem; }
.rating-stars i { cursor: pointer; color: #d1d5db; transition: color .15s, transform .15s; }
.rating-stars i.filled { color: #F59E0B; }
.rating-stars i:hover { transform: scale(1.15); }

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
  .action-buttons { flex-direction: column; }
  .method-grid { grid-template-columns: 1fr; }
}
</style>