<template>
  <div class="pm-page">
    <!-- ============================================================ -->
    <!-- PAGE HEADER -->
    <!-- ============================================================ -->
    <header class="pm-head">
      <div class="pm-head-left">
        <h1>
          <span class="pm-head-icon">💳</span>
          Supplier Payments
        </h1>
        <p class="pm-head-sub">
          Track, refund, and reconcile all supplier payments made via PayMongo.
        </p>
      </div>

      <div class="pm-head-right">
        <button class="pm-btn pm-btn-ghost" :disabled="loading" @click="reload">
          <span :class="{ spinning: loading }">⟳</span>
          Refresh
        </button>
        <button class="pm-btn pm-btn-ghost" :disabled="!rows.length" @click="exportCsv">
          ⬇ Export CSV
        </button>
      </div>
    </header>

    <!-- ============================================================ -->
    <!-- STAT TILES -->
    <!-- ============================================================ -->
    <section class="pm-stats">
      <div class="pm-tile">
        <span class="pm-tile-label">Succeeded</span>
        <span class="pm-tile-value success">₱{{ formatMoney(stats.succeeded_amount) }}</span>
        <span class="pm-tile-sub">{{ stats.succeeded_count || 0 }} payments</span>
      </div>
      <div class="pm-tile">
        <span class="pm-tile-label">Pending</span>
        <span class="pm-tile-value warn">₱{{ formatMoney(stats.pending_amount) }}</span>
        <span class="pm-tile-sub">{{ stats.pending_count || 0 }} payments</span>
      </div>
      <div class="pm-tile">
        <span class="pm-tile-label">Failed</span>
        <span class="pm-tile-value danger">₱{{ formatMoney(stats.failed_amount) }}</span>
        <span class="pm-tile-sub">{{ stats.failed_count || 0 }} payments</span>
      </div>
      <div class="pm-tile">
        <span class="pm-tile-label">Refunded</span>
        <span class="pm-tile-value info">₱{{ formatMoney(stats.refunded_amount) }}</span>
        <span class="pm-tile-sub">{{ stats.refunded_count || 0 }} payments</span>
      </div>
      <div class="pm-tile">
        <span class="pm-tile-label">Total Volume</span>
        <span class="pm-tile-value">₱{{ formatMoney(stats.total_amount) }}</span>
        <span class="pm-tile-sub">{{ stats.total_count || 0 }} payments</span>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- TOOLBAR -->
    <!-- ============================================================ -->
    <section class="pm-toolbar">
      <div class="pm-search">
        <span class="pm-search-icon">🔍</span>
        <input
          v-model="filters.q"
          type="text"
          placeholder="Search by ref, supplier, PO…"
          @input="debouncedLoad"
        />
      </div>

      <select v-model="filters.status" class="pm-select" @change="load">
        <option value="">All Statuses</option>
        <option value="pending">Pending</option>
        <option value="processing">Processing</option>
        <option value="succeeded">Succeeded</option>
        <option value="failed">Failed</option>
        <option value="cancelled">Cancelled</option>
        <option value="refunded">Refunded</option>
      </select>

      <select v-model="filters.method" class="pm-select" @change="load">
        <option value="">All Methods</option>
        <option value="paymongo_checkout">PayMongo Checkout</option>
        <option value="paymongo_link">PayMongo Link</option>
        <option value="paymongo">PayMongo Source</option>
        <option value="bank_transfer">Bank Transfer</option>
        <option value="cash">Cash</option>
        <option value="cheque">Cheque</option>
      </select>

      <input
        v-model="filters.date_from"
        type="date"
        class="pm-select"
        @change="load"
        title="From date"
      />
      <input
        v-model="filters.date_to"
        type="date"
        class="pm-select"
        @change="load"
        title="To date"
      />
    </section>

    <!-- ============================================================ -->
    <!-- TABLE -->
    <!-- ============================================================ -->
    <section class="pm-table-wrap">
      <div v-if="loading" class="pm-empty">
        <div class="pm-spinner"></div>
        <p>Loading payments…</p>
      </div>

      <div v-else-if="error" class="pm-empty error">
        <p>{{ error }}</p>
        <button class="pm-btn pm-btn-primary" @click="reload">Retry</button>
      </div>

      <div v-else-if="!filteredRows.length" class="pm-empty">
        <p>No payments match your filters.</p>
      </div>

      <table v-else class="pm-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Method</th>
            <th>Supplier</th>
            <th>PO</th>
            <th>Invoice</th>
            <th class="num">Amount</th>
            <th>Status</th>
            <th>Date</th>
            <th class="center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filteredRows" :key="p.id">
            <td>
              <strong>{{ p.payment_ref }}</strong>
              <div class="pm-sub">
                <span v-if="p.paymongo_status" class="muted small">
                  pm: {{ p.paymongo_status }}
                </span>
              </div>
            </td>
            <td>
              <span class="pm-method" :class="`pm-method-${methodClass(p.method)}`">
                {{ methodLabel(p.method, p.payment_method_type) }}
              </span>
            </td>
            <td>{{ p.supplier_name || '—' }}</td>
            <td>
              <span v-if="p.po_number" class="pm-link">{{ p.po_number }}</span>
              <span v-else class="muted">—</span>
            </td>
            <td>
              <span v-if="p.invoice_number" class="pm-link">{{ p.invoice_number }}</span>
              <span v-else class="muted">—</span>
            </td>
            <td class="num">
              <strong>₱{{ formatMoney(p.amount) }}</strong>
              <div v-if="Number(p.refunded_amount) > 0" class="pm-sub">
                <span class="muted small">
                  − ₱{{ formatMoney(p.refunded_amount) }} refunded
                </span>
              </div>
            </td>
            <td>
              <span class="pm-pill" :class="`pm-pill-${p.status}`">
                {{ statusLabel(p.status) }}
              </span>
            </td>
            <td>
              <div>{{ formatDate(p.created_at) }}</div>
              <div v-if="p.paid_at" class="pm-sub">
                <span class="muted small">paid {{ formatDate(p.paid_at) }}</span>
              </div>
            </td>
            <td class="center actions-cell">
              <!-- View -->
              <button
                class="pm-icon-btn pm-icon-view"
                title="View details"
                @click="openDetail(p)"
              >
                👁
              </button>

              <!-- Sync from PayMongo -->
              <button
                v-if="p.paymongo_checkout_id || p.paymongo_intent_id"
                class="pm-icon-btn pm-icon-sync"
                :disabled="syncing === p.id"
                title="Sync with PayMongo"
                @click="syncOne(p)"
              >
                <span :class="{ spinning: syncing === p.id }">⟳</span>
              </button>

              <!-- Copy link -->
              <button
                v-if="p.checkout_url"
                class="pm-icon-btn pm-icon-link"
                title="Copy payment link"
                @click="copyLink(p)"
              >
                🔗
              </button>

              <!-- Refund -->
              <button
                v-if="p.status === 'succeeded' || p.status === 'refunded'"
                class="pm-icon-btn pm-icon-refund"
                :disabled="Number(p.refunded_amount) >= Number(p.amount)"
                title="Refund"
                @click="openRefund(p)"
              >
                ↩️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ============================================================ -->
    <!-- DETAIL DRAWER -->
    <!-- ============================================================ -->
    <Teleport to="body">
      <div v-if="detail" class="pm-drawer-backdrop" @click.self="closeDetail">
        <aside class="pm-drawer">
          <header class="pm-drawer-head">
            <div>
              <h2>{{ detail.payment_ref }}</h2>
              <p class="muted">
                {{ detail.supplier_name }} · {{ methodLabel(detail.method, detail.payment_method_type) }}
              </p>
            </div>
            <button class="pm-icon-btn" @click="closeDetail">✕</button>
          </header>

          <div class="pm-drawer-body">
            <!-- Amount summary -->
            <div class="pm-drawer-section">
              <div class="pm-drawer-amounts">
                <div>
                  <span class="muted">Amount</span>
                  <strong>₱{{ formatMoney(detail.amount) }}</strong>
                </div>
                <div>
                  <span class="muted">Refunded</span>
                  <strong>₱{{ formatMoney(detail.refunded_amount) }}</strong>
                </div>
                <div>
                  <span class="muted">Net</span>
                  <strong class="success">
                    ₱{{ formatMoney(Number(detail.amount) - Number(detail.refunded_amount)) }}
                  </strong>
                </div>
              </div>

              <div class="pm-drawer-pills">
                <span class="pm-pill" :class="`pm-pill-${detail.status}`">
                  {{ statusLabel(detail.status) }}
                </span>
                <span v-if="detail.paymongo_status" class="pm-pill pm-pill-neutral">
                  {{ detail.paymongo_status }}
                </span>
                <span v-if="detail.days_overdue > 0" class="pm-overdue">
                  +{{ detail.days_overdue }}d overdue
                </span>
              </div>

              <div class="pm-drawer-cta">
                <button
                  v-if="detail.checkout_url"
                  class="pm-btn pm-btn-ghost"
                  @click="copyLink(detail)"
                >
                  🔗 Copy payment link
                </button>
                <button
                  v-if="detail.status === 'succeeded' || detail.status === 'refunded'"
                  class="pm-btn pm-btn-ghost"
                  :disabled="Number(detail.refunded_amount) >= Number(detail.amount)"
                  @click="openRefund(detail)"
                >
                  ↩️ Refund
                </button>
                <button
                  v-if="detail.paymongo_checkout_id || detail.paymongo_intent_id"
                  class="pm-btn pm-btn-primary"
                  :disabled="syncing === detail.id"
                  @click="syncOne(detail)"
                >
                  <span :class="{ spinning: syncing === detail.id }">⟳</span>
                  Sync with PayMongo
                </button>
              </div>
            </div>

            <!-- Meta grid -->
            <div class="pm-drawer-section">
              <h3>Details</h3>
              <dl class="pm-meta">
                <dt>Method</dt>
                <dd>{{ methodLabel(detail.method, detail.payment_method_type) }}</dd>
                <dt>Amount</dt>
                <dd>₱{{ formatMoney(detail.amount) }}</dd>
                <dt>Currency</dt>
                <dd>{{ detail.currency || 'PHP' }}</dd>
                <dt>Created</dt>
                <dd>{{ formatDateTime(detail.created_at) }}</dd>
                <dt v-if="detail.paid_at">Paid</dt>
                <dd v-if="detail.paid_at">{{ formatDateTime(detail.paid_at) }}</dd>
                <dt v-if="detail.paid_by_name">Recorded by</dt>
                <dd v-if="detail.paid_by_name">{{ detail.paid_by_name }}</dd>
                <dt v-if="detail.notes">Notes</dt>
                <dd v-if="detail.notes" class="pm-notes">{{ detail.notes }}</dd>
                <dt v-if="detail.failure_reason">Failure</dt>
                <dd v-if="detail.failure_reason" class="pm-error-text">{{ detail.failure_reason }}</dd>
              </dl>
            </div>

            <!-- Related -->
            <div class="pm-drawer-section" v-if="detail.po_number || detail.invoice_number">
              <h3>Related</h3>
              <dl class="pm-meta">
                <dt v-if="detail.po_number">Purchase Order</dt>
                <dd v-if="detail.po_number">{{ detail.po_number }}</dd>
                <dt v-if="detail.invoice_number">Invoice</dt>
                <dd v-if="detail.invoice_number">{{ detail.invoice_number }}</dd>
              </dl>
            </div>

            <!-- PayMongo IDs -->
            <div class="pm-drawer-section" v-if="detail.paymongo_checkout_id || detail.paymongo_intent_id || detail.paymongo_source_id">
              <h3>PayMongo IDs</h3>
              <dl class="pm-meta">
                <dt v-if="detail.paymongo_checkout_id">Checkout</dt>
                <dd v-if="detail.paymongo_checkout_id" class="mono">{{ detail.paymongo_checkout_id }}</dd>
                <dt v-if="detail.paymongo_intent_id">Intent</dt>
                <dd v-if="detail.paymongo_intent_id" class="mono">{{ detail.paymongo_intent_id }}</dd>
                <dt v-if="detail.paymongo_source_id">Source</dt>
                <dd v-if="detail.paymongo_source_id" class="mono">{{ detail.paymongo_source_id }}</dd>
                <dt v-if="detail.paymongo_link_id">Link</dt>
                <dd v-if="detail.paymongo_link_id" class="mono">{{ detail.paymongo_link_id }}</dd>
              </dl>
            </div>

            <!-- Raw payload (collapsible) -->
            <div class="pm-drawer-section" v-if="detail.paymongo_payload">
              <details>
                <summary class="pm-summary">Raw PayMongo payload</summary>
                <pre class="pm-payload">{{ prettyJson(detail.paymongo_payload) }}</pre>
              </details>
            </div>
          </div>
        </aside>
      </div>
    </Teleport>

    <!-- ============================================================ -->
    <!-- REFUND MODAL -->
    <!-- ============================================================ -->
    <Teleport to="body">
      <div v-if="refundModal" class="pm-drawer-backdrop" @click.self="closeRefund">
        <div class="pm-modal">
          <header class="pm-modal-head">
            <h3>Refund payment</h3>
            <button class="pm-icon-btn" :disabled="refunding" @click="closeRefund">✕</button>
          </header>

          <div class="pm-modal-body">
            <div class="pm-refund-summary">
              <div>
                <span class="muted">Original</span>
                <strong>₱{{ formatMoney(refundModal.amount) }}</strong>
              </div>
              <div>
                <span class="muted">Already refunded</span>
                <strong>₱{{ formatMoney(refundModal.refunded_amount) }}</strong>
              </div>
              <div>
                <span class="muted">Refundable</span>
                <strong class="success">
                  ₱{{ formatMoney(Number(refundModal.amount) - Number(refundModal.refunded_amount)) }}
                </strong>
              </div>
            </div>

            <label class="pm-field">
              <span>Refund amount (₱)</span>
              <input
                v-model.number="refundForm.amount"
                type="number"
                min="0.01"
                :max="Number(refundModal.amount) - Number(refundModal.refunded_amount)"
                step="0.01"
                :disabled="refunding"
              />
            </label>

            <label class="pm-field">
              <span>Reason</span>
              <textarea
                v-model="refundForm.reason"
                rows="2"
                placeholder="e.g. Wrong item, cancelled order, overpayment…"
                :disabled="refunding"
              ></textarea>
            </label>

            <div v-if="refundError" class="pm-modal-error">
              {{ refundError }}
            </div>
          </div>

          <footer class="pm-modal-foot">
            <button class="pm-btn pm-btn-ghost" :disabled="refunding" @click="closeRefund">
              Cancel
            </button>
            <button
              class="pm-btn pm-btn-danger"
              :disabled="refunding || !refundForm.amount || refundForm.amount <= 0"
              @click="confirmRefund"
            >
              {{ refunding ? 'Refunding…' : 'Confirm refund' }}
            </button>
          </footer>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import Swal from 'sweetalert2'
