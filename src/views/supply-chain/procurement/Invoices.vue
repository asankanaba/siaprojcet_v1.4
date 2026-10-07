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
      <div class="stat-item"><span>Mismatches</span><strong class="text-danger">{{ mismatchCount }}</strong></div>
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

                <!-- Pay via PayMongo — only when matched -->
                <button
                  v-if="i.status === 'matched' && isFinance"
                  @click="openPay(i)"
                  class="btn-pay"
                  title="Pay via PayMongo"
                >
                  <i class="fas fa-money-bill-wave"></i> Pay
                </button>

                <!-- Already paid -->
                <span v-if="i.status === 'paid'" class="paid-badge">
                  <i class="fas fa-check-circle"></i> Paid
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ========================= -->
    <!-- New Invoice Modal -->
    <!-- ========================= -->
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
            On save, the system runs a strict 3-way match: PO amount ↔ received qty ↔ invoice.
            Payment is blocked unless all three match.
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

    <!-- ========================= -->
    <!-- Pay Modal (PayMongo) -->
    <!-- ========================= -->
    <div v-if="showPay" class="modal-overlay" @click.self="!payProcessing && (showPay = false)">
      <div class="modal-content pay-modal">
        <div class="modal-header">
          <h5><i class="fas fa-credit-card"></i> Pay Supplier via PayMongo</h5>
          <button @click="showPay = false" class="btn-close" :disabled="payProcessing">&times;</button>
        </div>
        <div class="modal-body">
          <div class="pay-summary">
            <div class="pay-row"><span>Invoice</span><strong>{{ payInvoice?.invoice_number }}</strong></div>
            <div class="pay-row"><span>Supplier</span><strong>{{ payInvoice?.supplier_name }}</strong></div>
            <div class="pay-row"><span>Amount</span><strong class="pay-amount">₱{{ fmt(payInvoice?.total) }}</strong></div>
          </div>

          <div class="form-group">
            <label>Payment Method</label>
            <select v-model="payForm.method" class="form-control">
              <option value="checkout">PayMongo Checkout (Card / GCash / Maya / GrabPay / QR Ph)</option>
              <option value="source">PayMongo Source (GCash / Maya / GrabPay only)</option>
            </select>
          </div>

          <div v-if="payError" class="pay-error">
            <i class="fas fa-exclamation-triangle"></i> {{ payError }}
          </div>

          <div class="info-box">
            <i class="fas fa-lock"></i>
            You'll be redirected to PayMongo's secure page to complete the payment.
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showPay = false" class="btn btn-secondary" :disabled="payProcessing">Cancel</button>
          <button @click="submitPay" class="btn btn-primary" :disabled="payProcessing">
            {{ payProcessing ? 'Redirecting...' : 'Proceed to PayMongo' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProcurementStore } from '@/stores/procurement'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/index'
import Swal from 'sweetalert2'

const router  = useRouter()
const route   = useRoute()
const store   = useProcurementStore()
const scStore = useSupplyChainStore()
const auth    = useAuthStore()

const loading    = ref(false)
const submitting = ref(false)
const showNew    = ref(false)

// Pay state
const showPay       = ref(false)
const payInvoice    = ref(null)
const payProcessing = ref(false)
const payError      = ref(null)
const payForm       = ref({ method: 'checkout' })

const form = ref({
  po_id: '', invoice_number: '', invoice_date: new Date().toISOString().split('T')[0],
  subtotal: 0, tax: 0, total: 0, due_date: ''
})

const invoices     = computed(() => store.invoices)
const isFinance    = computed(() => auth.isFinance)
const matchedCount = computed(() => invoices.value.filter(i => i.status === 'matched').length)
const mismatchCount = computed(() => invoices.value.filter(i => i.status === 'mismatch').length)
const paidCount    = computed(() => invoices.value.filter(i => i.status === 'paid').length)

const deliverablePos = computed(() =>
  scStore.purchaseOrders.filter(po =>
    ['grn_posted','delivered','invoiced','matched'].includes(po.lifecycle_status)
  )
)

const fmt = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) : '—'
const statusClass = (s) => ({
  received: 'status-pending', matched: 'status-completed',
  mismatch: 'status-cancelled', paid: 'status-paid', cancelled: 'status-cancelled'
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
  const po = scStore.purchaseOrders.find(p => String(p.id) === String(form.value.po_id))
  if (po) {
    form.value.subtotal = parseFloat(po.total_cost) || 0
    form.value.total = parseFloat(po.total_cost) || 0
  }
}

const submit = async () => {
  if (!form.value.po_id)           return Swal.fire({ icon:'warning', title:'Select PO', confirmButtonColor:'#4F46E5' })
  if (!form.value.invoice_number)  return Swal.fire({ icon:'warning', title:'Invoice number required', confirmButtonColor:'#4F46E5' })
  if (!form.value.total)           return Swal.fire({ icon:'warning', title:'Total required', confirmButtonColor:'#4F46E5' })

  submitting.value = true
  try {
    const po = scStore.purchaseOrders.find(p => String(p.id) === String(form.value.po_id))
    const r = await store.recordInvoice({
      ...form.value,
      supplier_id: po?.supplier_id,
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

// ============================================
// PAY VIA PAYMONGO
// ============================================
const openPay = (invoice) => {
  if (invoice.status !== 'matched') {
    return Swal.fire({
      icon: 'error',
      title: 'Cannot Pay',
      text: 'Invoice 3-way match has not passed. Payment blocked.',
      confirmButtonColor: '#4F46E5'
    })
  }
  payInvoice.value = invoice
  payForm.value = { method: 'checkout' }
  payError.value = null
  showPay.value = true
}

const submitPay = async () => {
  payProcessing.value = true
  payError.value = null
  try {
    const returnUrl = `${window.location.origin}/supply-chain/procurement/payments?invoice_id=${payInvoice.value.id}`
    const r = await api.post('/payments.php', {
      kind: payForm.value.method === 'source' ? 'create_source' : 'create_checkout',
      invoice_id: payInvoice.value.id,
      po_id: payInvoice.value.po_id,
      supplier_id: payInvoice.value.supplier_id,
      amount: Number(payInvoice.value.total),
      description: `Payment for ${payInvoice.value.invoice_number}`,
      return_url: returnUrl
    })

    const payload = r.data?.data || r.data
    if (payload?.checkout_url) {
      window.location.href = payload.checkout_url
    } else if (payload?.redirect_url) {
      window.location.href = payload.redirect_url
    } else {
      throw new Error(r.data?.message || 'No checkout URL returned')
    }
  } catch (e) {
    payError.value = e.response?.data?.message || e.message || 'Payment failed to start'
  } finally {
    payProcessing.value = false
  }
}

onMounted(async () => {
  await refresh()
  // Auto-open pay modal if returned from PayMongo with invoice_id in query
  if (route.query.invoice_id) {
    const inv = invoices.value.find(i => String(i.id) === String(route.query.invoice_id))
    if (inv && inv.status === 'matched') openPay(inv)
  }
})
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
.status-paid     { background:#dcfce7; color:#166534; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:700; }
.action-buttons { display:flex; gap:.25rem; align-items:center; }
.btn-view { background:#4F46E5; color:#fff; border:none; padding:.25rem .5rem; border-radius:4px; cursor:pointer; }
.btn-pay  { background:#10B981; color:#fff; border:none; padding:.35rem .7rem; border-radius:6px; cursor:pointer; font-size:.75rem; font-weight:600; display:inline-flex; align-items:center; gap:.3rem; }
.btn-pay:hover { background:#059669; }
.paid-badge { color:#16a34a; font-size:.75rem; font-weight:600; display:inline-flex; align-items:center; gap:.25rem; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem; }
.modal-content { background:#fff; border-radius:16px; max-width:560px; width:100%; max-height:90vh; overflow-y:auto; }
.pay-modal { max-width:520px; }
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
.info-box { background:#dbeafe; color:#1e40af; padding:.75rem 1rem; border-radius:8px; font-size:.85rem; display:flex; align-items:center; gap:.5rem; margin-top:.5rem; }
.modal-footer { display:flex; gap:.5rem; padding:1rem 1.5rem; border-top:1px solid #e5e7eb; justify-content:flex-end; }
.btn { padding:.5rem 1.25rem; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
.btn-secondary { background:#f3f4f6; color:#1f2937; }
.btn-primary:disabled { opacity:.6; cursor:not-allowed; }

/* Pay modal extras */
.pay-summary { background:#f9fafb; padding:1rem; border-radius:10px; margin-bottom:1.25rem; }
.pay-row { display:flex; justify-content:space-between; padding:.35rem 0; font-size:.9rem; }
.pay-row span { color:#6b7280; }
.pay-amount { color:#059669; font-size:1.15rem; }
.pay-error { background:#fee2e2; color:#991b1b; padding:.75rem 1rem; border-radius:8px; font-size:.85rem; display:flex; align-items:center; gap:.5rem; margin-top:.5rem; }
</style>