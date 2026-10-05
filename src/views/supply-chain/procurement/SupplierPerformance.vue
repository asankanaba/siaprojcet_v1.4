<template>
  <div class="proc-container">
    <div class="page-header">
      <div>
        <h2><i class="fas fa-star"></i> Supplier Performance</h2>
        <p>Rate suppliers on timeliness, quality, and responsiveness</p>
      </div>
      <div class="header-actions">
        <button @click="refresh" class="btn-secondary"><i class="fas fa-sync" :class="{ spinning: loading }"></i></button>
      </div>
    </div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Avg Rating</th>
            <th>On-Time %</th>
            <th>Total Orders</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="5" class="text-center">Loading...</td></tr>
          <tr v-else-if="performance.length === 0"><td colspan="5" class="text-center">No suppliers yet</td></tr>
          <tr v-for="s in performance" :key="s.id">
            <td><strong>{{ s.name }}</strong></td>
            <td>
              <span class="stars">
                <i v-for="n in 5" :key="n" class="fas fa-star"
                   :class="{ filled: n <= Math.round(s.live_avg || s.avg_rating || 0) }"></i>
              </span>
              <span class="rating-num">{{ Number(s.live_avg || s.avg_rating || 0).toFixed(1) }}</span>
            </td>
            <td>{{ Number(s.on_time_rate || 0).toFixed(0) }}%</td>
            <td>{{ s.rating_count || s.total_orders || 0 }}</td>
            <td>
              <button @click="openRate(s)" class="btn-rate"><i class="fas fa-star"></i> Rate</button>
              <button @click="viewHistory(s)" class="btn-view"><i class="fas fa-eye"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Rate Modal -->
    <div v-if="showRate && currentSupplier" class="modal-overlay" @click.self="showRate = false">
      <div class="modal-content">
        <div class="modal-header">
          <h5><i class="fas fa-star"></i> Rate {{ currentSupplier.name }}</h5>
          <button @click="showRate = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Link to PO (optional)</label>
            <select v-model="rate.po_id" class="form-control">
              <option value="">— None —</option>
              <option v-for="po in supplierPos" :key="po.id" :value="po.id">{{ po.po_number }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Delivered on time?</label>
            <div class="radio-row">
              <label><input type="radio" :value="1" v-model.number="rate.on_time" /> Yes</label>
              <label><input type="radio" :value="0" v-model.number="rate.on_time" /> No</label>
            </div>
          </div>
          <div class="form-group">
            <label>Quality (1–5)</label>
            <input v-model.number="rate.quality_score" type="range" min="1" max="5" class="range-input" />
            <span class="range-val">{{ rate.quality_score }}</span>
          </div>
          <div class="form-group">
            <label>Responsiveness (1–5)</label>
            <input v-model.number="rate.responsiveness_score" type="range" min="1" max="5" class="range-input" />
            <span class="range-val">{{ rate.responsiveness_score }}</span>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="rate.notes" rows="3" class="form-control"></textarea>
          </div>
          <div class="form-group checkbox-row">
            <label><input type="checkbox" v-model="rate.close_po_id" /> Also close the linked PO</label>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showRate = false" class="btn btn-secondary">Cancel</button>
          <button @click="submitRate" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? 'Saving...' : 'Save Rating' }}
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

const loading         = ref(false)
const submitting      = ref(false)
const showRate        = ref(false)
const currentSupplier = ref(null)
const rate = ref({ po_id: '', on_time: 1, quality_score: 5, responsiveness_score: 5, notes: '', close_po_id: false })

const performance = computed(() => store.performance)
const supplierPos = computed(() =>
  scStore.purchaseOrders.filter(po => po.supplier_id === currentSupplier.value?.id)
)

const refresh = async () => {
  loading.value = true
  await Promise.all([
    store.loadSupplierPerformance(),
    scStore.loadPurchaseOrders()
  ])
  loading.value = false
}

const openRate = (s) => {
  currentSupplier.value = s
  rate.value = { po_id: '', on_time: 1, quality_score: 5, responsiveness_score: 5, notes: '', close_po_id: false }
  showRate.value = true
}