import api from '@/api/index'

const rows    = ref([])
const stats   = reactive({})
const detail  = ref(null)
const loading = ref(false)
const error   = ref(null)
const syncing = ref(null)

const filters = reactive({
  q: '',
  status: '',
  method: '',
  date_from: '',
  date_to: ''
})

// Refund state
const refundModal = ref(null)
const refundForm  = reactive({ amount: 0, reason: '' })
const refunding   = ref(false)
const refundError = ref(null)

// ============================================================
// COMPUTED
// ============================================================
const filteredRows = computed(() => {
  // Server already filters via query params; this is a fallback safety net
  return rows.value
})

// ============================================================
// LOADING
// ============================================================
async function load() {
  loading.value = true
  error.value = null
  try {
    const params = {}
    if (filters.status)    params.status = filters.status
    if (filters.q)         params.q = filters.q
    // method/date filters are client-side since backend doesn't have them yet
    const res = await api.get('/payments.php', { params })
    let data = res.data?.data || []

    // Client-side filters
    if (filters.method) {
      data = data.filter(p => p.method === filters.method)
    }
    if (filters.date_from) {
      const from = new Date(filters.date_from + 'T00:00:00').getTime()
      data = data.filter(p => new Date(p.created_at).getTime() >= from)
    }
    if (filters.date_to) {
      const to = new Date(filters.date_to + 'T23:59:59').getTime()
      data = data.filter(p => new Date(p.created_at).getTime() <= to)
    }
    if (filters.q) {
      const q = filters.q.toLowerCase()
      data = data.filter(p =>
        (p.payment_ref || '').toLowerCase().includes(q) ||
        (p.supplier_name || '').toLowerCase().includes(q) ||
        (p.po_number || '').toLowerCase().includes(q) ||
        (p.invoice_number || '').toLowerCase().includes(q)
      )
    }

    rows.value = data
    computeStats(data)
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to load payments'
  } finally {
    loading.value = false
  }
}

