<template>
  <div class="proc-container">
    <div class="page-header">
      <div>
        <h2><i class="fas fa-file-signature"></i> Requisitions</h2>
        <p>Request goods/services → Finance approves → convert to Purchase Order</p>
      </div>
      <div class="header-actions">
        <button @click="openNew" class="btn-primary"><i class="fas fa-plus"></i> New Requisition</button>
        <button @click="refresh" class="btn-secondary"><i class="fas fa-sync" :class="{ spinning: loading }"></i></button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-item"><span>Total</span><strong>{{ requisitions.length }}</strong></div>
      <div class="stat-item"><span>Pending Finance</span><strong class="text-warning">{{ stats.pendingRequisitions }}</strong></div>
      <div class="stat-item"><span>Approved</span><strong class="text-success">{{ stats.approvedRequisitions }}</strong></div>
    </div>

    <div class="filters-row">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input v-model="search" placeholder="Search req # or product..." />
      </div>
      <select v-model="statusFilter" class="filter-select">
        <option value="">All Status</option>
        <option value="pending_finance">Pending Finance</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
        <option value="converted_to_po">Converted to PO</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Req #</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Est. Total</th>
            <th>Requested By</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center">Loading...</td></tr>
          <tr v-else-if="filtered.length === 0"><td colspan="7" class="text-center">No requisitions found</td></tr>
          <tr v-for="r in filtered" :key="r.id">
            <td><strong>{{ r.req_number }}</strong></td>
            <td>{{ r.product_name || r.product_name_real || 'N/A' }}</td>
            <td>{{ r.quantity }}</td>
            <td>₱{{ fmt(r.estimated_total) }}</td>
            <td>{{ r.requested_by_name || 'N/A' }}</td>
            <td><span :class="statusClass(r.status)">{{ statusLabel(r.status) }}</span></td>
            <td>
              <div class="action-buttons">
                <button v-if="isFinance && r.status === 'pending_finance'" @click="approve(r)" class="btn-approve" title="Approve"><i class="fas fa-check"></i></button>
                <button v-if="isFinance && r.status === 'pending_finance'" @click="reject(r)" class="btn-cancel" title="Reject"><i class="fas fa-times"></i></button>
                <button v-if="r.status === 'approved' && isSupplyChain" @click="convertToPo(r)" class="btn-order" title="Create PO"><i class="fas fa-file-invoice"></i></button>
                <button @click="view(r)" class="btn-view" title="View"><i class="fas fa-eye"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ==================================================== -->
    <!-- NEW REQUISITION MODAL                                -->
    <!-- ==================================================== -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h5>New Requisition</h5>
          <button @click="showModal = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">

          <!-- Product -->
          <div class="form-group">
            <label>Product</label>
            <select v-model="form.product_id" class="form-control" @change="onProductSelect">
              <option value="">— Select or type below —</option>
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }} (stock: {{ p.stock }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Or free-text product name</label>
            <input v-model="form.product_name" class="form-control" placeholder="If not in product list" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Quantity <span class="required">*</span></label>
              <input v-model.number="form.quantity" type="number" min="1" class="form-control" />
            </div>
            <div class="form-group">
              <label>Est. Unit Cost</label>
              <input v-model.number="form.estimated_unit_cost" type="number" step="0.01" class="form-control" />
            </div>
          </div>

          <!-- ⭐ DEPARTMENT DROPDOWN (NEW) -->
          <div class="form-group">
            <label>Department <span class="required">*</span></label>
            <select v-model="form.department" class="form-control" :disabled="budgetsLoading">
              <option value="">— Select department —</option>
              <option v-for="b in activeBudgets" :key="b.id" :value="b.category">
                {{ b.category }} — Remaining: ₱{{ fmt(b.allocated_amount - b.spent_amount) }}
              </option>
            </select>
            <small v-if="budgetsLoading" class="hint">Loading budgets…</small>
            <small v-else-if="!activeBudgets.length" class="hint hint-error">
              No active budgets. Ask Finance to allocate one first.
            </small>
          </div>

          <!-- Budget preview -->
          <div v-if="selectedBudget" class="info-box" style="background:#dbeafe;color:#1e40af;">
            <i class="fas fa-info-circle"></i>
            Budget: ₱{{ fmt(selectedBudget.allocated_amount) }} allocated,
            ₱{{ fmt(selectedBudget.spent_amount) }} spent,
            <strong>₱{{ fmt(selectedBudget.allocated_amount - selectedBudget.spent_amount) }} remaining</strong>
            <span v-if="estimatedTotal > 0">
              · This request: ₱{{ fmt(estimatedTotal) }}
              <strong v-if="estimatedTotal > remainingBudget" style="color:#dc2626;">
                (exceeds remaining!)
              </strong>
            </span>
          </div>

          <!-- Cost Center -->
          <div class="form-group">
            <label>Cost Center (optional)</label>
            <input v-model="form.cost_center" class="form-control" placeholder="e.g. Operations, R&D" />
          </div>

          <!-- Justification -->
          <div class="form-group">
            <label>Justification</label>
            <textarea v-model="form.justification" rows="3" class="form-control" placeholder="Why do you need this?"></textarea>
          </div>

          <!-- Urgency -->
          <div class="form-group">
            <label>Urgency</label>
            <select v-model="form.urgency" class="form-control">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div class="info-box">
            <i class="fas fa-info-circle"></i>
            This will go to Finance for budget approval.
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showModal = false" class="btn btn-secondary">Cancel</button>
          <button
            @click="submit"
            class="btn btn-primary"
            :disabled="submitting || !form.department"
          >
            {{ submitting ? 'Submitting...' : 'Submit Requisition' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProcurementStore } from '@/stores/procurement'
import { useProductStore } from '@/stores/products'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/index'
import Swal from 'sweetalert2'

const store        = useProcurementStore()
const productStore = useProductStore()
const auth         = useAuthStore()

const loading          = ref(false)
const submitting       = ref(false)
const showModal        = ref(false)
const search           = ref('')
const statusFilter     = ref('')
const budgets          = ref([])
const budgetsLoading   = ref(false)

const form = ref({
  product_id: '',
  product_name: '',
  quantity: 1,
  estimated_unit_cost: 0,
  department: '',           // ← NEW: selected from dropdown
  cost_center: '',
  justification: '',
  urgency: 'normal'
})

const requisitions = computed(() => store.requisitions)
const products     = computed(() => productStore.products)
const stats        = computed(() => store.stats)
const isFinance    = computed(() => auth.isFinance)
const isSupplyChain= computed(() => auth.isSupplyChain)

// ============================================================
// BUDGETS
// ============================================================
const activeBudgets = computed(() =>
  budgets.value.filter(b => b.status === 'active' || b.status === 'exhausted')
)

const selectedBudget = computed(() =>
  activeBudgets.value.find(b => b.category === form.value.department) || null
)

const estimatedTotal = computed(() =>
  (Number(form.value.quantity) || 0) * (Number(form.value.estimated_unit_cost) || 0)
)

const remainingBudget = computed(() => {
  if (!selectedBudget.value) return 0
  return Number(selectedBudget.value.allocated_amount) - Number(selectedBudget.value.spent_amount)
})

// ============================================================
// FILTERS
// ============================================================
const filtered = computed(() => {
  let r = requisitions.value
  if (search.value) {
    const q = search.value.toLowerCase()
    r = r.filter(x =>
      (x.req_number || '').toLowerCase().includes(q) ||
      (x.product_name || '').toLowerCase().includes(q) ||
      (x.product_name_real || '').toLowerCase().includes(q)
    )
  }
  if (statusFilter.value) r = r.filter(x => x.status === statusFilter.value)
  return r
})

// ============================================================
// HELPERS
// ============================================================
const fmt = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const statusLabel = (s) => ({
  pending_finance: 'Pending Finance',
  approved: 'Approved',
  rejected: 'Rejected',
  converted_to_po: 'Converted to PO',
  cancelled: 'Cancelled',
  paid: 'Paid',
  completed: 'Completed'
}[s] || s)

const statusClass = (s) => ({
  pending_finance: 'status-pending',
  approved: 'status-completed',
  rejected: 'status-cancelled',
  converted_to_po: 'status-ordered',
  cancelled: 'status-cancelled',
  paid: 'status-completed',
  completed: 'status-completed'
}[s] || 'status-pending')

// ============================================================
// DATA LOADING
// ============================================================
const loadBudgets = async () => {
  budgetsLoading.value = true
  try {
    const res = await api.get('/budgets.php')
    const payload = res.data?.data || res.data || []
    budgets.value = Array.isArray(payload) ? payload : []
  } catch (e) {
    console.error('loadBudgets:', e)
    budgets.value = []
  } finally {
    budgetsLoading.value = false
  }
}

const refresh = async () => {
  loading.value = true
  await Promise.all([
    store.loadRequisitions(),
    productStore.loadProducts?.(),
    loadBudgets()
  ])
  loading.value = false
}

// ============================================================
// MODAL
// ============================================================
const openNew = async () => {
  form.value = {
    product_id: '',
    product_name: '',
    quantity: 1,
    estimated_unit_cost: 0,
    department: '',
    cost_center: '',
    justification: '',
    urgency: 'normal'
  }
  showModal.value = true
  // Reload budgets in case Finance just added one
  await loadBudgets()
}

const onProductSelect = () => {
  const p = products.value.find(x => x.id === form.value.product_id)
  if (p) {
    form.value.product_name = p.name
    form.value.estimated_unit_cost = p.cost || p.price || 0
  }
}

const submit = async () => {
  // Frontend validation
  if (!form.value.quantity || form.value.quantity < 1) {
    return Swal.fire({ icon: 'warning', title: 'Quantity required', confirmButtonColor: '#4F46E5' })
  }
  if (!form.value.department) {
    return Swal.fire({ icon: 'warning', title: 'Department required', text: 'Please select a department.', confirmButtonColor: '#4F46E5' })
  }
  if (selectedBudget.value && estimatedTotal.value > remainingBudget.value) {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: 'Exceeds remaining budget',
      html: `This requisition is <b>₱${fmt(estimatedTotal.value)}</b><br>
             but only <b>₱${fmt(remainingBudget.value)}</b> remains in ${form.value.department}.<br><br>
             The backend will reject this. Continue anyway?`,
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Try anyway'
    })
    if (!confirm.isConfirmed) return
  }

  submitting.value = true
  try {
    const payload = {
      requested_by:        auth.user?.id,
      product_id:          form.value.product_id || null,
      product_name:        form.value.product_name || null,
      quantity:            form.value.quantity,
      estimated_unit_cost: form.value.estimated_unit_cost,
      department:          form.value.department,     // ← from dropdown
      cost_center:         form.value.cost_center || null,
      justification:       form.value.justification || null,
      urgency:             form.value.urgency
    }

    const r = await store.createRequisition(payload)

    if (r.success) {
      showModal.value = false
      await refresh()
      Swal.fire({
        icon: 'success',
        title: 'Requisition Submitted',
        html: `<b>${r.req_number}</b><br>Budget remaining: ₱${r.budget_remaining || '0.00'}`,
        timer: 2000,
        showConfirmButton: false
      })
    } else {
      throw new Error(r.message || 'Submission failed')
    }
  } catch (e) {
    Swal.fire({
      icon: 'error',
      title: 'Failed',
      text: e.response?.data?.message || e.message,
      confirmButtonColor: '#4F46E5'
    })
  } finally {
    submitting.value = false
  }
}

// ============================================================
// ACTIONS
// ============================================================
const approve = async (r) => {
  const c = await Swal.fire({
    title: 'Approve requisition?',
    html: `<b>${r.req_number}</b><br>Amount: ₱${fmt(r.estimated_total)}<br>Department: ${r.department}`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981'
  })
  if (!c.isConfirmed) return

  try {
    const res = await store.approveRequisition(r.id, auth.user?.id)
    if (res.success) {
      await refresh()
      Swal.fire({ icon: 'success', title: 'Approved', text: res.message, timer: 1500, showConfirmButton: false })
    } else {
      throw new Error(res.message)
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Failed', text: e.response?.data?.message || e.message })
  }
}

const reject = async (r) => {
  const { value: reason } = await Swal.fire({
    title: 'Reject requisition?',
    input: 'textarea',
    inputLabel: 'Reason',
    showCancelButton: true,
    confirmButtonColor: '#EF4444'
  })
  if (reason === undefined) return

  try {
    const res = await store.rejectRequisition(r.id, auth.user?.id, reason || 'No reason given')
    if (res.success) {
      await refresh()
      Swal.fire({ icon: 'success', title: 'Rejected', timer: 1200, showConfirmButton: false })
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Failed', text: e.response?.data?.message || e.message })
  }
}

const convertToPo = async (r) => {
  const c = await Swal.fire({
    title: 'Convert to Purchase Order?',
    html: `This will open the PO creation screen pre-filled with <b>${r.req_number}</b>.`,
    icon: 'info',
    showCancelButton: true,
    confirmButtonColor: '#8B5CF6'
  })
  if (c.isConfirmed) {
    window.location.href = `/supply-chain/purchase-orders?from_req=${r.id}`
  }
}

const view = (r) => {
  Swal.fire({
    title: `Requisition ${r.req_number}`,
    html: `
      <div style="text-align:left;font-size:.9rem">
        <p><b>Product:</b> ${r.product_name || r.product_name_real || 'N/A'}</p>
        <p><b>Quantity:</b> ${r.quantity}</p>
        <p><b>Estimated Total:</b> ₱${fmt(r.estimated_total)}</p>
        <p><b>Requested By:</b> ${r.requested_by_name || 'N/A'}</p>
        <p><b>Department:</b> ${r.department || 'N/A'}</p>
        <p><b>Urgency:</b> ${r.urgency || 'normal'}</p>
        <p><b>Status:</b> ${statusLabel(r.status)}</p>
        ${r.po_number ? `<p><b>PO #:</b> ${r.po_number}</p>` : ''}
        ${r.justification ? `<p><b>Justification:</b> ${r.justification}</p>` : ''}
        ${r.rejection_reason ? `<p><b>Rejection Reason:</b> ${r.rejection_reason}</p>` : ''}
      </div>`,
    confirmButtonColor: '#4F46E5'
  })
}

onMounted(refresh)
</script>

<style scoped>
.proc-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
.page-header h2 { font-size:1.5rem; font-weight:700; color:#1a1a2e; margin:0; }
.page-header h2 i { color:#8B5CF6; margin-right:.4rem; }
.page-header p { color:#6b7280; margin:.25rem 0 0; }
.header-actions { display:flex; gap:.5rem; }
.btn-primary { background:#8B5CF6; color:#fff; border:none; padding:.5rem 1.2rem; border-radius:8px; cursor:pointer; font-weight:500; display:flex; align-items:center; gap:.4rem; }
.btn-primary:hover { background:#7C3AED; }
.btn-primary:disabled { opacity:.6; cursor:not-allowed; }
.btn-secondary { background:#f3f4f6; color:#6b7280; border:none; padding:.5rem 1rem; border-radius:8px; cursor:pointer; }
.stats-row { display:flex; gap:2rem; padding:.75rem 1rem; background:#fff; border-radius:10px; margin-bottom:1rem; box-shadow:0 1px 3px rgba(0,0,0,.1); flex-wrap:wrap; }
.stat-item { display:flex; align-items:center; gap:.5rem; }
.stat-item span { font-size:.8rem; color:#6b7280; }
.stat-item strong { font-size:1rem; }
.text-warning { color:#f59e0b!important; }
.text-success { color:#10b981!important; }
.filters-row { display:flex; gap:1rem; margin-bottom:1rem; flex-wrap:wrap; }
.search-box { display:flex; align-items:center; background:#fff; border-radius:8px; padding:.4rem .8rem; border:2px solid #e5e7eb; flex:1; max-width:400px; }
.search-box input { border:none; outline:none; background:transparent; width:100%; }
.filter-select { padding:.4rem .8rem; border:2px solid #e5e7eb; border-radius:8px; background:#fff; }
.table-wrapper { background:#fff; border-radius:12px; overflow-x:auto; box-shadow:0 1px 3px rgba(0,0,0,.1); }
.data-table { width:100%; border-collapse:collapse; font-size:.85rem; }
.data-table th { padding:.6rem .75rem; text-align:left; font-size:.7rem; text-transform:uppercase; color:#6b7280; background:#f9fafb; border-bottom:1px solid #e5e7eb; }
.data-table td { padding:.6rem .75rem; border-bottom:1px solid #f3f4f6; }
.text-center { text-align:center; padding:1.5rem; color:#6b7280; }
.status-pending  { background:#fef3c7; color:#92400e; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-ordered  { background:#e0e7ff; color:#3730a3; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-completed{ background:#d1fae5; color:#065f46; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-cancelled{ background:#fee2e2; color:#991b1b; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.action-buttons { display:flex; gap:.25rem; }
.action-buttons button { border:none; padding:.25rem .5rem; border-radius:4px; cursor:pointer; color:#fff; font-size:.7rem; }
.btn-approve { background:#10B981; }
.btn-cancel  { background:#EF4444; }
.btn-order   { background:#8B5CF6; }
.btn-view    { background:#4F46E5; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem; }
.modal-content { background:#fff; border-radius:16px; max-width:520px; width:100%; max-height:90vh; overflow-y:auto; }
.modal-header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; border-bottom:1px solid #e5e7eb; }
.modal-header h5 { margin:0; font-size:1.1rem; }
.btn-close { background:none; border:none; font-size:1.5rem; cursor:pointer; color:#6b7280; }
.modal-body { padding:1.5rem; }
.form-group { margin-bottom:1rem; }
.form-group label { display:block; font-weight:600; font-size:.85rem; margin-bottom:.25rem; }
.form-control { width:100%; padding:.5rem .75rem; border:2px solid #e5e7eb; border-radius:8px; font-size:.9rem; }
.form-control:focus { outline:none; border-color:#8B5CF6; }
.form-control:disabled { background:#f3f4f6; cursor:not-allowed; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.required { color:#ef4444; }
.hint { display:block; font-size:.75rem; color:#6b7280; margin-top:.25rem; }
.hint-error { color:#ef4444; }
.info-box { background:#ede9fe; color:#5b21b6; padding:.75rem 1rem; border-radius:8px; font-size:.85rem; display:flex; align-items:center; gap:.5rem; }
.modal-footer { display:flex; gap:.5rem; padding:1rem 1.5rem; border-top:1px solid #e5e7eb; justify-content:flex-end; }
.btn { padding:.5rem 1.25rem; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
.btn-secondary { background:#f3f4f6; color:#1f2937; }
.btn-primary:disabled { opacity:.6; cursor:not-allowed; }
</style>