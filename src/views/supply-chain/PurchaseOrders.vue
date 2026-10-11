<template>
  <div class="po-page">
    <header class="po-head">
      <div class="po-head-left">
        <h1>
          <span class="po-head-icon">📦</span>
          Purchase Orders
        </h1>
        <p class="po-head-sub">
          Manage POs, track deliveries, and pay suppliers via PayMongo.
        </p>
      </div>

      <div class="po-head-right">
        <button class="po-btn po-btn-primary" @click="openCreate">
          <span>＋</span> New Order
        </button>
        <button class="po-btn po-btn-ghost" :disabled="loading" @click="reload">
          <span :class="{ spinning: loading }">⟳</span>
        </button>
      </div>
    </header>

    <section class="po-stats">
      <div class="po-tile">
        <span class="po-tile-label">Total Orders</span>
        <span class="po-tile-value">{{ stats.total_count || 0 }}</span>
      </div>
      <div class="po-tile">
        <span class="po-tile-label">Pending</span>
        <span class="po-tile-value warn">{{ stats.pending_count || 0 }}</span>
      </div>
      <div class="po-tile">
        <span class="po-tile-label">Shipped</span>
        <span class="po-tile-value info">{{ stats.shipped_count || 0 }}</span>
      </div>
      <div class="po-tile">
        <span class="po-tile-label">Received</span>
        <span class="po-tile-value ok">{{ stats.received_count || 0 }}</span>
      </div>
      <div class="po-tile">
        <span class="po-tile-label">Unpaid</span>
        <span class="po-tile-value danger">
          ₱{{ formatMoney(stats.unpaid_amount) }}
        </span>
        <span class="po-tile-sub">{{ stats.unpaid_count || 0 }} POs</span>
      </div>
      <div class="po-tile">
        <span class="po-tile-label">Paid</span>
        <span class="po-tile-value success">
          ₱{{ formatMoney(stats.total_paid) }}
        </span>
        <span class="po-tile-sub">{{ stats.paid_count || 0 }} POs</span>
      </div>
    </section>

    <section class="po-toolbar">
      <div class="po-search">
        <span class="po-search-icon">🔍</span>
        <input
          v-model="filters.q"
          type="text"
          placeholder="Search by PO #, product, or supplier…"
          @input="debouncedLoad"
        />
      </div>

      <select v-model="filters.status" class="po-select" @change="load">
        <option value="">All Statuses</option>
        <option value="draft">Draft</option>
        <option value="ordered">Ordered</option>
        <option value="shipped">Shipped</option>
        <option value="received">Received</option>
        <option value="cancelled">Cancelled</option>
      </select>

      <select v-model="filters.payment_status" class="po-select" @change="load">
        <option value="">All Payments</option>
        <option value="unpaid">Unpaid</option>
        <option value="partial">Partial</option>
        <option value="paid">Paid</option>
      </select>

      <label class="po-toggle">
        <input type="checkbox" v-model="filters.only_payable" @change="load" />
        <span>Eligible for payment only</span>
      </label>
    </section>

    <section class="po-table-wrap">
      <div v-if="loading" class="po-empty">
        <div class="po-spinner"></div>
        <p>Loading purchase orders…</p>
      </div>

      <div v-else-if="error" class="po-empty error">
        <p>{{ error }}</p>
        <button class="po-btn po-btn-primary" @click="reload">Retry</button>
      </div>

      <div v-else-if="!rows.length" class="po-empty">
        <p>No purchase orders match your filters.</p>
      </div>

      <table v-else class="po-table">
        <thead>
          <tr>
            <th @click="sort('po_number')" class="sortable">
              PO #
              <span v-if="filters.sort_by === 'po_number'" class="sort-arrow">
                {{ filters.sort_dir === 'ASC' ? '▲' : '▼' }}
              </span>
            </th>
            <th>Product</th>
            <th>Supplier</th>
            <th class="num">Qty</th>
            <th class="num">Unit Price</th>
            <th @click="sort('total_cost')" class="sortable num">
              Total
              <span v-if="filters.sort_by === 'total_cost'" class="sort-arrow">
                {{ filters.sort_dir === 'ASC' ? '▲' : '▼' }}
              </span>
            </th>
            <th class="num">Balance</th>
            <th>Payment</th>
            <th>Status</th>
            <th class="center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="po in rows" :key="po.id" :class="{ overdue: po.days_overdue > 0 && po.payment_status !== 'paid' }">
            <td><strong>{{ po.po_number }}</strong></td>
            <td>{{ po.product_name || '—' }}</td>
            <td>{{ po.supplier_name || '—' }}</td>
            <td class="num">{{ po.quantity }}</td>
            <td class="num">₱{{ formatMoney(po.unit_price) }}</td>
            <td class="num"><strong>₱{{ formatMoney(po.total_cost) }}</strong></td>
            <td class="num">
              <span v-if="Number(po.balance_due) === 0" class="muted">—</span>
              <span v-else>₱{{ formatMoney(po.balance_due) }}</span>
            </td>
            <td>
              <span class="po-pill" :class="`po-pill-${po.payment_status}`">
                {{ paymentLabel(po.payment_status) }}
              </span>
              <span v-if="po.days_overdue > 0 && po.payment_status !== 'paid'" class="po-overdue">
                +{{ po.days_overdue }}d
              </span>
            </td>
            <td>
              <span class="po-pill" :class="`po-pill-lifecycle-${po.lifecycle_status}`">
                {{ lifecycleLabel(po.lifecycle_status) }}
              </span>
            </td>
            <td class="center actions-cell">
              <button
                v-if="po.can_pay"
                class="po-icon-btn po-icon-pay"
                title="Pay via PayMongo"
                @click="openPay(po)"
              >
                💳
              </button>

              <button
                v-else-if="po.payment_status !== 'paid'"
                class="po-icon-btn po-icon-disabled"
                :title="po.payment_blocker || 'Not payable'"
                disabled
              >
                🚫
              </button>

              <button
                class="po-icon-btn po-icon-view"
                title="View details"
                @click="openDetail(po)"
              >
                👁
              </button>

              <button
                class="po-icon-btn po-icon-delete"
                title="Delete"
                :disabled="Number(po.amount_paid) > 0"
                @click="confirmDelete(po)"
              >
                ✕
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- DETAIL DRAWER -->
    <Teleport to="body">
      <div v-if="detail" class="po-drawer-backdrop" @click.self="closeDetail">
        <aside class="po-drawer">
          <header class="po-drawer-head">
            <div>
              <h2>{{ detail.po_number }}</h2>
              <p class="muted">
                {{ detail.supplier_name }} · {{ detail.product_name }}
              </p>
            </div>
            <button class="po-icon-btn" @click="closeDetail">✕</button>
          </header>

          <div class="po-drawer-body">
            <div class="po-drawer-section">
              <div class="po-drawer-amounts">
                <div>
                  <span class="muted">Total</span>
                  <strong>₱{{ formatMoney(detail.total_cost) }}</strong>
                </div>
                <div>
                  <span class="muted">Paid</span>
                  <strong>₱{{ formatMoney(detail.amount_paid) }}</strong>
                </div>
                <div>
                  <span class="muted">Balance</span>
                  <strong class="danger">₱{{ formatMoney(detail.balance_due) }}</strong>
                </div>
              </div>

              <div class="po-drawer-pills">
                <span class="po-pill" :class="`po-pill-${detail.payment_status}`">
                  {{ paymentLabel(detail.payment_status) }}
                </span>
                <span class="po-pill" :class="`po-pill-lifecycle-${detail.lifecycle_status}`">
                  {{ lifecycleLabel(detail.lifecycle_status) }}
                </span>
              </div>

              <div class="po-drawer-cta" v-if="detail.can_pay">
                <button class="po-btn po-btn-primary" @click="openPay(detail)">
                  💳 Pay ₱{{ formatMoney(detail.balance_due) }}
                </button>
              </div>
              <div v-else-if="detail.payment_blocker" class="po-drawer-blocked">
                🚫 {{ detail.payment_blocker }}
              </div>
            </div>

            <div class="po-drawer-section">
              <h3>Details</h3>
              <dl class="po-meta">
                <dt>Ordered</dt><dd>{{ formatDate(detail.ordered_date) }}</dd>
                <dt>Expected</dt><dd>{{ formatDate(detail.expected_delivery) }}</dd>
                <dt>Received</dt><dd>{{ formatDate(detail.received_date) }}</dd>
                <dt>Payment terms</dt><dd>{{ detail.payment_terms || '—' }}</dd>
                <dt>Ordered by</dt><dd>{{ detail.ordered_by_name || '—' }}</dd>
                <dt>Qty</dt><dd>{{ detail.quantity }} × ₱{{ formatMoney(detail.unit_price) }}</dd>
              </dl>
            </div>

            <div class="po-drawer-section">
              <h3>Payments ({{ detail.payments?.length || 0 }})</h3>
              <div v-if="!detail.payments?.length" class="muted small">No payments recorded yet.</div>
              <ul v-else class="po-list">
                <li v-for="p in detail.payments" :key="p.id">
                  <div class="po-list-row">
                    <div>
                      <strong>{{ p.payment_ref }}</strong>
                      <span class="muted"> · {{ p.method }}</span>
                    </div>
                    <div class="po-list-amount">₱{{ formatMoney(p.amount) }}</div>
                  </div>
                </li>
              </ul>
            </div>

            <div class="po-drawer-section">
              <h3>Deliveries ({{ detail.deliveries?.length || 0 }})</h3>
              <div v-if="!detail.deliveries?.length" class="muted small">No goods receipts yet.</div>
              <ul v-else class="po-list">
                <li v-for="d in detail.deliveries" :key="d.id">
                  <div class="po-list-row">
                    <div>
                      <strong>{{ d.grn_number }}</strong>
                      <span class="muted"> · {{ d.status }}</span>
                    </div>
                    <div class="po-list-amount">{{ d.qty_received }} / {{ d.qty_ordered }}</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </Teleport>

    <!-- CREATE MODAL -->
    <Teleport to="body">
      <div v-if="showCreate" class="po-drawer-backdrop" @click.self="closeCreate">
        <div class="po-create-modal">
          <header class="po-drawer-head">
            <h2>📦 New Purchase Order</h2>
            <button class="po-icon-btn" @click="closeCreate">✕</button>
          </header>

          <div class="po-drawer-body">
            <div v-if="createError" class="po-drawer-blocked" style="margin-bottom:1rem;">
              ⚠️ {{ createError }}
            </div>

            <div class="po-form-group">
              <label>From Approved Requisition (optional)</label>
              <select v-model="newPO.requisition_id" @change="onReqSelect" class="po-select" style="width:100%">
                <option value="">— No requisition (direct PO) —</option>
                <option v-for="r in approvedReqs" :key="r.id" :value="r.id">
                  {{ r.req_number }} — {{ r.product_name || r.product_name_real }} (₱{{ formatMoney(r.estimated_total) }})
                </option>
              </select>
            </div>

            <div class="po-form-group">
              <label>Product *</label>
              <select v-model="newPO.product_id" class="po-select" style="width:100%">
                <option value="">— Select product —</option>
                <option v-for="p in productList" :key="p.id" :value="p.id">
                  {{ p.name }} (stock: {{ p.stock }})
                </option>
              </select>
            </div>

            <div class="po-form-group">
              <label>Supplier *</label>
              <select v-model="newPO.supplier_id" class="po-select" style="width:100%">
                <option value="">— Select supplier —</option>
                <option v-for="s in supplierList" :key="s.id" :value="s.id">
                  {{ s.name }}
                </option>
              </select>
            </div>

            <div class="po-form-row">
              <div class="po-form-group">
                <label>Quantity *</label>
                <input v-model.number="newPO.quantity" type="number" min="1" class="po-input" />
              </div>
              <div class="po-form-group">
                <label>Unit Price (₱) *</label>
                <input v-model.number="newPO.unit_price" type="number" step="0.01" min="0" class="po-input" />
              </div>
            </div>

            <div class="po-form-group">
              <label>Total</label>
              <div class="po-total-preview">₱{{ formatMoney(newPOTotal) }}</div>
            </div>

            <div class="po-form-group">
              <label>Expected Delivery</label>
              <input v-model="newPO.expected_delivery" type="date" class="po-input" />
            </div>

            <div class="po-form-group">
              <label>Payment Terms</label>
              <select v-model="newPO.payment_terms" class="po-select" style="width:100%">
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="COD">Cash on Delivery</option>
              </select>
            </div>

            <div class="po-form-group">
              <label>Notes</label>
              <textarea v-model="newPO.notes" rows="3" class="po-input"></textarea>
            </div>
          </div>

          <footer style="padding:1rem 1.25rem; border-top:1px solid #e2e8f0; display:flex; justify-content:flex-end; gap:.5rem;">
            <button class="po-btn po-btn-ghost" @click="closeCreate" :disabled="creating">Cancel</button>
            <button class="po-btn po-btn-primary" @click="submitCreate" :disabled="creating">
              {{ creating ? 'Creating…' : 'Create PO' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>

    <PayMongoCheckout
      ref="checkoutRef"
      :mode="checkoutMode"
      @created="onCheckoutCreated"
      @error="onCheckoutError"
      @closed="onCheckoutClosed"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import Swal from 'sweetalert2'
import api from '@/api/index'
import PayMongoCheckout from '@/components/common/PayMongoCheckout.vue'

const rows    = ref([])
const stats   = reactive({})
const detail  = ref(null)
const loading = ref(false)
const error   = ref(null)

const filters = reactive({
  q: '',
  status: '',
  payment_status: '',
  only_payable: false,
  sort_by: 'created_at',
  sort_dir: 'DESC'
})

const checkoutRef  = ref(null)
const checkoutMode = ref('checkout')

// ============================================================
// CREATE MODAL STATE
// ============================================================
const showCreate   = ref(false)
const creating     = ref(false)
const createError  = ref(null)
const approvedReqs = ref([])
const supplierList = ref([])
const productList  = ref([])

const newPO = reactive({
  requisition_id:    '',
  product_id:        '',
  supplier_id:       '',
  quantity:          1,
  unit_price:        0,
  expected_delivery: '',
  payment_terms:     'Net 30',
  notes:             ''
})

const newPOTotal = computed(() =>
  (Number(newPO.quantity) || 0) * (Number(newPO.unit_price) || 0)
)

// ============================================================
// LOADING
// ============================================================
async function load() {
  loading.value = true
  error.value = null
  try {
    if (filters.only_payable) {
      const res = await api.get('/purchase_orders.php', { params: { action: 'eligible_for_payment' } })
      rows.value = res.data?.data || []
    } else {
      const params = { ...filters }
      delete params.only_payable
      if (!params.q) delete params.q
      if (!params.status) delete params.status
      if (!params.payment_status) delete params.payment_status
      const res = await api.get('/purchase_orders.php', { params })
      rows.value = res.data?.data || []
    }
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to load purchase orders'
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const res = await api.get('/purchase_orders.php', { params: { action: 'summary' } })
    Object.assign(stats, res.data?.data || {})
  } catch (e) {}
}

function reload() {
  load()
  loadStats()
}

let debounceTimer = null
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 300)
}

