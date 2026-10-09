<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="wallet-container">

          <!-- HEADER -->
          <header class="page-header">
            <div>
              <h2><i class="fas fa-wallet"></i> Wallet Management</h2>
              <p>Employee wallet balances and transaction history</p>
            </div>
            <div class="header-actions">
              <button @click="refreshData" class="btn-ghost" :disabled="loading">
                <i class="fas fa-sync" :class="{ spin: loading }"></i> Refresh
              </button>
              <button @click="openAdjustModal()" class="btn-primary">
                <i class="fas fa-plus-circle"></i> Adjust Balance
              </button>
            </div>
          </header>

          <!-- STATS -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #059669;">
                <i class="fas fa-coins"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Total Balance</p>
                <p class="stat-value">₱{{ formatPrice(stats.totalBalance) }}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4F46E5;">
                <i class="fas fa-wallet"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Active Wallets</p>
                <p class="stat-value">{{ stats.activeWallets }} / {{ stats.totalWallets }}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #f3f4f6, #e5e7eb); color: #6b7280;">
                <i class="fas fa-user-slash"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Zero Balance</p>
                <p class="stat-value">{{ stats.zeroWallets }}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706;">
                <i class="fas fa-exchange-alt"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Transactions</p>
                <p class="stat-value">{{ stats.totalTransactions }}</p>
              </div>
            </div>
          </div>

          <!-- FILTERS -->
          <div class="filters-bar">
            <div class="search-wrap">
              <i class="fas fa-search"></i>
              <input v-model="search" type="text" placeholder="Search by name, username, or department..." />
            </div>
            <select v-model="filterType" class="form-control">
              <option value="">All Wallets</option>
              <option value="with-balance">With Balance</option>
              <option value="zero-balance">Zero Balance</option>
            </select>
          </div>

          <!-- WALLET TABLE -->
          <div class="panel">
            <div v-if="loading" class="state-loading">
              <i class="fas fa-spinner spin"></i> Loading wallets...
            </div>

            <div v-else-if="filteredWallets.length === 0" class="state-empty">
              <i class="fas fa-wallet"></i>
              <p>No wallets match your filters</p>
            </div>

            <div v-else class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Role</th>
                    <th class="num">Balance</th>
                    <th>Last Activity</th>
                    <th class="center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="w in filteredWallets" :key="w.id">
                    <td>
                      <div class="user-cell">
                        <div class="avatar">{{ initials(w.full_name || w.username) }}</div>
                        <div>
                          <div class="user-name">{{ w.full_name || w.username }}</div>
                          <div class="user-sub">@{{ w.username }}</div>
                        </div>
                      </div>
                    </td>
                    <td>{{ w.department || 'General' }}</td>
                    <td class="small muted">{{ w.role || 'staff' }}</td>
                    <td class="num">
                      <span :class="balanceClass(w.balance)">
                        ₱{{ formatPrice(w.balance) }}
                      </span>
                    </td>
                    <td class="small muted">
                      {{ w.updated_at ? formatDateTime(w.updated_at) : '—' }}
                    </td>
                    <td class="center">
                      <button @click="openDetail(w)" class="btn-sm btn-view" title="View Wallet">
                        <i class="fas fa-eye"></i>
                      </button>
                      <button @click="openAdjustModal(w)" class="btn-sm btn-edit" title="Adjust">
                        <i class="fas fa-edit"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>

  <!-- ============================================ -->
  <!-- DETAIL MODAL -->
  <!-- ============================================ -->
  <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
    <div class="modal-content detail-modal">
      <div class="modal-header">
        <div>
          <h5><i class="fas fa-wallet"></i> Wallet Details</h5>
          <p class="muted small" v-if="activeWallet">
            {{ activeWallet.full_name || activeWallet.username }}
          </p>
        </div>
        <button @click="closeDetailModal" class="btn-close">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Balance card -->
        <div class="balance-card-detail">
          <div class="balance-icon">
            <i class="fas fa-coins"></i>
          </div>
          <div>
            <p class="muted small">Current Balance</p>
            <p class="balance-amount">₱{{ formatPrice(activeWallet?.balance) }}</p>
          </div>
        </div>

        <!-- Employee info -->
        <div class="info-grid">
          <div class="info-block">
            <span class="info-label">Username</span>
            <span class="info-value">@{{ activeWallet?.username }}</span>
          </div>
          <div class="info-block">
            <span class="info-label">Department</span>
            <span class="info-value">{{ activeWallet?.department || 'General' }}</span>
          </div>
        </div>

        <!-- Transactions -->
        <div class="transactions-section">
          <h4><i class="fas fa-history"></i> Transaction History</h4>

          <div v-if="loadingTx" class="state-loading small">
            <i class="fas fa-spinner spin"></i> Loading...
          </div>

          <div v-else-if="transactions.length === 0" class="state-empty small">
            <i class="fas fa-receipt"></i>
            <p>No transactions yet</p>
          </div>

          <div v-else class="tx-list">
            <div v-for="tx in transactions" :key="tx.id" class="tx-item">
              <div class="tx-icon" :class="`tx-${tx.type}`">
                <i :class="txIcon(tx.type)"></i>
              </div>
              <div class="tx-info">
                <div class="tx-desc">{{ tx.description || '(no description)' }}</div>
                <div class="tx-meta">
                  {{ formatDateTime(tx.created_at) }} ·
                  <span class="tx-type">{{ tx.type }}</span>
                </div>
              </div>
              <div class="tx-amount" :class="txAmountClass(tx.type)">
                {{ txAmountSign(tx.type) }}₱{{ formatPrice(tx.amount) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeDetailModal" class="btn btn-secondary">Close</button>
      </div>
    </div>
  </div>

  <!-- ============================================ -->
  <!-- ADJUST MODAL -->
  <!-- ============================================ -->
  <div v-if="showAdjustModal" class="modal-overlay" @click.self="closeAdjustModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-plus-circle"></i> Adjust Wallet Balance</h5>
        <button @click="closeAdjustModal" class="btn-close">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label>Employee <span class="req">*</span></label>
          <select v-model="adjustForm.user_id" class="form-control" :disabled="!!activeWallet">
            <option value="">-- Select Employee --</option>
            <option v-for="w in wallets" :key="w.user_id" :value="w.user_id">
              {{ w.full_name || w.username }} (₱{{ formatPrice(w.balance) }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Action</label>
          <div class="action-grid">
            <button
              type="button"
              class="action-tile"
              :class="{ active: adjustForm.action === 'deposit' }"
              @click="adjustForm.action = 'deposit'"
            >
              <i class="fas fa-arrow-down"></i>
              <span>Deposit</span>
            </button>
            <button
              type="button"
              class="action-tile"
              :class="{ active: adjustForm.action === 'withdraw' }"
              @click="adjustForm.action = 'withdraw'"
            >
              <i class="fas fa-arrow-up"></i>
              <span>Withdraw</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Amount <span class="req">*</span></label>
          <input v-model.number="adjustForm.amount" type="number" step="0.01" min="0" class="form-control" placeholder="0.00" />
        </div>

        <div class="form-group">
          <label>Description</label>
          <input v-model="adjustForm.description" type="text" class="form-control" placeholder="e.g. Bonus, correction, adjustment" />
        </div>

        <div v-if="adjustError" class="error-box">
          <i class="fas fa-exclamation-triangle"></i> {{ adjustError }}
        </div>
      </div>

      <div class="modal-footer">
        <button @click="closeAdjustModal" class="btn btn-secondary" :disabled="processing">Cancel</button>
        <button @click="submitAdjust" class="btn btn-primary" :disabled="processing || !canAdjust">
          {{ processing ? 'Processing...' : (adjustForm.action === 'deposit' ? 'Deposit' : 'Withdraw') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import api from '@/api/index.js'
import Swal from 'sweetalert2'

// ============================================
// STATE
// ============================================
const wallets        = ref([])
const transactions   = ref([])
const loading        = ref(false)
const loadingTx      = ref(false)
const processing     = ref(false)
const search         = ref('')
const filterType     = ref('')

const showDetailModal = ref(false)
const showAdjustModal = ref(false)
const activeWallet    = ref(null)

const adjustForm = ref({
  user_id: '',
  action: 'deposit',
  amount: 0,
  description: '',
})
const adjustError = ref(null)

// ============================================
// COMPUTED
// ============================================
const filteredWallets = computed(() => {
  let list = [...wallets.value]

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(w =>
      (w.full_name || '').toLowerCase().includes(q) ||
      (w.username || '').toLowerCase().includes(q) ||
      (w.department || '').toLowerCase().includes(q)
    )
  }

  if (filterType.value === 'with-balance') {
    list = list.filter(w => Number(w.balance) > 0)
  } else if (filterType.value === 'zero-balance') {
    list = list.filter(w => Number(w.balance) === 0)
  }

  return list.sort((a, b) => Number(b.balance) - Number(a.balance))
})

const stats = computed(() => {
  const list = wallets.value
  const totalBalance = list.reduce((sum, w) => sum + Number(w.balance || 0), 0)
  const activeWallets = list.filter(w => Number(w.balance) > 0).length
  const zeroWallets = list.filter(w => Number(w.balance) === 0).length

  return {
    totalBalance,
    totalWallets: list.length,
    activeWallets,
    zeroWallets,
    totalTransactions: transactions.value.length || '—',
  }
})

const canAdjust = computed(() =>
  adjustForm.value.user_id &&
  Number(adjustForm.value.amount) > 0
)

// ============================================
// HELPERS
// ============================================
const formatPrice = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const formatDateTime = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const initials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

const balanceClass = (b) => {
  const n = Number(b || 0)
  if (n <= 0) return 'bal-zero'
  if (n < 1000) return 'bal-low'
  return 'bal-good'
}

const txIcon = (type) => ({
  deposit:  'fas fa-arrow-down',
  withdraw: 'fas fa-arrow-up',
  transfer: 'fas fa-exchange-alt',
  refund:   'fas fa-undo',
  payment:  'fas fa-receipt',
}[type] || 'fas fa-circle')

const txAmountClass = (type) =>
  (type === 'withdraw' || type === 'payment') ? 'tx-neg' : 'tx-pos'

const txAmountSign = (type) =>
  (type === 'withdraw' || type === 'payment') ? '−' : '+'

// ============================================
// LOAD WALLETS
// ============================================
const loadWallets = async () => {
  loading.value = true
  try {
    const { data } = await api.get('/wallets.php')
    const list = Array.isArray(data) ? data : (data.data || [])
    wallets.value = list
  } catch (e) {
    console.error('loadWallets:', e)
    wallets.value = []
  } finally {
    loading.value = false
  }
}

// ============================================
// LOAD TRANSACTIONS FOR A WALLET
// ============================================
const loadTransactions = async (walletId) => {
  loadingTx.value = true
  try {
    // Uses wallet_transactions endpoint — filter by wallet_id
    const { data } = await api.get(`/wallet_transactions.php?wallet_id=${walletId}`)
    let list = []
    if (Array.isArray(data)) list = data
    else if (Array.isArray(data.data)) list = data.data
    else if (Array.isArray(data.transactions)) list = data.transactions
    transactions.value = list
  } catch (e) {
    console.error('loadTransactions:', e)
    transactions.value = []
  } finally {
    loadingTx.value = false
  }
}

// ============================================
// DETAIL MODAL
// ============================================
const openDetail = async (wallet) => {
  activeWallet.value = wallet
  transactions.value = []
  showDetailModal.value = true
  await loadTransactions(wallet.id)
}

const closeDetailModal = () => {
  showDetailModal.value = false
  activeWallet.value = null
  transactions.value = []
}

// ============================================
// ADJUST MODAL
// ============================================
const openAdjustModal = (wallet = null) => {
  adjustError.value = null
  adjustForm.value = {
    user_id: wallet?.user_id || '',
    action: 'deposit',
    amount: 0,
    description: '',
  }
  activeWallet.value = wallet || null
  showAdjustModal.value = true
}

const closeAdjustModal = () => {
  if (processing.value) return
  showAdjustModal.value = false
  activeWallet.value = null
  adjustError.value = null
}

const submitAdjust = async () => {
  if (!canAdjust.value) return

  processing.value = true
  adjustError.value = null
  try {
    const { data } = await api.post('/wallets.php', {
      action: adjustForm.value.action,
      user_id: adjustForm.value.user_id,
      amount: Number(adjustForm.value.amount),
      description: adjustForm.value.description || `${adjustForm.value.action} by Finance`,
    })

    if (data.success) {
      showAdjustModal.value = false
      await loadWallets()
      Swal.fire({
        icon: 'success',
        title: 'Done!',
        html: `<p>New balance: <strong>₱${formatPrice(data.new_balance)}</strong></p>`,
        timer: 1800,
        showConfirmButton: false,
      })
    } else {
      adjustError.value = data.message || 'Action failed'
    }
  } catch (e) {
    adjustError.value = e.response?.data?.message || e.message || 'Action failed'
  } finally {
    processing.value = false
  }
}

// ============================================
// REFRESH
// ============================================
const refreshData = async () => {
  await loadWallets()
}

// ============================================
// LIFECYCLE
// ============================================
onMounted(loadWallets)
</script>

<style scoped>
/* ---------- Layout ---------- */
.app-layout { display: flex; min-height: 100vh; }
.main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.page-content { flex: 1; background: #f1f5f9; padding: 1.5rem; }
body.dark-mode .page-content { background: #0f172a; }
.wallet-container { max-width: 1400px; margin: 0 auto; }

/* ---------- Header ---------- */
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
}
.page-header h2 { font-size: 1.5rem; font-weight: 700; margin: 0; color: #1a1a2e; display: flex; align-items: center; gap: .5rem; }
.page-header h2 i { color: #4F46E5; }
.page-header p { margin: .25rem 0 0; color: #6b7280; font-size: .9rem; }
body.dark-mode .page-header h2 { color: #f1f5f9; }
body.dark-mode .page-header p { color: #94a3b8; }
.header-actions { display: flex; gap: .5rem; }

.btn-ghost {
  background: rgba(255, 255, 255, .55); border: 1px solid rgba(255, 255, 255, .7);
  padding: .5rem 1rem; border-radius: 10px; color: #374151; cursor: pointer;
  display: inline-flex; align-items: center; gap: .4rem; font-size: .85rem; font-weight: 500;
  font-family: inherit;
}
.btn-ghost:hover:not(:disabled) { background: rgba(255, 255, 255, .8); }
.btn-ghost:disabled { opacity: .5; cursor: not-allowed; }
body.dark-mode .btn-ghost { background: rgba(255, 255, 255, .06); border-color: rgba(167, 139, 250, .2); color: #e2e8f0; }

.btn-primary {
  background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff;
  border: none; padding: .5rem 1rem; border-radius: 10px; cursor: pointer;
  display: inline-flex; align-items: center; gap: .4rem; font-size: .85rem; font-weight: 600;
  font-family: inherit;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(79, 70, 229, .3); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }

.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ---------- Stats ---------- */
.stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem; margin-bottom: 1.5rem;
}
.stat-card {
  display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, .85); border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, .8);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .05);
}
body.dark-mode .stat-card {
  background: rgba(26, 22, 48, .55);
  border-color: rgba(167, 139, 250, .15);
}
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
.stat-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin: 0; }
.stat-value { font-size: 1.35rem; font-weight: 700; color: #1a1a2e; margin: .15rem 0 0; }
body.dark-mode .stat-label { color: #94a3b8; }
body.dark-mode .stat-value { color: #f1f5f9; }

/* ---------- Filters ---------- */
.filters-bar {
  display: flex; gap: .75rem; margin-bottom: 1rem; flex-wrap: wrap;
}
.search-wrap {
  display: flex; align-items: center; gap: .5rem;
  flex: 1; min-width: 240px;
  background: rgba(255, 255, 255, .85); border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, .8);
  padding: .55rem .85rem;
}
body.dark-mode .search-wrap { background: rgba(26, 22, 48, .55); border-color: rgba(167, 139, 250, .2); }
.search-wrap i { color: #9ca3af; }
.search-wrap input {
  border: none; background: transparent; outline: none;
  width: 100%; font-size: .88rem; color: #1f2937;
  font-family: inherit;
}
body.dark-mode .search-wrap input { color: #e2e8f0; }
.form-control {
  padding: .55rem .85rem; border: 2px solid #e5e7eb;
  border-radius: 10px; font-size: .85rem; background: #fff; color: #1f2937;
  font-family: inherit; min-width: 160px;
}
.form-control:focus { outline: none; border-color: #4F46E5; }
body.dark-mode .form-control { background: rgba(255, 255, 255, .06); border-color: rgba(167, 139, 250, .2); color: #e2e8f0; }

/* ---------- Panel ---------- */
.panel {
  background: rgba(255, 255, 255, .9); border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, .8);
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .05);
}
body.dark-mode .panel {
  background: rgba(26, 22, 48, .55);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-color: rgba(167, 139, 250, .15);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .35);
}

/* ---------- Table ---------- */
.table-wrap { overflow-x: auto; border-radius: 10px; }
.data-table { width: 100%; border-collapse: collapse; min-width: 800px; font-size: .85rem; }
.data-table th {
  padding: .7rem .85rem; text-align: left; font-weight: 600;
  font-size: .7rem; text-transform: uppercase; letter-spacing: .04em;
  color: #6b7280; background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
body.dark-mode .data-table th { background: rgba(255, 255, 255, .04); color: #94a3b8; border-bottom-color: rgba(167, 139, 250, .1); }
.data-table td { padding: .7rem .85rem; border-bottom: 1px solid #f3f4f6; color: #1f2937; vertical-align: middle; }
body.dark-mode .data-table td { color: #e2e8f0; border-bottom-color: rgba(167, 139, 250, .06); }
.data-table tbody tr:hover td { background: rgba(79, 70, 229, .03); }
body.dark-mode .data-table tbody tr:hover td { background: rgba(124, 58, 237, .08); }
.data-table tr:last-child td { border-bottom: none; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.center { text-align: center; }
.small { font-size: .78rem; }
.muted { color: #6b7280; }
body.dark-mode .muted { color: #94a3b8; }

.user-cell { display: flex; align-items: center; gap: .6rem; }
.avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: .7rem; flex-shrink: 0;
}
.user-name { font-weight: 600; color: #1a1a2e; }
body.dark-mode .user-name { color: #f1f5f9; }
.user-sub { font-size: .7rem; color: #6b7280; }

/* Balance colors */
.bal-zero { color: #9ca3af; font-weight: 500; }
.bal-low { color: #d97706; font-weight: 700; }
.bal-good { color: #059669; font-weight: 700; }

/* ---------- Action buttons ---------- */
.btn-sm {
  display: inline-flex; align-items: center; gap: .25rem;
  padding: .35rem .6rem; border-radius: 7px; border: none;
  font-size: .72rem; font-weight: 600; cursor: pointer; font-family: inherit;
  margin: 0 .15rem;
}
.btn-view { background: #4F46E5; color: #fff; }
.btn-view:hover { background: #4338CA; }
.btn-edit { background: #f59e0b; color: #fff; }
.btn-edit:hover { background: #d97706; }

/* ---------- States ---------- */
.state-loading,
.state-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem 1rem; text-align: center; gap: .5rem;
  color: #6b7280;
}
.state-empty i { font-size: 2.5rem; color: #d1d5db; }
.state-loading i { font-size: 1.5rem; color: #4F46E5; }
.small.state-loading,
.small.state-empty { padding: 1.5rem 1rem; }
.small.state-empty i { font-size: 1.5rem; }

/* ---------- Modals ---------- */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999; padding: 1rem;
  background: rgba(15, 23, 42, .55);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
}
.modal-content {
  background: #fff; border-radius: 16px; width: 100%; max-width: 520px;
  max-height: 90vh; overflow-y: auto;
  animation: pop .2s ease;
}
body.dark-mode .modal-content {
  background: rgba(20, 16, 46, .97);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(167, 139, 250, .22);
  color: #e2e8f0;
}
.modal-content.detail-modal { max-width: 620px; }
@keyframes pop { from { transform: scale(.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.modal-header {
  padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9;
  display: flex; justify-content: space-between; align-items: flex-start;
}
body.dark-mode .modal-header { border-bottom-color: rgba(167, 139, 250, .1); }
.modal-header h5 { margin: 0; font-size: 1rem; font-weight: 700; color: #1a1a2e; }
body.dark-mode .modal-header h5 { color: #f1f5f9; }
.btn-close { background: none; border: none; font-size: 1.5rem; color: #6b7280; cursor: pointer; line-height: 1; }

.modal-body { padding: 1.25rem; }
.modal-footer {
  padding: 1rem 1.25rem; border-top: 1px solid #f1f5f9;
  display: flex; justify-content: flex-end; gap: .5rem;
}
body.dark-mode .modal-footer { border-top-color: rgba(167, 139, 250, .1); }

.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-weight: 600; font-size: .82rem; color: #1f2937; margin-bottom: .35rem; }
body.dark-mode .form-group label { color: #e2e8f0; }
.req { color: #ef4444; }

/* Balance card (detail modal) */
.balance-card-detail {
  display: flex; align-items: center; gap: 1rem;
  padding: 1.25rem;
  background: linear-gradient(135deg, rgba(79, 70, 229, .08), rgba(124, 58, 237, .04));
  border: 1px solid rgba(79, 70, 229, .15);
  border-radius: 12px;
  margin-bottom: 1rem;
}
.balance-icon {
  width: 56px; height: 56px; border-radius: 14px;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; flex-shrink: 0;
}
.balance-amount { font-size: 1.75rem; font-weight: 800; color: #4F46E5; margin: .1rem 0 0; }
body.dark-mode .balance-amount { color: #a78bfa; }

.info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
  padding: 1rem 0; margin-bottom: 1rem;
  border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;
}
body.dark-mode .info-grid { border-color: rgba(167, 139, 250, .1); }
.info-block { display: flex; flex-direction: column; gap: .2rem; }
.info-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
body.dark-mode .info-label { color: #94a3b8; }
.info-value { font-size: .9rem; font-weight: 500; }

/* Transactions */
.transactions-section h4 {
  font-size: .85rem; text-transform: uppercase; letter-spacing: .04em;
  font-weight: 700; color: #6b7280; margin: 0 0 .75rem;
  display: flex; align-items: center; gap: .4rem;
}
body.dark-mode .transactions-section h4 { color: #94a3b8; }

.tx-list { display: flex; flex-direction: column; gap: .5rem; max-height: 340px; overflow-y: auto; }
.tx-item {
  display: flex; align-items: center; gap: .75rem;
  padding: .65rem .85rem; border-radius: 10px;
  background: #f9fafb;
}
body.dark-mode .tx-item { background: rgba(255, 255, 255, .04); }
.tx-icon {
  width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: .8rem; flex-shrink: 0;
}
.tx-deposit  { background: rgba(16, 185, 129, .15); color: #059669; }
.tx-withdraw { background: rgba(239, 68, 68, .15); color: #dc2626; }
.tx-transfer { background: rgba(79, 70, 229, .15); color: #4F46E5; }
.tx-info { flex: 1; min-width: 0; }
.tx-desc { font-size: .85rem; font-weight: 500; color: #1a1a2e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
body.dark-mode .tx-desc { color: #f1f5f9; }
.tx-meta { font-size: .7rem; color: #6b7280; margin-top: .15rem; }
.tx-type { text-transform: capitalize; color: #4F46E5; font-weight: 600; }
.tx-amount { font-weight: 700; font-size: .9rem; font-variant-numeric: tabular-nums; }
.tx-pos { color: #059669; }
.tx-neg { color: #dc2626; }

/* Action grid (adjust modal) */
.action-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: .75rem;
}
.action-tile {
  display: flex; flex-direction: column; align-items: center; gap: .35rem;
  padding: .9rem .75rem; border-radius: 11px;
  background: #fff; border: 2px solid #e5e7eb;
  cursor: pointer; font-family: inherit;
  transition: all .15s ease; color: #6b7280;
  font-size: .82rem; font-weight: 600;
}
.action-tile i { font-size: 1.2rem; }
.action-tile:hover { border-color: #4F46E5; color: #4F46E5; }
.action-tile.active {
  border-color: #4F46E5; color: #4F46E5;
  background: rgba(79, 70, 229, .08);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, .1);
}
body.dark-mode .action-tile { background: rgba(255, 255, 255, .05); border-color: rgba(167, 139, 250, .2); color: #cbd5e1; }

.error-box {
  padding: .65rem .9rem; border-radius: 10px;
  background: #fee2e2; color: #991b1b;
  font-size: .82rem; display: flex; align-items: center; gap: .4rem;
  margin-top: .5rem;
}
body.dark-mode .error-box { background: rgba(239, 68, 68, .15); color: #fca5a5; }

.btn {
  padding: .55rem 1.25rem; border: none; border-radius: 10px;
  font-weight: 600; font-size: .85rem; cursor: pointer; font-family: inherit;
}
.btn-secondary { background: #f3f4f6; color: #1f2937; }
body.dark-mode .btn-secondary { background: rgba(255, 255, 255, .08); color: #e2e8f0; }

/* ---------- Responsive ---------- */
@media (max-width: 768px) {
  .wallet-container { padding: 0; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .filters-bar { flex-direction: column; }
  .form-control { width: 100%; }
  .info-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
}
</style>