function computeStats(data) {
  let succeededCount = 0, succeededAmount = 0
  let pendingCount = 0, pendingAmount = 0
  let failedCount = 0, failedAmount = 0
  let refundedCount = 0, refundedAmount = 0
  let totalCount = data.length, totalAmount = 0

  for (const p of data) {
    const amt = Number(p.amount || 0)
    const ref = Number(p.refunded_amount || 0)
    totalAmount += amt

    if (p.status === 'succeeded') {
      succeededCount++; succeededAmount += amt
    } else if (p.status === 'pending' || p.status === 'processing') {
      pendingCount++; pendingAmount += amt
    } else if (p.status === 'failed' || p.status === 'cancelled') {
      failedCount++; failedAmount += amt
    } else if (p.status === 'refunded') {
      refundedCount++; refundedAmount += ref || amt
    }
  }

  Object.assign(stats, {
    succeeded_count: succeededCount, succeeded_amount: succeededAmount,
    pending_count: pendingCount, pending_amount: pendingAmount,
    failed_count: failedCount, failed_amount: failedAmount,
    refunded_count: refundedCount, refunded_amount: refundedAmount,
    total_count: totalCount, total_amount: totalAmount
  })
}

function reload() {
  load()
}

let debounceTimer = null
function debouncedLoad() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(load, 300)
}