function sort(field) {
  if (filters.sort_by === field) {
    filters.sort_dir = filters.sort_dir === 'ASC' ? 'DESC' : 'ASC'
  } else {
    filters.sort_by = field
    filters.sort_dir = 'DESC'
  }
  load()
}

// ============================================================
// DETAIL DRAWER
// ============================================================
async function openDetail(po) {
  detail.value = po
  try {
    const res = await api.get('/purchase_orders.php', { params: { id: po.id } })
    if (res.data?.success) detail.value = res.data.data
  } catch (e) {}
}
function closeDetail() {
  detail.value = null
}

// ============================================================
// CREATE MODAL
// ============================================================
async function openCreate() {
  Object.assign(newPO, {
    requisition_id: '', product_id: '', supplier_id: '',
    quantity: 1, unit_price: 0, expected_delivery: '',
    payment_terms: 'Net 30', notes: ''
  })
  createError.value = null
  showCreate.value  = true

  try {
    const [reqRes, supRes, prodRes] = await Promise.all([
      api.get('/requisitions.php', { params: { status: 'approved' } }),
      api.get('/suppliers.php',    { params: { status: 'active' } }),
      api.get('/products.php',     { params: { status: 'active' } })
    ])
    approvedReqs.value = reqRes.data?.data || []
    supplierList.value = supRes.data?.data || []
    productList.value  = prodRes.data?.data || []
  } catch (e) {
    createError.value = 'Could not load dropdowns: ' + (e?.message || 'unknown')
  }
}