const submitRate = async () => {
  submitting.value = true
  try {
    const r = await store.rateSupplier({
      supplier_id: currentSupplier.value.id,
      rated_by: auth.user?.id,
      po_id: rate.value.po_id || null,
      on_time: rate.value.on_time,
      quality_score: rate.value.quality_score,
      responsiveness_score: rate.value.responsiveness_score,
      notes: rate.value.notes,
      close_po_id: rate.value.close_po_id ? rate.value.po_id : null
    })
    if (r.success) {
      showRate.value = false
      await refresh()
      Swal.fire({ icon: 'success', title: 'Rating Saved', timer: 1300, showConfirmButton: false })
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Failed', text: e.response?.data?.message || e.message })
  } finally { submitting.value = false }
}

const viewHistory = async (s) => {
  const { default: api } = await import('@/api/index.js')
  const { data } = await api.get(`/supplier_performance.php?supplier_id=${s.id}`)
  const ratings = data.data?.ratings || []
  const html = ratings.length === 0
    ? '<p>No ratings yet.</p>'
    : ratings.map(r => `
      <div style="border-left:3px solid #8B5CF6;padding:.5rem .75rem;margin:.5rem 0;text-align:left;background:#f9fafb;border-radius:6px">
        <div><b>${r.po_number || 'N/A'}</b> — Score: <b>${r.overall_score}</b> ${r.on_time ? '✅ on time' : '⚠️ late'}</div>
        <div style="font-size:.85rem;color:#6b7280">${r.notes || ''}</div>
        <div style="font-size:.75rem;color:#9ca3af">by ${r.rated_by_name} • ${new Date(r.created_at).toLocaleString()}</div>
      </div>`).join('')
  Swal.fire({ title: `Ratings for ${s.name}`, html, confirmButtonColor: '#4F46E5', width: 600 })
}

onMounted(refresh)
</script>

<style scoped>
.proc-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
.page-header h2 { font-size:1.5rem; font-weight:700; color:#1a1a2e; margin:0; }
.page-header h2 i { color:#F59E0B; margin-right:.4rem; }
.page-header p { color:#6b7280; margin:.25rem 0 0; }
.header-actions { display:flex; gap:.5rem; }
.btn-secondary { background:#f3f4f6; color:#6b7280; border:none; padding:.5rem 1rem; border-radius:8px; cursor:pointer; }
.table-wrapper { background:#fff; border-radius:12px; overflow-x:auto; box-shadow:0 1px 3px rgba(0,0,0,.1); }
.data-table { width:100%; border-collapse:collapse; font-size:.85rem; }
.data-table th { padding:.6rem .75rem; text-align:left; font-size:.7rem; text-transform:uppercase; color:#6b7280; background:#f9fafb; border-bottom:1px solid #e5e7eb; }
.data-table td { padding:.6rem .75rem; border-bottom:1px solid #f3f4f6; }
.text-center { text-align:center; padding:1.5rem; color:#6b7280; }
.stars i { color:#d1d5db; margin-right:2px; }
.stars i.filled { color:#F59E0B; }
.rating-num { font-weight:600; margin-left:.5rem; }
.btn-rate { background:#F59E0B; color:#fff; border:none; padding:.25rem .6rem; border-radius:4px; cursor:pointer; font-size:.75rem; }
.btn-view { background:#4F46E5; color:#fff; border:none; padding:.25rem .5rem; border-radius:4px; cursor:pointer; margin-left:.25rem; }
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
.radio-row { display:flex; gap:1.5rem; }
.radio-row label { font-weight:400; display:flex; align-items:center; gap:.4rem; cursor:pointer; }
.range-input { width:80%; vertical-align:middle; }
.range-val { margin-left:.5rem; font-weight:700; color:#8B5CF6; }
.checkbox-row label { display:flex; align-items:center; gap:.5rem; font-weight:400; cursor:pointer; }
.modal-footer { display:flex; gap:.5rem; padding:1rem 1.5rem; border-top:1px solid #e5e7eb; justify-content:flex-end; }
.btn { padding:.5rem 1.25rem; border:none; border-radius:8px; font-weight:600; cursor:pointer; }
.btn-secondary { background:#f3f4f6; color:#1f2937; }
.btn-primary { background:#F59E0B; color:#fff; }
.btn-primary:disabled { opacity:.6; cursor:not-allowed; }
</style>