// ============================================================
// DETAIL DRAWER
// ============================================================
async function openDetail(p) {
  detail.value = p
  try {
    const res = await api.get('/payments.php', { params: { id: p.id } })
    if (res.data?.success) detail.value = res.data.data
  } catch (e) { /* keep list data */ }
}
function closeDetail() { detail.value = null }

// ============================================================
// SYNC
// ============================================================
async function syncOne(p) {
  syncing.value = p.id
  try {
    const res = await api.get('/payments.php', { params: { action: 'retrieve', id: p.id } })
    if (res.data?.success) {
      // Update the row locally
      const idx = rows.value.findIndex(r => r.id === p.id)
      if (idx !== -1 && res.data.data) rows.value[idx] = res.data.data
      if (detail.value?.id === p.id) detail.value = res.data.data
      Swal.fire({
        icon: 'success',
        title: 'Synced',
        text: res.data.data?.status || 'Updated',
        timer: 1200,
        showConfirmButton: false,
        background: document.body.classList.contains('dark-mode') ? 'rgba(20,16,46,0.95)' : '#fff',
        color: document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b'
      })
    }
  } catch (e) {
    Swal.fire({
      icon: 'error',
      title: 'Sync failed',
      text: e?.response?.data?.message || e?.message || 'Try again',
      background: document.body.classList.contains('dark-mode') ? 'rgba(20,16,46,0.95)' : '#fff',
      color: document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b'
    })
  } finally {
    syncing.value = null
  }
}