function closeCreate() {
  showCreate.value = false
  createError.value = null
}

function onReqSelect() {
  const r = approvedReqs.value.find(x => String(x.id) === String(newPO.requisition_id))
  if (!r) return
  newPO.product_id = r.product_id || ''
  newPO.quantity   = r.quantity   || 1
  newPO.unit_price = Number(r.estimated_unit_cost) || 0
}

async function submitCreate() {
  createError.value = null

  if (!newPO.product_id)                     return createError.value = 'Select a product'
  if (!newPO.supplier_id)                    return createError.value = 'Select a supplier'
  if (!newPO.quantity || newPO.quantity < 1) return createError.value = 'Quantity must be ≥ 1'
  if (!newPO.unit_price || newPO.unit_price <= 0) return createError.value = 'Unit price must be > 0'

  creating.value = true
  try {
    const payload = {
      requisition_id:    newPO.requisition_id || null,
      product_id:        Number(newPO.product_id),
      supplier_id:       Number(newPO.supplier_id),
      quantity:          Number(newPO.quantity),
      unit_price:        Number(newPO.unit_price),
      expected_delivery: newPO.expected_delivery || null,
      payment_terms:     newPO.payment_terms,
      notes:             newPO.notes || null
    }

    const res = await api.post('/purchase_orders.php', payload)
    if (!res.data?.success) throw new Error(res.data?.message || 'Create failed')

    Swal.fire({
      icon: 'success',
      title: 'PO Created',
      text: res.data.po_number,
      timer: 1500,
      showConfirmButton: false,
      background: 'rgba(15,23,42,.95)',
      color: '#f1f5f9'
    })

    closeCreate()
    reload()
  } catch (e) {
    createError.value = e?.response?.data?.message || e?.message || 'Create failed'
  } finally {
    creating.value = false
  }
}

