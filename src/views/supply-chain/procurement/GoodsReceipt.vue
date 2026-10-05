<template>
  <div class="proc-container">
    <div class="page-header">
      <div>
        <h2><i class="fas fa-box-open"></i> Accept Delivery (Goods Receipt)</h2>
        <p>Record goods received against a Purchase Order — creates a GRN</p>
      </div>
      <div class="header-actions">
        <button @click="refresh" class="btn-secondary"><i class="fas fa-sync" :class="{ spinning: loading }"></i></button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-item"><span>Awaiting Delivery</span><strong class="text-warning">{{ awaiting.length }}</strong></div>
      <div class="stat-item"><span>Delivered Today</span><strong class="text-success">{{ deliveredToday }}</strong></div>
    </div>

    <h3 class="section-title"><i class="fas fa-truck"></i> Purchase Orders Awaiting Delivery</h3>
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>PO #</th>
            <th>Product</th>
            <th>Supplier</th>
            <th>Ordered Qty</th>
            <th>Ordered Date</th>
            <th>Expected</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center">Loading...</td></tr>
          <tr v-else-if="awaiting.length === 0"><td colspan="7" class="text-center">Nothing awaiting delivery</td></tr>
          <tr v-for="po in awaiting" :key="po.id">
            <td><strong>{{ po.po_number }}</strong></td>
            <td>{{ po.product_name || '—' }}</td>
            <td>{{ po.supplier_name || '—' }}</td>
            <td>{{ po.quantity }}</td>
            <td>{{ formatDate(po.ordered_date) }}</td>
            <td>{{ po.expected_delivery || '—' }}</td>
            <td>
              <button @click="openAccept(po)" class="btn-accept">
                <i class="fas fa-check-circle"></i> Accept Delivery
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="section-title"><i class="fas fa-history"></i> Recent Goods Receipts</h3>
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>GRN #</th>
            <th>PO #</th>
            <th>Supplier</th>
            <th>Received</th>
            <th>Rejected</th>
            <th>Status</th>
            <th>Received By</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="deliveries.length === 0"><td colspan="8" class="text-center">No receipts yet</td></tr>
          <tr v-for="d in deliveries.slice(0,20)" :key="d.id">
            <td><strong>{{ d.grn_number }}</strong></td>
            <td>{{ d.po_number }}</td>
            <td>{{ d.supplier_name || '—' }}</td>
            <td>{{ d.qty_received }}</td>
            <td>{{ d.qty_rejected }}</td>
            <td><span :class="d.status === 'complete' ? 'status-completed' : 'status-pending'">{{ d.status.toUpperCase() }}</span></td>
            <td>{{ d.received_by_name }}</td>
            <td>{{ formatDate(d.received_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Accept Delivery Modal -->
    <div v-if="showAccept && currentPo" class="modal-overlay" @click.self="showAccept = false">
      <div class="modal-content">
        <div class="modal-header">
          <h5><i class="fas fa-box-open"></i> Accept Delivery — {{ currentPo.po_number }}</h5>
          <button @click="showAccept = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="po-summary">
            <div><label>Product</label><span>{{ currentPo.product_name }}</span></div>
            <div><label>Supplier</label><span>{{ currentPo.supplier_name }}</span></div>
            <div><label>Ordered Qty</label><span>{{ currentPo.quantity }}</span></div>
            <div><label>Unit Price</label><span>₱{{ fmt(currentPo.unit_price) }}</span></div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Quantity Received <span class="required">*</span></label>
              <input v-model.number="accept.qty_received" type="number" min="0" class="form-control" />
            </div>
            <div class="form-group">
              <label>Quantity Rejected</label>
              <input v-model.number="accept.qty_rejected" type="number" min="0" class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label>Condition / Notes</label>
            <textarea v-model="accept.condition_notes" rows="3" class="form-control"
                      placeholder="Any damages, missing items, discrepancies..."></textarea>
          </div>

          <div class="info-box">
            <i class="fas fa-info-circle"></i>
            On accept: a GRN will be created, product stock will be increased by the received qty (once),
            and Finance will be notified for invoice matching.
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showAccept = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitAccept" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Processing...' : 'Accept Delivery' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProcurementStore } from '@/stores/procurement'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { useAuthStore } from '@/stores/auth'
import Swal from 'sweetalert2'

const store   = useProcurementStore()
const scStore = useSupplyChainStore()
const auth    = useAuthStore()

const loading    = ref(false)
const submitting = ref(false)
const showAccept = ref(false)
const currentPo  = ref(null)
const accept     = ref({ qty_received: 0, qty_rejected: 0, condition_notes: '' })

const awaiting = computed(() =>
  scStore.purchaseOrders.filter(po =>
    ['ordered','acknowledged','shipped'].includes(po.status) ||
    ['ordered','acknowledged','shipped'].includes(po.lifecycle_status)
  )
)
const deliveries     = computed(() => store.deliveries)
const deliveredToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return deliveries.value.filter(d => (d.received_at || '').startsWith(today)).length
})

const fmt = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' }) : '—'

const refresh = async () => {
  loading.value = true
  await Promise.all([
    scStore.loadPurchaseOrders(),
    store.loadDeliveries()
  ])
  loading.value = false
}

const openAccept = (po) => {
  currentPo.value = po
  accept.value = { qty_received: po.quantity, qty_rejected: 0, condition_notes: '' }
  showAccept.value = true
}

const submitAccept = async () => {
  if (!accept.value.qty_received || accept.value.qty_received < 0) {
    return Swal.fire({ icon: 'warning', title: 'Enter quantity received', confirmButtonColor: '#4F46E5' })
  }
  submitting.value = true
  try {
    const r = await store.acceptDelivery({
      po_id: currentPo.value.id,
      received_by: auth.user?.id,
      qty_received: accept.value.qty_received,
      qty_rejected: accept.value.qty_rejected,
      condition_notes: accept.value.condition_notes
    })
    if (r.success) {
      showAccept.value = false
      await refresh()
      Swal.fire({
        icon: 'success',
        title: 'Delivery Accepted',
        html: `GRN <b>${r.grn_number}</b> created.<br>Stock updated by ${accept.value.qty_received} units.`,
        confirmButtonColor: '#4F46E5'
      })
    } else {
      Swal.fire({ icon: 'error', title: 'Failed', text: r.message || 'Unknown error' })
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Failed', text: e.response?.data?.message || e.message })
  } finally { submitting.value = false }
}

onMounted(refresh)
</script>

<style scoped>
.proc-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
.page-header h2 { font-size:1.5rem; font-weight:700; color:#1a1a2e; margin:0; }
.page-header h2 i { color:#10B981; margin-right:.4rem; }
.page-header p { color:#6b7280; margin:.25rem 0 0; }
.header-actions { display:flex; gap:.5rem; }
.btn-secondary { background:#f3f4f6; color:#6b7280; border:none; padding:.5rem 1rem; border-radius:8px; cursor:pointer; }
.stats-row { display:flex; gap:2rem; padding:.75rem 1rem; background:#fff; border-radius:10px; margin-bottom:1rem; box-shadow:0 1px 3px rgba(0,0,0,.1); flex-wrap:wrap; }
.stat-item { display:flex; align-items:center; gap:.5rem; }
.stat-item span { font-size:.8rem; color:#6b7280; }
.text-warning { color:#f59e0b!important; }
.text-success { color:#10b981!important; }
.section-title { font-size:1rem; font-weight:600; margin:1.5rem 0 .75rem; display:flex; align-items:center; gap:.5rem; color:#1f2937; }
.section-title i { color:#8B5CF6; }
.table-wrapper { background:#fff; border-radius:12px; overflow-x:auto; box-shadow:0 1px 3px rgba(0,0,0,.1); }
.data-table { width:100%; border-collapse:collapse; font-size:.85rem; }
.data-table th { padding:.6rem .75rem; text-align:left; font-size:.7rem; text-transform:uppercase; color:#6b7280; background:#f9fafb; border-bottom:1px solid #e5e7eb; }
.data-table td { padding:.6rem .75rem; border-bottom:1px solid #f3f4f6; }
.text-center { text-align:center; padding:1.5rem; color:#6b7280; }
.status-pending  { background:#fef3c7; color:#92400e; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-completed{ background:#d1fae5; color:#065f46; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.btn-accept { background:#10B981; color:#fff; border:none; padding:.35rem .75rem; border-radius:6px; cursor:pointer; font-weight:500; font-size:.8rem; }
.btn-accept:hover { background:#059669; }
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
.form-control:focus { outline:none; border-color:#10B981; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.required { color:#ef4444; }
.info-box { background:#ecfdf5; color:#065f46; padding:.75rem 1rem; border-radius:8px; font-size:.85rem; display:flex; align-items:center; gap:.5rem; }
.modal-footer { display:flex; gap:.5rem; padding:1rem 1.5rem; border-top:1px solid #e5e7eb; justify-content:flex-end; }
.btn { padding:.5rem 1.25rem; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
.btn-secondary { background:#f3f4f6; color:#1f2937; }
.btn-primary { background:#10B981; color:#fff; }
.btn-primary:hover { background:#059669; }
.btn-primary:disabled { opacity:.6; cursor:not-allowed; }
.po-summary { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; margin-bottom:1.5rem; padding:1rem; background:#f9fafb; border-radius:8px; }
.po-summary label { display:block; font-size:.7rem; text-transform:uppercase; color:#6b7280; font-weight:600; }
.po-summary span { font-size:.9rem; color:#1f2937; }
</style>