// ============================================================
// COPY LINK
// ============================================================
async function copyLink(p) {
  if (!p.checkout_url) return
  try {
    await navigator.clipboard.writeText(p.checkout_url)
    Swal.fire({
      icon: 'success',
      title: 'Copied',
      text: 'Payment link copied to clipboard',
      timer: 1200,
      showConfirmButton: false,
      background: document.body.classList.contains('dark-mode') ? 'rgba(20,16,46,0.95)' : '#fff',
      color: document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b'
    })
  } catch (e) {
    Swal.fire({
      icon: 'info',
      title: 'Copy manually',
      html: `<input class="swal2-input" value="${p.checkout_url}" onclick="this.select()" readonly>`,
      background: document.body.classList.contains('dark-mode') ? 'rgba(20,16,46,0.95)' : '#fff',
      color: document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b'
    })
  }
}

// ============================================================
// REFUND
// ============================================================
function openRefund(p) {
  const refundable = Number(p.amount) - Number(p.refunded_amount || 0)
  if (refundable <= 0) return
  refundModal.value = p
  refundForm.amount = refundable
  refundForm.reason = ''
  refundError.value = null
}

function closeRefund() {
  if (refunding.value) return
  refundModal.value = null
  refundError.value = null
}

async function confirmRefund() {
  refunding.value = true
  refundError.value = null
  try {
    const res = await api.post('/payments.php', {
      kind: 'refund',
      payment_id: refundModal.value.id,
      amount: Number(refundForm.amount),
      reason: refundForm.reason || 'Refund from Smart POS'
    })
    if (!res.data?.success) throw new Error(res.data?.message || 'Refund failed')

    Swal.fire({
      icon: 'success',
      title: 'Refund issued',
      text: `Refund ID: ${res.data.refund_id || '—'}`,
      timer: 1800,
      showConfirmButton: false,
      background: document.body.classList.contains('dark-mode') ? 'rgba(20,16,46,0.95)' : '#fff',
      color: document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b'
    })
    closeRefund()
    load()
  } catch (e) {
    refundError.value = e?.response?.data?.message || e?.message || 'Refund failed'
  } finally {
    refunding.value = false
  }
}

