<template>
  <div class="proc-container">
    <div class="page-header">
      <div>
        <h2><i class="fas fa-file-invoice-dollar"></i> Supplier Invoices</h2>
        <p>Record invoices and run the 3-way match (PO ↔ GRN ↔ Invoice)</p>
      </div>
      <div class="header-actions">
        <button @click="openNew" class="btn-primary"><i class="fas fa-plus"></i> Record Invoice</button>
        <button @click="refresh" class="btn-secondary"><i class="fas fa-sync" :class="{ spinning: loading }"></i></button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-item"><span>Total</span><strong>{{ invoices.length }}</strong></div>
      <div class="stat-item"><span>Matched</span><strong class="text-success">{{ matchedCount }}</strong></div>
      <div class="stat-item"><span>Mismatches</span><strong class="text-danger">{{ stats.unmatchedInvoices }}</strong></div>
      <div class="stat-item"><span>Paid</span><strong class="text-info">{{ paidCount }}</strong></div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>PO #</th>
            <th>Supplier</th>
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center">Loading...</td></tr>
          <tr v-else-if="invoices.length === 0"><td colspan="7" class="text-center">No invoices yet</td></tr>
          <tr v-for="i in invoices" :key="i.id">
            <td><strong>{{ i.invoice_number }}</strong></td>
            <td>{{ i.po_number }}</td>
            <td>{{ i.supplier_name || '—' }}</td>
            <td>{{ formatDate(i.invoice_date) }}</td>
            <td>₱{{ fmt(i.total) }}</td>
            <td><span :class="statusClass(i.status)">{{ i.status.toUpperCase() }}</span></td>
            <td>
              <div class="action-buttons">
                <button @click="view(i)" class="btn-view" title="View"><i class="fas fa-eye"></i></button>
                <button v-if="i.status === 'matched' && isFinance" @click="goPay(i)" class="btn-pay" title="Pay"><i class="fas fa-money-bill-wave"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- New Invoice Modal -->
    <div v-if="showNew" class="modal-overlay" @click.self="showNew = false">
      <div class="modal-content">
        <div class="modal-header">
          <h5><i class="fas fa-file-invoice"></i> Record Supplier Invoice</h5>
          <button @click="showNew = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Purchase Order <span class="required">*</span></label>
            <select v-model="form.po_id" class="form-control" @change="onPoSelect">
              <option value="">Select PO</option>
              <option v-for="po in deliverablePos" :key="po.id" :value="po.id">
                {{ po.po_number }} — {{ po.product_name }} (₱{{ fmt(po.total_cost) }})
              </option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Invoice Number <span class="required">*</span></label>
              <input v-model="form.invoice_number" class="form-control" />
            </div>
            <div class="form-group">
              <label>Invoice Date <span class="required">*</span></label>
              <input v-model="form.invoice_date" type="date" class="form-control" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Subtotal <span class="required">*</span></label>
              <input v-model.number="form.subtotal" type="number" step="0.01" class="form-control" />
            </div>
            <div class="form-group">
              <label>Tax</label>
              <input v-model.number="form.tax" type="number" step="0.01" class="form-control" />
            </div>
          </div>
          <div class="form-group">
            <label>Total <span class="required">*</span></label>
            <input v-model.number="form.total" type="number" step="0.01" class="form-control" />
          </div>
          <div class="form-group">
            <label>Due Date</label>
            <input v-model="form.due_date" type="date" class="form-control" />
          </div>
          <div class="info-box">
            <i class="fas fa-info-circle"></i>
            On save, the system will run a 3-way match: PO amount ↔ received qty ↔ invoice.
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showNew = false" class="btn btn-secondary">Cancel</button>
          <button @click="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Saving...' : 'Record Invoice' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProcurementStore } from '@/stores/procurement'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { useAuthStore } from '@/stores/auth'
import Swal from 'sweetalert2'

const router  = useRouter()
const store   = useProcurementStore()
const scStore = useSupplyChainStore()
const auth    = useAuthStore()

const loading    = ref(false)
const submitting = ref(false)
const showNew    = ref(false)

const form = ref({
  po_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0],
  subtotal: 0, tax: 0, total: 0, due_date: ''
})

const invoices   = computed(() => store.invoices)
const stats      = computed(() => store.stats)
const isFinance  = computed(() => auth.isFinance)
const matchedCount = computed(() => invoices.value.filter(i => i.status === 'matched').length)
const paidCount    = computed(() => invoices.value.filter(i => i.status === 'paid').length)

const deliverablePos = computed(() =>
  scStore.purchaseOrders.filter(po =>
    ['grn_posted','delivered','invoiced'].includes(po.lifecycle_status)
  )
)

const fmt = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) : '—'
const statusClass = (s) => ({
  received: 'status-pending', matched: 'status-completed',
  mismatch: 'status-cancelled', paid: 'status-ordered', cancelled: 'status-cancelled'
}[s] || 'status-pending')

const refresh = async () => {
  loading.value = true
  await Promise.all([
    store.loadInvoices(),
    scStore.loadPurchaseOrders()
  ])
  loading.value = false
}

const openNew = () => {
  form.value = {
    po_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0],
    subtotal: 0, tax: 0, total: 0, due_date: ''
  }
  showNew.value = true
}

const onPoSelect = () => {
  const po = scStore.purchaseOrders.find(p => p.id === form.value.po_id)
  if (po) {
    form.value.subtotal = parseFloat(po.total_cost) || 0
    form.value.total = parseFloat(po.total_cost) || 0
  }
}

