<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="wallet-page">

          <!-- HEADER -->
          <header class="page-header">
            <div>
              <h2><i class="fas fa-wallet"></i> My Wallet</h2>
              <p>Your salary credits and transaction history</p>
            </div>
            <button @click="refresh" class="btn-refresh" :disabled="loading">
              <i class="fas fa-sync" :class="{ spin: loading }"></i> Refresh
            </button>
          </header>

          <!-- BALANCE HERO -->
          <div class="balance-hero">
            <div class="balance-inner">
              <div class="balance-label">Current Balance</div>
              <div class="balance-amount">
                <span class="currency">₱</span>{{ formatPrice(wallet?.balance) }}
              </div>
              <div class="balance-meta">
                <span><i class="fas fa-user"></i> {{ user?.full_name || user?.username }}</span>
                <span v-if="wallet?.updated_at">
                  <i class="fas fa-clock"></i> Updated {{ formatDateTime(wallet.updated_at) }}
                </span>
              </div>
            </div>
            <div class="balance-icon-bg">
              <i class="fas fa-coins"></i>
            </div>
          </div>

          <!-- QUICK STATS -->
          <div class="quick-stats">
            <div class="quick-stat">
              <div class="qs-icon" style="background: rgba(16,185,129,.15); color: #059669;">
                <i class="fas fa-arrow-down"></i>
              </div>
              <div>
                <p class="qs-label">Total Deposits</p>
                <p class="qs-value text-success">₱{{ formatPrice(stats.deposits) }}</p>
              </div>
            </div>
            <div class="quick-stat">
              <div class="qs-icon" style="background: rgba(239,68,68,.15); color: #dc2626;">
                <i class="fas fa-arrow-up"></i>
              </div>
              <div>
                <p class="qs-label">Total Withdrawals</p>
                <p class="qs-value text-danger">₱{{ formatPrice(stats.withdrawals) }}</p>
              </div>
            </div>
            <div class="quick-stat">
              <div class="qs-icon" style="background: rgba(79,70,229,.15); color: #4F46E5;">
                <i class="fas fa-exchange-alt"></i>
              </div>
              <div>
                <p class="qs-label">Transactions</p>
                <p class="qs-value">{{ transactions.length }}</p>
              </div>
            </div>
          </div>

          <!-- TRANSACTIONS -->
          <div class="panel">
            <div class="panel-head">
              <h3><i class="fas fa-history"></i> Transaction History</h3>
              <select v-model="filterType" class="form-control">
                <option value="">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdraw">Withdrawals</option>
                <option value="transfer">Transfers</option>
              </select>
            </div>

            <div v-if="loading" class="state-loading">
              <i class="fas fa-spinner spin"></i> Loading...
            </div>

            <div v-else-if="filteredTransactions.length === 0" class="state-empty">
              <i class="fas fa-receipt"></i>
              <p>No transactions yet</p>
              <span class="muted small">Your salary credits will appear here</span>
            </div>

            <div v-else class="tx-list">
              <div v-for="tx in filteredTransactions" :key="tx.id" class="tx-item">
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import api from '@/api/index.js'

const authStore = useAuthStore()

const wallet       = ref(null)
const transactions = ref([])
const loading      = ref(false)
const filterType   = ref('')

const user = computed(() => authStore.user)

const stats = computed(() => {
  let deposits = 0, withdrawals = 0
  for (const tx of transactions.value) {
    const amt = Number(tx.amount || 0)
    if (tx.type === 'withdraw' || tx.type === 'payment') withdrawals += amt
    else deposits += amt
  }
  return { deposits, withdrawals }
})

const filteredTransactions = computed(() => {
  if (!filterType.value) return transactions.value
  return transactions.value.filter(tx => tx.type === filterType.value)
})

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