// ============================================================
// PAY / DELETE
// ============================================================
function openPay(po) {
  checkoutMode.value = 'checkout'
  const meta = po.payment_meta || {
    po_id: po.id,
    supplier_id: po.supplier_id,
    amount: Number(po.balance_due),
    description: `Payment for PO ${po.po_number}`
  }
  checkoutRef.value?.open({
    supplier_id: meta.supplier_id,
    amount: meta.amount,
    description: meta.description,
    po_id: meta.po_id
  })
}

function onCheckoutCreated() { setTimeout(reload, 800) }

function onCheckoutError(err) {
  Swal.fire({
    icon: 'error',
    title: 'Payment error',
    text: err?.message || 'Something went wrong',
    background: 'rgba(15,23,42,.95)',
    color: '#f1f5f9'
  })
}

function onCheckoutClosed() { reload() }

async function confirmDelete(po) {
  const ok = await Swal.fire({
    icon: 'warning',
    title: 'Delete PO?',
    html: `Delete <b>${po.po_number}</b>? This cannot be undone.`,
    showCancelButton: true,
    confirmButtonText: 'Delete',
    confirmButtonColor: '#ef4444',
    background: 'rgba(15,23,42,.95)',
    color: '#f1f5f9'
  })
  if (!ok.isConfirmed) return

  try {
    await api.delete('/purchase_orders.php', { params: { id: po.id } })
    Swal.fire({
      icon: 'success', title: 'Deleted', timer: 1200, showConfirmButton: false,
      background: 'rgba(15,23,42,.95)', color: '#f1f5f9'
    })
    reload()
  } catch (e) {
    Swal.fire({
      icon: 'error', title: 'Cannot delete',
      text: e?.response?.data?.message || e?.message || 'Delete failed',
      background: 'rgba(15,23,42,.95)', color: '#f1f5f9'
    })
  }
}