// ============================================================
// CSV EXPORT
// ============================================================
function exportCsv() {
  const cols = [
    'payment_ref', 'method', 'payment_method_type', 'supplier_name',
    'po_number', 'invoice_number', 'amount', 'refunded_amount',
    'currency', 'status', 'paymongo_status', 'created_at', 'paid_at'
  ]
  const headers = cols.join(',')
  const lines = rows.value.map(p =>
    cols.map(c => {
      const v = p[c] ?? ''
      const s = String(v).replace(/"/g, '""')
      return /[",\n]/.test(s) ? `"${s}"` : s
    }).join(',')
  )
  const csv = [headers, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payments-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
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
function formatDateTime(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
function statusLabel(s) {
  return {
    pending: 'Pending',
    processing: 'Processing',
    succeeded: 'Succeeded',
    failed: 'Failed',
    cancelled: 'Cancelled',
    refunded: 'Refunded'
  }[s] || s || '—'
}
function methodLabel(m, sub) {
  const map = {
    paymongo: 'PayMongo',
    paymongo_checkout: 'Checkout',
    paymongo_link: 'Link',
    paymongo_intent: 'Intent',
    bank_transfer: 'Bank',
    cash: 'Cash',
    cheque: 'Cheque'
  }
  const base = map[m] || m || '—'
  return sub ? `${base} · ${sub}` : base
}
function methodClass(m) {
  if (m === 'paymongo_checkout') return 'checkout'
  if (m === 'paymongo_link')     return 'link'
  if (m === 'paymongo')          return 'source'
  if (m === 'bank_transfer')     return 'bank'
  if (m === 'cash')              return 'cash'
  if (m === 'cheque')            return 'cheque'
  return 'default'
}
function prettyJson(v) {
  if (!v) return ''
  try {
    const o = typeof v === 'string' ? JSON.parse(v) : v
    return JSON.stringify(o, null, 2)
  } catch (e) { return v }
}

onMounted(load)
</script>

<style scoped>
/* ============================================================
   PAGE
   ============================================================ */
.pm-page {
  padding: 1.5rem;
  color: #1e293b;
  font-size: 0.9rem;
}
body.dark-mode .pm-page { color: #e2e8f0; }

.pm-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.pm-head h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
body.dark-mode .pm-head h1 { color: #f1f5f9; }
.pm-head-icon { font-size: 1.3rem; }
.pm-head-sub {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: #64748b;
}
body.dark-mode .pm-head-sub { color: #94a3b8; }
.pm-head-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* ============================================================
   BUTTONS
   ============================================================ */
.pm-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-radius: 10px;
  font-weight: 500;
  font-size: 0.82rem;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  font-family: inherit;
}
.pm-btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
}
.pm-btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.pm-btn-danger {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
}
.pm-btn-danger:hover:not(:disabled) { filter: brightness(1.1); }
.pm-btn-ghost {
  background: #ffffff;
  color: #334155;
  border-color: #e2e8f0;
}
.pm-btn-ghost:hover:not(:disabled) { background: #f8fafc; }
body.dark-mode .pm-btn-ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border-color: rgba(167, 139, 250, 0.18);
}
body.dark-mode .pm-btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}
.pm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.spinning { display: inline-block; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg) } }

/* ============================================================
   STAT TILES
   ============================================================ */
.pm-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}
.pm-tile {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.9rem 1rem;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
body.dark-mode .pm-tile {
  background: rgba(26, 22, 48, 0.55);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-color: rgba(167, 139, 250, 0.18);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(124, 58, 237, 0.08);
}
.pm-tile-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}
body.dark-mode .pm-tile-label { color: #94a3b8; }
.pm-tile-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}
body.dark-mode .pm-tile-value { color: #f1f5f9; }
.pm-tile-value.success { color: #16a34a; }
.pm-tile-value.warn    { color: #d97706; }
.pm-tile-value.danger  { color: #dc2626; }
.pm-tile-value.info    { color: #2563eb; }
body.dark-mode .pm-tile-value.success { color: #22c55e; }
body.dark-mode .pm-tile-value.warn    { color: #facc15; }
body.dark-mode .pm-tile-value.danger  { color: #f87171; }
body.dark-mode .pm-tile-value.info    { color: #60a5fa; }
.pm-tile-sub {
  font-size: 0.7rem;
  color: #94a3b8;
}

/* ============================================================
   TOOLBAR
   ============================================================ */
.pm-toolbar {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 1rem;
}
.pm-search {
  position: relative;
  flex: 1 1 240px;
  min-width: 200px;
}
.pm-search input {
  width: 100%;
  padding: 0.6rem 0.8rem 0.6rem 2.2rem;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
}
.pm-search input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
body.dark-mode .pm-search input {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2);
  color: #e2e8f0;
}
body.dark-mode .pm-search input:focus {
  border-color: rgba(167, 139, 250, 0.5);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
}
.pm-search-icon {
  position: absolute;
  top: 50%;
  left: 0.7rem;
  transform: translateY(-50%);
  font-size: 0.85rem;
  opacity: 0.5;
}
.pm-select {
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  font-size: 0.82rem;
  font-family: inherit;
  outline: none;
  cursor: pointer;
}
.pm-select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
body.dark-mode .pm-select {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2);
  color: #e2e8f0;
}
body.dark-mode .pm-select option {
  background: #1a1630;
  color: #e2e8f0;
}

/* ============================================================
   TABLE
   ============================================================ */
.pm-table-wrap {
  border-radius: 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
body.dark-mode .pm-table-wrap {
  background: rgba(26, 22, 48, 0.55);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-color: rgba(167, 139, 250, 0.18);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(124, 58, 237, 0.08);
}
.pm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.pm-table thead { background: #f8fafc; }
body.dark-mode .pm-table thead { background: rgba(255, 255, 255, 0.04); }
.pm-table th {
  text-align: left;
  padding: 0.75rem 0.9rem;
  font-weight: 600;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #475569;
  white-space: nowrap;
}
body.dark-mode .pm-table th { color: #94a3b8; }
.pm-table th.num { text-align: right; }
.pm-table th.center { text-align: center; }
.pm-table td {
  padding: 0.75rem 0.9rem;
  border-top: 1px solid #f1f5f9;
  color: #1e293b;
  vertical-align: middle;
}
body.dark-mode .pm-table td {
  border-top-color: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}
.pm-table td.num { text-align: right; }
.pm-table td.center { text-align: center; }
.pm-table tbody tr:hover { background: #f8fafc; }
body.dark-mode .pm-table tbody tr:hover { background: rgba(255, 255, 255, 0.03); }

.pm-sub { margin-top: 0.15rem; }

.actions-cell { white-space: nowrap; }

/* ============================================================
   METHOD BADGES
   ============================================================ */
.pm-method {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 500;
  border: 1px solid transparent;
}
.pm-method-checkout { background: #eef2ff; color: #4338ca; border-color: #c7d2fe; }
.pm-method-link     { background: #f3e8ff; color: #6b21a8; border-color: #e9d5ff; }
.pm-method-source   { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
.pm-method-bank     { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
.pm-method-cash     { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
.pm-method-cheque   { background: #fef3c7; color: #92400e; border-color: #fde68a; }
.pm-method-default  { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
body.dark-mode .pm-method-checkout { background: rgba(99,102,241,0.18); color: #a5b4fc; border-color: rgba(99,102,241,0.4); }
body.dark-mode .pm-method-link     { background: rgba(139,92,246,0.18); color: #c4b5fd; border-color: rgba(139,92,246,0.4); }
body.dark-mode .pm-method-source   { background: rgba(79,70,229,0.18); color: #a5b4fc; border-color: rgba(79,70,229,0.4); }
body.dark-mode .pm-method-bank     { background: rgba(148,163,184,0.18); color: #cbd5e1; border-color: rgba(148,163,184,0.35); }
body.dark-mode .pm-method-cash     { background: rgba(34,197,94,0.18); color: #86efac; border-color: rgba(34,197,94,0.4); }
body.dark-mode .pm-method-cheque   { background: rgba(234,179,8,0.18); color: #fcd34d; border-color: rgba(234,179,8,0.4); }
body.dark-mode .pm-method-default  { background: rgba(148,163,184,0.18); color: #cbd5e1; border-color: rgba(148,163,184,0.35); }

/* ============================================================
   ICON BUTTONS
   ============================================================ */
.pm-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  margin: 0 2px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.12s ease;
}
.pm-icon-btn:hover:not(:disabled) {
  background: #eef2ff;
  border-color: #a5b4fc;
}
.pm-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pm-icon-refund:hover { background: #fef2f2 !important; border-color: #fca5a5 !important; }
.pm-icon-link:hover   { background: #f3e8ff !important; border-color: #d8b4fe !important; }
.pm-icon-sync:hover   { background: #eef2ff !important; border-color: #a5b4fc !important; }
body.dark-mode .pm-icon-btn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.18);
  color: #cbd5e1;
}
body.dark-mode .pm-icon-btn:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.18);
  border-color: rgba(167, 139, 250, 0.5);
}

/* ============================================================
   PILLS
   ============================================================ */
.pm-pill {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border: 1px solid transparent;
}
.pm-pill-pending,
.pm-pill-processing { background: #fef3c7; color: #b45309; border-color: #fde68a; }
.pm-pill-succeeded  { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
.pm-pill-failed,
.pm-pill-cancelled  { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
.pm-pill-refunded   { background: #e0e7ff; color: #3730a3; border-color: #c7d2fe; }
.pm-pill-neutral    { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }

body.dark-mode .pm-pill-pending,
body.dark-mode .pm-pill-processing { background: rgba(234,179,8,0.18); color: #fcd34d; border-color: rgba(234,179,8,0.4); }
body.dark-mode .pm-pill-succeeded  { background: rgba(34,197,94,0.18); color: #86efac; border-color: rgba(34,197,94,0.4); }
body.dark-mode .pm-pill-failed,
body.dark-mode .pm-pill-cancelled  { background: rgba(239,68,68,0.18); color: #fca5a5; border-color: rgba(239,68,68,0.4); }
body.dark-mode .pm-pill-refunded   { background: rgba(99,102,241,0.18); color: #a5b4fc; border-color: rgba(99,102,241,0.4); }
body.dark-mode .pm-pill-neutral    { background: rgba(148,163,184,0.18); color: #cbd5e1; border-color: rgba(148,163,184,0.35); }

.pm-overdue {
  display: inline-block;
  margin-left: 0.4rem;
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  font-size: 0.65rem;
  font-weight: 600;
  background: #fee2e2;
  color: #b91c1c;
}
body.dark-mode .pm-overdue {
  background: rgba(239,68,68,0.18);
  color: #fca5a5;
}

.pm-link {
  color: #6366f1;
  font-weight: 500;
}
body.dark-mode .pm-link { color: #a5b4fc; }

.muted { color: #64748b; }
body.dark-mode .muted { color: #94a3b8; }
.small { font-size: 0.78rem; }
.mono { font-family: ui-monospace, monospace; font-size: 0.75rem; }

/* ============================================================
   EMPTY / LOADING
   ============================================================ */
.pm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: #64748b;
  gap: 1rem;
}
.pm-empty.error { color: #dc2626; }
body.dark-mode .pm-empty.error { color: #f87171; }
.pm-spinner {
  width: 40px; height: 40px;
  border: 4px solid #e2e8f0;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
body.dark-mode .pm-spinner {
  border-color: rgba(255, 255, 255, 0.1);
  border-top-color: #8b5cf6;
}

/* ============================================================
   DETAIL DRAWER
   ============================================================ */
.pm-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(4px);
  z-index: 9000;
  display: flex;
  justify-content: flex-end;
  animation: fade 0.15s ease;
}
body.dark-mode .pm-drawer-backdrop { background: rgba(0, 0, 0, 0.55); }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }

.pm-drawer {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.22s ease;
  color: #1e293b;
  box-shadow: -10px 0 30px -10px rgba(15, 23, 42, 0.15);
}
body.dark-mode .pm-drawer {
  background: rgba(20, 16, 46, 0.95);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border-left-color: rgba(167, 139, 250, 0.22);
  color: #e2e8f0;
  box-shadow: -10px 0 40px -10px rgba(0, 0, 0, 0.6), 0 0 60px rgba(124, 58, 237, 0.2);
}
@keyframes slideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }

.pm-drawer-head {
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
body.dark-mode .pm-drawer-head { border-bottom-color: rgba(255, 255, 255, 0.06); }
.pm-drawer-head h2 { margin: 0; font-size: 1rem; font-weight: 600; color: #0f172a; }
body.dark-mode .pm-drawer-head h2 { color: #f1f5f9; }
.pm-drawer-head .muted { font-size: 0.8rem; margin: 0.25rem 0 0; }

.pm-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.pm-drawer-section h3 {
  margin: 0 0 0.6rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}
body.dark-mode .pm-drawer-section h3 { color: #94a3b8; }

.pm-drawer-amounts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}
.pm-drawer-amounts > div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.7rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
}
body.dark-mode .pm-drawer-amounts > div {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.pm-drawer-amounts .muted { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; }
.pm-drawer-amounts strong { font-size: 1.05rem; color: #0f172a; }
body.dark-mode .pm-drawer-amounts strong { color: #f1f5f9; }
.pm-drawer-amounts .success { color: #16a34a; }
body.dark-mode .pm-drawer-amounts .success { color: #22c55e; }

.pm-drawer-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.9rem;
}
.pm-drawer-cta { display: flex; gap: 0.5rem; flex-wrap: wrap; }

.pm-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem 1rem;
  font-size: 0.82rem;
  margin: 0;
}
.pm-meta dt { color: #64748b; font-weight: 500; }
body.dark-mode .pm-meta dt { color: #94a3b8; }
.pm-meta dd { margin: 0; color: #1e293b; }
body.dark-mode .pm-meta dd { color: #e2e8f0; }

.pm-notes {
  white-space: pre-wrap;
  font-style: italic;
  color: #475569 !important;
}
body.dark-mode .pm-notes { color: #cbd5e1 !important; }
.pm-error-text { color: #dc2626; }
body.dark-mode .pm-error-text { color: #f87171; }

.pm-summary {
  cursor: pointer;
  font-size: 0.8rem;
  color: #6366f1;
  user-select: none;
  margin-bottom: 0.4rem;
}
body.dark-mode .pm-summary { color: #a5b4fc; }

.pm-payload {
  margin: 0;
  padding: 0.8rem;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
  font-size: 0.72rem;
  font-family: ui-monospace, monospace;
  max-height: 300px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  border: 1px solid #e2e8f0;
}
body.dark-mode .pm-payload {
  background: rgba(0, 0, 0, 0.3);
  color: #a5b4fc;
  border-color: rgba(255, 255, 255, 0.06);
}

/* ============================================================
   REFUND MODAL
   ============================================================ */
.pm-modal {
  width: 100%;
  max-width: 460px;
  margin: auto;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.25);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  color: #1e293b;
}
body.dark-mode .pm-modal {
  background: rgba(20, 16, 46, 0.95);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border-color: rgba(167, 139, 250, 0.22);
  color: #e2e8f0;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 60px rgba(124, 58, 237, 0.25);
}

.pm-modal-head {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
body.dark-mode .pm-modal-head { border-bottom-color: rgba(255, 255, 255, 0.06); }
.pm-modal-head h3 { margin: 0; font-size: 1rem; font-weight: 600; }

.pm-modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.pm-refund-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.6rem;
}
.pm-refund-summary > div {
  padding: 0.6rem;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
body.dark-mode .pm-refund-summary > div {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.pm-refund-summary .muted { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; }
.pm-refund-summary strong { font-size: 0.95rem; }
.pm-refund-summary .success { color: #16a34a; }
body.dark-mode .pm-refund-summary .success { color: #22c55e; }

.pm-field { display: flex; flex-direction: column; gap: 0.35rem; }
.pm-field > span {
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;
}
body.dark-mode .pm-field > span { color: #94a3b8; }
.pm-field input,
.pm-field textarea {
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
}
.pm-field input:focus,
.pm-field textarea:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}
body.dark-mode .pm-field input,
body.dark-mode .pm-field textarea {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2);
  color: #e2e8f0;
}
body.dark-mode .pm-field input:focus,
body.dark-mode .pm-field textarea:focus {
  border-color: rgba(167, 139, 250, 0.5);
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.2);
}

.pm-modal-error {
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 0.8rem;
  border: 1px solid #fecaca;
}
body.dark-mode .pm-modal-error {
  background: rgba(239, 68, 68, 0.12);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.3);
}

.pm-modal-foot {
  padding: 1rem 1.25rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
body.dark-mode .pm-modal-foot { border-top-color: rgba(255, 255, 255, 0.06); }
</style>