const refresh = async () => {
  loading.value = true
  try {
    const userId = authStore.user?.id
    if (!userId) {
      loading.value = false
      return
    }

    const wRes = await api.get(`/wallets.php?user_id=${userId}`)
    let w = null
    if (Array.isArray(wRes.data)) w = wRes.data[0]
    else if (wRes.data && wRes.data.id) w = wRes.data
    else if (wRes.data && wRes.data.data) w = wRes.data.data

    wallet.value = w

    if (w && w.id) {
      const tRes = await api.get(`/wallet_transactions.php?wallet_id=${w.id}`)
      let list = []
      if (Array.isArray(tRes.data)) list = tRes.data
      else if (Array.isArray(tRes.data.data)) list = tRes.data.data
      transactions.value = list
    } else {
      transactions.value = []
    }
  } catch (e) {
    console.error('MyWallet refresh:', e)
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
</script>

<style scoped>
.app-layout { display: flex; min-height: 100vh; }
.main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.page-content { flex: 1; background: #f1f5f9; padding: 1.5rem; }
body.dark-mode .page-content { background: #0f172a; }
.wallet-page { max-width: 1000px; margin: 0 auto; }

.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
}
.page-header h2 { font-size: 1.5rem; font-weight: 700; margin: 0; color: #1a1a2e; display: flex; align-items: center; gap: .5rem; }
.page-header h2 i { color: #4F46E5; }
.page-header p { margin: .25rem 0 0; color: #6b7280; font-size: .9rem; }
body.dark-mode .page-header h2 { color: #f1f5f9; }
body.dark-mode .page-header h2 i { color: #a78bfa; }
body.dark-mode .page-header p { color: #94a3b8; }

.btn-refresh {
  background: rgba(255, 255, 255, .55); border: 1px solid rgba(255, 255, 255, .7);
  padding: .5rem 1rem; border-radius: 10px; color: #374151; cursor: pointer;
  display: inline-flex; align-items: center; gap: .4rem; font-size: .85rem; font-weight: 500;
}
.btn-refresh:hover:not(:disabled) { background: rgba(255, 255, 255, .8); }
.btn-refresh:disabled { opacity: .5; cursor: not-allowed; }
body.dark-mode .btn-refresh { background: rgba(255, 255, 255, .06); border-color: rgba(167, 139, 250, .2); color: #e2e8f0; }
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

.balance-hero {
  position: relative;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: #fff;
  border-radius: 20px;
  padding: 2.5rem;
  margin-bottom: 1.25rem;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(79, 70, 229, .35);
}
.balance-icon-bg {
  position: absolute;
  right: -20px; top: 50%;
  transform: translateY(-50%);
  font-size: 12rem;
  opacity: .08;
  pointer-events: none;
}
.balance-inner { position: relative; z-index: 1; }
.balance-label {
  font-size: .8rem; text-transform: uppercase; letter-spacing: .15em;
  font-weight: 600; opacity: .8;
}
.balance-amount {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
  margin: .75rem 0 1rem;
  font-variant-numeric: tabular-nums;
}
.balance-amount .currency {
  font-size: 1.75rem;
  font-weight: 600;
  margin-right: .25rem;
  opacity: .85;
}
.balance-meta {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  font-size: .8rem;
  opacity: .9;
}
.balance-meta i { margin-right: .3rem; }

.quick-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.quick-stat {
  display: flex; align-items: center; gap: .85rem;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, .85);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, .8);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .05);
}
body.dark-mode .quick-stat { background: rgba(26, 22, 48, .55); border-color: rgba(167, 139, 250, .15); }
.qs-icon {
  width: 44px; height: 44px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.1rem; flex-shrink: 0;
}
.qs-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin: 0; }
.qs-value { font-size: 1.15rem; font-weight: 700; margin: .1rem 0 0; color: #1a1a2e; }
body.dark-mode .qs-label { color: #94a3b8; }
body.dark-mode .qs-value { color: #f1f5f9; }
.text-success { color: #10b981 !important; }
.text-danger  { color: #ef4444 !important; }

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
}
.panel-head {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;
}
.panel-head h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #1a1a2e; display: flex; align-items: center; gap: .4rem; }
body.dark-mode .panel-head h3 { color: #f1f5f9; }

.form-control {
  padding: .5rem .75rem; border: 2px solid #e5e7eb;
  border-radius: 9px; font-size: .85rem; background: #fff; color: #1f2937;
  font-family: inherit; min-width: 140px;
}
.form-control:focus { outline: none; border-color: #4F46E5; }
body.dark-mode .form-control { background: rgba(255, 255, 255, .06); border-color: rgba(167, 139, 250, .2); color: #e2e8f0; }

.tx-list { display: flex; flex-direction: column; gap: .5rem; }
.tx-item {
  display: flex; align-items: center; gap: .85rem;
  padding: .85rem 1rem; border-radius: 11px;
  background: #f9fafb;
  transition: background .15s;
}
body.dark-mode .tx-item { background: rgba(255, 255, 255, .04); }
.tx-item:hover { background: #f3f4f6; }
body.dark-mode .tx-item:hover { background: rgba(124, 58, 237, .08); }

.tx-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: .9rem; flex-shrink: 0;
}
.tx-deposit  { background: rgba(16, 185, 129, .15); color: #059669; }
.tx-withdraw { background: rgba(239, 68, 68, .15); color: #dc2626; }
.tx-transfer { background: rgba(79, 70, 229, .15); color: #4F46E5; }
.tx-refund   { background: rgba(245, 158, 11, .15); color: #d97706; }
.tx-payment  { background: rgba(239, 68, 68, .15); color: #dc2626; }

.tx-info { flex: 1; min-width: 0; }
.tx-desc {
  font-size: .88rem; font-weight: 500; color: #1a1a2e;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
body.dark-mode .tx-desc { color: #f1f5f9; }
.tx-meta { font-size: .72rem; color: #6b7280; margin-top: .15rem; }
.tx-type { text-transform: capitalize; color: #4F46E5; font-weight: 600; }

.tx-amount {
  font-weight: 700; font-size: .95rem;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.tx-pos { color: #059669; }
.tx-neg { color: #dc2626; }
body.dark-mode .tx-pos { color: #6ee7b7; }
body.dark-mode .tx-neg { color: #fca5a5; }

.state-loading,
.state-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem 1rem; text-align: center; gap: .5rem;
  color: #6b7280;
}
.state-empty i { font-size: 2.5rem; color: #d1d5db; }
.state-loading i { font-size: 1.5rem; color: #4F46E5; }
body.dark-mode .state-empty i { color: #475569; }

@media (max-width: 640px) {
  .balance-hero { padding: 1.75rem; }
  .balance-amount { font-size: 2.25rem; }
  .quick-stats { grid-template-columns: 1fr; }
  .tx-meta { font-size: .65rem; }
}
</style>