// ============================================================
// HELPERS
// ============================================================
function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}
function paymentLabel(s) {
  return { unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid' }[s] || s
}
function lifecycleLabel(s) {
  return {
    draft: 'Draft', ordered: 'Ordered', acknowledged: 'Acknowledged',
    shipped: 'Shipped', delivered: 'Delivered', grn_posted: 'GRN Posted',
    invoiced: 'Invoiced', matched: 'Matched', paid: 'Paid',
    closed: 'Closed', cancelled: 'Cancelled'
  }[s] || s || '—'
}

onMounted(reload)
</script>

<style scoped>
.po-page { padding: 1.5rem; color: #1e293b; font-size: 0.9rem; }
body.dark-mode .po-page { color: #e2e8f0; }

.po-head {
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 1rem; margin-bottom: 1.5rem;
}
.po-head h1 {
  margin: 0; font-size: 1.5rem; font-weight: 700; color: #0f172a;
  display: flex; align-items: center; gap: 0.5rem;
}
body.dark-mode .po-head h1 { color: #f1f5f9; }
.po-head-icon { font-size: 1.3rem; }
.po-head-sub { margin: 0.35rem 0 0; font-size: 0.85rem; color: #64748b; }
body.dark-mode .po-head-sub { color: #94a3b8; }
.po-head-right { display: flex; gap: 0.5rem; align-items: center; }

.po-btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 1.1rem; border-radius: 10px; font-weight: 500;
  font-size: 0.85rem; cursor: pointer; border: 1px solid transparent;
  transition: all 0.15s ease; font-family: inherit;
}
.po-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
.po-btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.po-btn-ghost {
  background: #ffffff; color: #334155; border-color: #e2e8f0;
}
.po-btn-ghost:hover:not(:disabled) { background: #f8fafc; }
body.dark-mode .po-btn-ghost {
  background: rgba(255, 255, 255, 0.06); color: #e2e8f0;
  border-color: rgba(167, 139, 250, 0.18);
}
.po-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.spinning { display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg) } }

.po-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem; margin-bottom: 1.25rem;
}
.po-tile {
  display: flex; flex-direction: column; gap: 0.25rem;
  padding: 0.9rem 1rem; border-radius: 14px; background: #ffffff;
  border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
body.dark-mode .po-tile {
  background: rgba(26, 22, 48, 0.55);
  border-color: rgba(167, 139, 250, 0.18);
}
.po-tile-label {
  font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em;
  color: #64748b;
}
body.dark-mode .po-tile-label { color: #94a3b8; }
.po-tile-value { font-size: 1.35rem; font-weight: 700; color: #0f172a; }
body.dark-mode .po-tile-value { color: #f1f5f9; }
.po-tile-value.warn { color: #d97706; }
.po-tile-value.info { color: #2563eb; }
.po-tile-value.ok { color: #16a34a; }
.po-tile-value.success { color: #16a34a; }
.po-tile-value.danger { color: #dc2626; }
.po-tile-sub { font-size: 0.7rem; color: #94a3b8; }

.po-toolbar {
  display: flex; gap: 0.6rem; flex-wrap: wrap;
  align-items: center; margin-bottom: 1rem;
}
.po-search { position: relative; flex: 1 1 240px; min-width: 200px; }
.po-search input {
  width: 100%; padding: 0.6rem 0.8rem 0.6rem 2.2rem;
  border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0;
  color: #0f172a; font-size: 0.85rem; font-family: inherit; outline: none;
}
body.dark-mode .po-search input {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2); color: #e2e8f0;
}
.po-search-icon {
  position: absolute; top: 50%; left: 0.7rem;
  transform: translateY(-50%); font-size: 0.85rem; opacity: 0.5;
}
.po-select {
  padding: 0.6rem 0.8rem; border-radius: 10px; background: #ffffff;
  border: 1px solid #e2e8f0; color: #0f172a; font-size: 0.85rem;
  font-family: inherit; outline: none; cursor: pointer;
}
body.dark-mode .po-select {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2); color: #e2e8f0;
}
.po-toggle {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.55rem 0.75rem; border-radius: 10px; background: #ffffff;
  border: 1px solid #e2e8f0; font-size: 0.8rem; color: #334155; cursor: pointer;
}
body.dark-mode .po-toggle {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2); color: #cbd5e1;
}

.po-table-wrap {
  border-radius: 16px; background: #ffffff; border: 1px solid #e2e8f0;
  overflow: hidden; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
body.dark-mode .po-table-wrap {
  background: rgba(26, 22, 48, 0.55);
  border-color: rgba(167, 139, 250, 0.18);
}
.po-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.po-table thead { background: #f8fafc; }
body.dark-mode .po-table thead { background: rgba(255, 255, 255, 0.04); }
.po-table th {
  text-align: left; padding: 0.75rem 0.9rem; font-weight: 600;
  font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em;
  color: #475569; white-space: nowrap;
}
body.dark-mode .po-table th { color: #94a3b8; }
.po-table th.num { text-align: right; }
.po-table th.center { text-align: center; }
.po-table th.sortable { cursor: pointer; user-select: none; }
.po-table td {
  padding: 0.75rem 0.9rem; border-top: 1px solid #f1f5f9;
  color: #1e293b; vertical-align: middle;
}
body.dark-mode .po-table td {
  border-top-color: rgba(255, 255, 255, 0.05); color: #e2e8f0;
}
.po-table td.num { text-align: right; }
.po-table td.center { text-align: center; }
.po-table tbody tr:hover { background: #f8fafc; }
body.dark-mode .po-table tbody tr:hover { background: rgba(255, 255, 255, 0.03); }
.po-table tbody tr.overdue { background: #fef2f2; }
body.dark-mode .po-table tbody tr.overdue { background: rgba(239, 68, 68, 0.05); }
.actions-cell { white-space: nowrap; }

.po-icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; margin: 0 2px; border-radius: 8px;
  border: 1px solid #e2e8f0; background: #ffffff; color: #334155;
  cursor: pointer; font-size: 0.85rem;
}
body.dark-mode .po-icon-btn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.18); color: #cbd5e1;
}
.po-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.po-pill {
  display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px;
  font-size: 0.68rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.03em; border: 1px solid transparent;
}
.po-pill-unpaid   { background: #fee2e2; color: #b91c1c; }
.po-pill-partial  { background: #fef3c7; color: #b45309; }
.po-pill-paid     { background: #dcfce7; color: #15803d; }
.po-pill-succeeded{ background: #dcfce7; color: #15803d; }
.po-pill-pending  { background: #fef3c7; color: #b45309; }
.po-pill-failed   { background: #fee2e2; color: #b91c1c; }

.po-pill-lifecycle-draft        { background: #f1f5f9; color: #475569; }
.po-pill-lifecycle-ordered      { background: #dbeafe; color: #1d4ed8; }
.po-pill-lifecycle-acknowledged { background: #dbeafe; color: #1d4ed8; }
.po-pill-lifecycle-shipped      { background: #fef3c7; color: #b45309; }
.po-pill-lifecycle-delivered    { background: #dcfce7; color: #15803d; }
.po-pill-lifecycle-grn_posted   { background: #dcfce7; color: #15803d; }
.po-pill-lifecycle-invoiced     { background: #ede9fe; color: #6d28d9; }
.po-pill-lifecycle-matched      { background: #ede9fe; color: #6d28d9; }
.po-pill-lifecycle-paid         { background: #dcfce7; color: #15803d; }
.po-pill-lifecycle-closed       { background: #f1f5f9; color: #475569; }
.po-pill-lifecycle-cancelled    { background: #f3f4f6; color: #6b7280; }

.po-overdue {
  display: inline-block; margin-left: 0.4rem; padding: 0.15rem 0.4rem;
  border-radius: 6px; font-size: 0.65rem; font-weight: 600;
  background: #fee2e2; color: #b91c1c;
}
.muted { color: #64748b; }
body.dark-mode .muted { color: #94a3b8; }
.small { font-size: 0.78rem; }

.po-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 3rem 1rem; text-align: center;
  color: #64748b; gap: 1rem;
}
.po-spinner {
  width: 40px; height: 40px; border: 4px solid #e2e8f0;
  border-top-color: #6366f1; border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

.po-drawer-backdrop {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px); z-index: 9000;
  display: flex; justify-content: flex-end;
  animation: fade 0.15s ease;
}
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
.po-drawer {
  width: 100%; max-width: 480px; height: 100%; background: #ffffff;
  border-left: 1px solid #e2e8f0; display: flex; flex-direction: column;
  animation: slideIn 0.22s ease; color: #1e293b;
}
body.dark-mode .po-drawer {
  background: rgba(20, 16, 46, 0.95);
  border-left-color: rgba(167, 139, 250, 0.22); color: #e2e8f0;
}
@keyframes slideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
.po-drawer-head {
  padding: 1.1rem 1.25rem; border-bottom: 1px solid #f1f5f9;
  display: flex; justify-content: space-between; align-items: flex-start;
}
body.dark-mode .po-drawer-head { border-bottom-color: rgba(255, 255, 255, 0.06); }
.po-drawer-head h2 {
  margin: 0; font-size: 1rem; font-weight: 600; color: #0f172a;
}
body.dark-mode .po-drawer-head h2 { color: #f1f5f9; }
.po-drawer-body {
  flex: 1; overflow-y: auto; padding: 1.25rem;
  display: flex; flex-direction: column; gap: 1.5rem;
}
.po-drawer-section h3 {
  margin: 0 0 0.6rem; font-size: 0.8rem; text-transform: uppercase;
  letter-spacing: 0.05em; color: #64748b;
}
body.dark-mode .po-drawer-section h3 { color: #94a3b8; }
.po-drawer-amounts {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem; margin-bottom: 0.9rem;
}
.po-drawer-amounts > div {
  display: flex; flex-direction: column; gap: 0.2rem;
  padding: 0.7rem; border-radius: 10px; background: #f8fafc;
  border: 1px solid #f1f5f9;
}
body.dark-mode .po-drawer-amounts > div {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.po-drawer-amounts .muted { font-size: 0.7rem; text-transform: uppercase; }
.po-drawer-amounts strong { font-size: 1.05rem; color: #0f172a; }
body.dark-mode .po-drawer-amounts strong { color: #f1f5f9; }
.po-drawer-amounts .danger { color: #dc2626; }
.po-drawer-pills { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.9rem; }
.po-drawer-cta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.po-drawer-blocked {
  padding: 0.7rem 1rem; border-radius: 10px; background: #fef2f2;
  border: 1px solid #fecaca; color: #b91c1c; font-size: 0.82rem;
}
body.dark-mode .po-drawer-blocked {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.3); color: #fca5a5;
}
.po-meta {
  display: grid; grid-template-columns: auto 1fr;
  gap: 0.4rem 1rem; font-size: 0.82rem; margin: 0;
}
.po-meta dt { color: #64748b; font-weight: 500; }
body.dark-mode .po-meta dt { color: #94a3b8; }
.po-meta dd { margin: 0; color: #1e293b; }
body.dark-mode .po-meta dd { color: #e2e8f0; }
.po-list {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 0.6rem;
}
.po-list li {
  padding: 0.7rem 0.9rem; border-radius: 10px; background: #f8fafc;
  border: 1px solid #f1f5f9;
}
body.dark-mode .po-list li {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.po-list-row {
  display: flex; justify-content: space-between;
  align-items: center; font-size: 0.85rem; gap: 0.5rem;
}
.po-list-amount { font-weight: 600; color: #6366f1; }

/* Create modal */
.po-create-modal {
  width: 100%; max-width: 560px; max-height: 90vh;
  background: #ffffff; border-radius: 16px;
  display: flex; flex-direction: column; overflow: hidden;
  animation: slideIn 0.22s ease;
}
body.dark-mode .po-create-modal {
  background: rgba(20, 16, 46, 0.98);
  border: 1px solid rgba(167, 139, 250, 0.22);
}
.po-form-group { margin-bottom: 1rem; }
.po-form-group label {
  display: block; font-size: 0.8rem; font-weight: 600;
  color: #475569; margin-bottom: 0.35rem;
}
body.dark-mode .po-form-group label { color: #cbd5e1; }
.po-form-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
}
.po-input {
  width: 100%; padding: 0.55rem 0.75rem; border-radius: 10px;
  border: 1px solid #e2e8f0; background: #ffffff; color: #0f172a;
  font-size: 0.85rem; font-family: inherit; outline: none;
}
body.dark-mode .po-input {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2); color: #e2e8f0;
}
.po-total-preview {
  padding: 0.7rem 1rem; border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-size: 1.2rem; font-weight: 700; text-align: right;
}
</style>