const submit = async () => {
  if (!form.value.po_id)        return Swal.fire({ icon:'warning', title:'Select PO', confirmButtonColor:'#4F46E5' })
  if (!form.value.invoice_number) return Swal.fire({ icon:'warning', title:'Invoice number required', confirmButtonColor:'#4F46E5' })
  if (!form.value.total)        return Swal.fire({ icon:'warning', title:'Total required', confirmButtonColor:'#4F46E5' })

  submitting.value = true
  try {
    const po = scStore.purchaseOrders.find(p => p.id === form.value.po_id)
    const r = await store.recordInvoice({
      ...form.value,
      supplier_id: po.supplier_id,
      matched_by: auth.user?.id
    })
    if (r.success) {
      showNew.value = false
      await refresh()
      if (r.matched) {
        Swal.fire({ icon: 'success', title: '3-Way Match OK', text: r.notes, confirmButtonColor: '#4F46E5' })
      } else {
        Swal.fire({ icon: 'warning', title: 'Mismatch Detected', text: r.notes, confirmButtonColor: '#4F46E5' })
      }
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Failed', text: e.response?.data?.message || e.message })
  } finally { submitting.value = false }
}

const view = (i) => {
  Swal.fire({
    title: i.invoice_number,
    html: `<div style="text-align:left;font-size:.9rem">
      <p><b>PO:</b> ${i.po_number}</p>
      <p><b>Supplier:</b> ${i.supplier_name}</p>
      <p><b>Total:</b> ₱${fmt(i.total)}</p>
      <p><b>Status:</b> ${i.status.toUpperCase()}</p>
      ${i.match_notes ? `<p><b>Match Notes:</b> ${i.match_notes}</p>` : ''}
    </div>`,
    confirmButtonColor: '#4F46E5'
  })
}

const goPay = (i) => {
  router.push({ path: '/supply-chain/procurement/payments', query: { invoice_id: i.id } })
}

onMounted(refresh)
</script>

<style scoped>
.proc-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
.page-header h2 { font-size:1.5rem; font-weight:700; color:#1a1a2e; margin:0; }
.page-header h2 i { color:#2563eb; margin-right:.4rem; }
.page-header p { color:#6b7280; margin:.25rem 0 0; }
.header-actions { display:flex; gap:.5rem; }
.btn-primary { background:#2563eb; color:#fff; border:none; padding:.5rem 1.2rem; border-radius:8px; cursor:pointer; font-weight:500; }
.btn-primary:hover { background:#1d4ed8; }
.btn-secondary { background:#f3f4f6; color:#6b7280; border:none; padding:.5rem 1rem; border-radius:8px; cursor:pointer; }
.stats-row { display:flex; gap:2rem; padding:.75rem 1rem; background:#fff; border-radius:10px; margin-bottom:1rem; box-shadow:0 1px 3px rgba(0,0,0,.1); flex-wrap:wrap; }
.stat-item { display:flex; align-items:center; gap:.5rem; }
.stat-item span { font-size:.8rem; color:#6b7280; }
.text-warning { color:#f59e0b!important; }
.text-success { color:#10b981!important; }
.text-danger  { color:#ef4444!important; }
.text-info    { color:#2563eb!important; }
.table-wrapper { background:#fff; border-radius:12px; overflow-x:auto; box-shadow:0 1px 3px rgba(0,0,0,.1); }
.data-table { width:100%; border-collapse:collapse; font-size:.85rem; }
.data-table th { padding:.6rem .75rem; text-align:left; font-size:.7rem; text-transform:uppercase; color:#6b7280; background:#f9fafb; border-bottom:1px solid #e5e7eb; }
.data-table td { padding:.6rem .75rem; border-bottom:1px solid #f3f4f6; }
.text-center { text-align:center; padding:1.5rem; color:#6b7280; }
.status-pending  { background:#fef3c7; color:#92400e; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-ordered  { background:#dbeafe; color:#1e40af; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-completed{ background:#d1fae5; color:#065f46; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-cancelled{ background:#fee2e2; color:#991b1b; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.action-buttons { display:flex; gap:.25rem; }
.btn-view { background:#4F46E5; color:#fff; border:none; padding:.25rem .5rem; border-radius:4px; cursor:pointer; }
.btn-pay  { background:#10B981; color:#fff; border:none; padding:.25rem .5rem; border-radius:4px; cursor:pointer; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem; }
.modal-content { background:#fff; border-radius:16px; max-width:560px; width:100%; max-height:90vh; overflow-y:auto; }
.modal-header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; border-bottom:1px solid #e5e7eb; }
.modal-header h5 { margin:0; font-size:1.1rem; }
.btn-close { background:none; border:none; font-size:1.5rem; cursor:pointer; color:#6b7280; }
.modal-body { padding:1.5rem; }
.form-group { margin-bottom:1rem; }
.form-group label { display:block; font-weight:600; font-size:.85rem; margin-bottom:.25rem; }
.form-control { width:100%; padding:.5rem .75rem; border:2px solid #e5e7eb; border-radius:8px; font-size:.9rem; }
.form-control:focus { outline:none; border-color:#2563eb; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.required { color:#ef4444; }
.info-box { background:#dbeafe; color:#1e40af; padding:.75rem 1rem; border-radius:8px; font-size:.85rem; display:flex; align-items:center; gap:.5rem; }
.modal-footer { display:flex; gap:.5rem; padding:1rem 1.5rem; border-top:1px solid #e5e7eb; justify-content:flex-end; }
.btn { padding:.5rem 1.25rem; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
.btn-secondary { background:#f3f4f6; color:#1f2937; }
.btn-primary:disabled { opacity:.6; cursor:not-allowed; }
</style>