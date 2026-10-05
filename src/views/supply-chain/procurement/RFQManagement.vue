<template>
  <div class="proc-container">
    <div class="page-header">
      <div>
        <h2><i class="fas fa-file-contract"></i> RFQ Management</h2>
        <p>Send Requests for Quotation, collect supplier offers, pick the winner</p>
      </div>
      <div class="header-actions">
        <button @click="openNew" class="btn-primary"><i class="fas fa-plus"></i> New RFQ</button>
        <button @click="refresh" class="btn-secondary"><i class="fas fa-sync" :class="{ spinning: loading }"></i></button>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-item"><span>Total RFQs</span><strong>{{ rfqs.length }}</strong></div>
      <div class="stat-item"><span>Open</span><strong class="text-warning">{{ stats.openRfqs }}</strong></div>
      <div class="stat-item"><span>Closed</span><strong class="text-success">{{ closedCount }}</strong></div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>RFQ #</th>
            <th>Product</th>
            <th>Qty</th>
            <th>Quotes</th>
            <th>Deadline</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="7" class="text-center">Loading...</td></tr>
          <tr v-else-if="rfqs.length === 0"><td colspan="7" class="text-center">No RFQs yet</td></tr>
          <tr v-for="r in rfqs" :key="r.id">
            <td><strong>{{ r.rfq_number }}</strong></td>
            <td>{{ r.product_name || '—' }}</td>
            <td>{{ r.quantity || '—' }}</td>
            <td><span class="badge">{{ r.quote_count || 0 }}</span></td>
            <td>{{ r.deadline || '—' }}</td>
            <td><span :class="statusClass(r.status)">{{ r.status.toUpperCase() }}</span></td>
            <td>
              <div class="action-buttons">
                <button @click="openDetail(r)" class="btn-view" title="View & Add Quote"><i class="fas fa-eye"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- New RFQ Modal -->
    <div v-if="showNew" class="modal-overlay" @click.self="showNew = false">
      <div class="modal-content">
        <div class="modal-header">
          <h5><i class="fas fa-file-contract"></i> New RFQ</h5>
          <button @click="showNew = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Link to Requisition (optional)</label>
            <select v-model="form.requisition_id" class="form-control">
              <option value="">— None —</option>
              <option v-for="r in approvedReqs" :key="r.id" :value="r.id">
                {{ r.req_number }} — {{ r.product_name || r.product_name_real }} (x{{ r.quantity }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Deadline</label>
            <input v-model="form.deadline" type="date" class="form-control" />
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="form.notes" rows="3" class="form-control" placeholder="RFQ instructions..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showNew = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitNew" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Sending...' : 'Create RFQ' }}
          </button>
        </div>
      </div>
    </div>

    <!-- RFQ Detail Modal -->
    <div v-if="showDetail && detail" class="modal-overlay" @click.self="showDetail = false">
      <div class="modal-content detail-modal">
        <div class="modal-header">
          <h5><i class="fas fa-list-check"></i> {{ detail.rfq_number }}</h5>
          <button @click="showDetail = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div><label>Product</label><span>{{ detail.product_name || '—' }}</span></div>
            <div><label>Quantity</label><span>{{ detail.quantity || '—' }}</span></div>
            <div><label>Deadline</label><span>{{ detail.deadline || '—' }}</span></div>
            <div><label>Status</label><span>{{ detail.status.toUpperCase() }}</span></div>
          </div>

          <h6 class="section-title"><i class="fas fa-quote-right"></i> Supplier Quotes</h6>
          <div v-if="!detail.quotes || detail.quotes.length === 0" class="empty-note">
            No quotes yet. Add one below.
          </div>
          <table v-else class="quote-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Unit Price</th>
                <th>Qty</th>
                <th>Lead Time</th>
                <th>Terms</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in detail.quotes" :key="q.id" :class="{ selected: q.is_selected }">
                <td><strong>{{ q.supplier_name }}</strong></td>
                <td>₱{{ fmt(q.unit_price) }}</td>
                <td>{{ q.quantity_offered }}</td>
                <td>{{ q.lead_time_days }} days</td>
                <td>{{ q.payment_terms }}</td>
                <td>
                  <button v-if="!q.is_selected && detail.status !== 'closed'"
                          @click="selectWinner(q)"
                          class="btn-select">Select</button>
                  <span v-else-if="q.is_selected" class="badge-selected">✓ Selected</span>
                </td>
              </tr>
            </tbody>
          </table>

          <h6 class="section-title" v-if="detail.status !== 'closed'">
            <i class="fas fa-plus-circle"></i> Add Supplier Quote
          </h6>
          <div v-if="detail.status !== 'closed'" class="quote-form">
            <div class="form-row">
              <div class="form-group">
                <label>Supplier</label>
                <select v-model="quote.supplier_id" class="form-control">
                  <option value="">Select supplier</option>
                  <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Unit Price</label>
                <input v-model.number="quote.unit_price" type="number" step="0.01" class="form-control" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Quantity Offered</label>
                <input v-model.number="quote.quantity_offered" type="number" class="form-control" />
              </div>
              <div class="form-group">
                <label>Lead Time (days)</label>
                <input v-model.number="quote.lead_time_days" type="number" class="form-control" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Payment Terms</label>
                <input v-model="quote.payment_terms" class="form-control" placeholder="Net 30" />
              </div>
              <div class="form-group">
                <label>Notes</label>
                <input v-model="quote.notes" class="form-control" />
              </div>
            </div>
            <button @click="addQuote" class="btn btn-primary" :disabled="addingQuote">
              {{ addingQuote ? 'Adding...' : 'Add Quote' }}
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showDetail = false" class="btn btn-secondary">Close</button>
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

const store        = useProcurementStore()
const scStore      = useSupplyChainStore()
const auth         = useAuthStore()

const loading      = ref(false)
const submitting   = ref(false)
const addingQuote  = ref(false)
const showNew      = ref(false)
const showDetail   = ref(false)
const detail       = ref(null)

const form  = ref({ requisition_id: '', deadline: '', notes: '' })
const quote = ref({ supplier_id: '', unit_price: 0, quantity_offered: 1, lead_time_days: 3, payment_terms: 'Net 30', notes: '' })

const rfqs        = computed(() => store.rfqs)
const stats       = computed(() => store.stats)
const suppliers   = computed(() => scStore.suppliers)
const closedCount = computed(() => rfqs.value.filter(r => r.status === 'closed').length)
const approvedReqs= computed(() => store.requisitions.filter(r => r.status === 'approved'))

const fmt = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const statusClass = (s) => ({
  draft: 'status-pending', sent: 'status-ordered', closed: 'status-completed', cancelled: 'status-cancelled'
}[s] || 'status-pending')

const refresh = async () => {
  loading.value = true
  await Promise.all([
    store.loadRfqs(),
    store.loadRequisitions({ status: 'approved' }),
    scStore.loadSuppliers()
  ])
  loading.value = false
}

const openNew = () => {
  form.value = { requisition_id: '', deadline: '', notes: '' }
  showNew.value = true
}

const submitNew = async () => {
  submitting.value = true
  try {
    const r = await store.createRfq({
      ...form.value,
      created_by: auth.user?.id
    })
    if (r.success) {
      showNew.value = false
      await refresh()
      Swal.fire({ icon: 'success', title: 'RFQ Created', text: r.rfq_number, timer: 1500, showConfirmButton: false })
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Failed', text: e.response?.data?.message || e.message })
  } finally { submitting.value = false }
}

const openDetail = async (r) => {
  detail.value = await store.getRfq(r.id)
  quote.value = { supplier_id: '', unit_price: 0, quantity_offered: detail.value?.quantity || 1, lead_time_days: 3, payment_terms: 'Net 30', notes: '' }
  showDetail.value = true
}

const addQuote = async () => {
  if (!quote.value.supplier_id) return Swal.fire({ icon: 'warning', title: 'Select a supplier', confirmButtonColor: '#4F46E5' })
  if (!quote.value.unit_price) return Swal.fire({ icon: 'warning', title: 'Enter unit price', confirmButtonColor: '#4F46E5' })
  addingQuote.value = true
  try {
    await store.addQuote({ ...quote.value, rfq_id: detail.value.id })
    detail.value = await store.getRfq(detail.value.id)
    Swal.fire({ icon: 'success', title: 'Quote added', timer: 1200, showConfirmButton: false })
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Failed', text: e.response?.data?.message || e.message })
  } finally { addingQuote.value = false }
}

const selectWinner = async (q) => {
  const c = await Swal.fire({
    title: 'Select this quote?',
    html: `<b>${q.supplier_name}</b><br>₱${fmt(q.unit_price)} / unit<br>Lead: ${q.lead_time_days} days`,
    icon: 'question', showCancelButton: true, confirmButtonColor: '#10B981'
  })
  if (!c.isConfirmed) return
  await store.selectQuote(detail.value.id, q.id)
  detail.value = await store.getRfq(detail.value.id)
  await store.loadRfqs()
  Swal.fire({ icon: 'success', title: 'Winner selected', timer: 1300, showConfirmButton: false })
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
.btn-primary { background:#8B5CF6; color:#fff; border:none; padding:.5rem 1.2rem; border-radius:8px; cursor:pointer; font-weight:500; }
.btn-primary:hover { background:#7C3AED; }
.btn-secondary { background:#f3f4f6; color:#6b7280; border:none; padding:.5rem 1rem; border-radius:8px; cursor:pointer; }
.stats-row { display:flex; gap:2rem; padding:.75rem 1rem; background:#fff; border-radius:10px; margin-bottom:1rem; box-shadow:0 1px 3px rgba(0,0,0,.1); flex-wrap:wrap; }
.stat-item { display:flex; align-items:center; gap:.5rem; }
.stat-item span { font-size:.8rem; color:#6b7280; }
.stat-item strong { font-size:1rem; }
.text-warning { color:#f59e0b!important; }
.text-success { color:#10b981!important; }
.table-wrapper { background:#fff; border-radius:12px; overflow-x:auto; box-shadow:0 1px 3px rgba(0,0,0,.1); }
.data-table { width:100%; border-collapse:collapse; font-size:.85rem; }
.data-table th { padding:.6rem .75rem; text-align:left; font-size:.7rem; text-transform:uppercase; color:#6b7280; background:#f9fafb; border-bottom:1px solid #e5e7eb; }
.data-table td { padding:.6rem .75rem; border-bottom:1px solid #f3f4f6; }
.text-center { text-align:center; padding:1.5rem; color:#6b7280; }
.badge { background:#e0e7ff; color:#3730a3; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-pending  { background:#fef3c7; color:#92400e; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-ordered  { background:#e0e7ff; color:#3730a3; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-completed{ background:#d1fae5; color:#065f46; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.status-cancelled{ background:#fee2e2; color:#991b1b; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.action-buttons { display:flex; gap:.25rem; }
.btn-view { background:#4F46E5; color:#fff; border:none; padding:.25rem .5rem; border-radius:4px; cursor:pointer; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem; }
.modal-content { background:#fff; border-radius:16px; max-width:560px; width:100%; max-height:90vh; overflow-y:auto; }
.detail-modal { max-width:800px; }
.modal-header { display:flex; justify-content:space-between; align-items:center; padding:1rem 1.5rem; border-bottom:1px solid #e5e7eb; }
.modal-header h5 { margin:0; font-size:1.1rem; }
.btn-close { background:none; border:none; font-size:1.5rem; cursor:pointer; color:#6b7280; }
.modal-body { padding:1.5rem; }
.form-group { margin-bottom:1rem; }
.form-group label { display:block; font-weight:600; font-size:.85rem; margin-bottom:.25rem; }
.form-control { width:100%; padding:.5rem .75rem; border:2px solid #e5e7eb; border-radius:8px; font-size:.9rem; }
.form-control:focus { outline:none; border-color:#8B5CF6; }
.form-row { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.modal-footer { display:flex; gap:.5rem; padding:1rem 1.5rem; border-top:1px solid #e5e7eb; justify-content:flex-end; }
.btn { padding:.5rem 1.25rem; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
.btn-secondary { background:#f3f4f6; color:#1f2937; }
.btn-primary:disabled { opacity:.6; cursor:not-allowed; }
.detail-grid { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; margin-bottom:1.5rem; padding:1rem; background:#f9fafb; border-radius:8px; }
.detail-grid label { display:block; font-size:.7rem; text-transform:uppercase; color:#6b7280; font-weight:600; }
.detail-grid span { font-size:.9rem; color:#1f2937; }
.section-title { font-size:.95rem; margin:1.5rem 0 .75rem; display:flex; align-items:center; gap:.5rem; }
.section-title i { color:#8B5CF6; }
.quote-table { width:100%; border-collapse:collapse; font-size:.85rem; margin-bottom:.5rem; }
.quote-table th { text-align:left; padding:.4rem .6rem; font-size:.7rem; text-transform:uppercase; color:#6b7280; background:#f3f4f6; }
.quote-table td { padding:.5rem .6rem; border-bottom:1px solid #f3f4f6; }
.quote-table tr.selected { background:#ecfdf5; }
.btn-select { background:#10B981; color:#fff; border:none; padding:.2rem .6rem; border-radius:4px; cursor:pointer; font-size:.75rem; }
.badge-selected { background:#10B981; color:#fff; padding:.15rem .5rem; border-radius:50px; font-size:.7rem; font-weight:600; }
.empty-note { color:#6b7280; font-size:.85rem; padding:.5rem; }
.quote-form { background:#f9fafb; padding:1rem; border-radius:8px; }
</style>