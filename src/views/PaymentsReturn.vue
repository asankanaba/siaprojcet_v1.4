<template>
  <div class="return-page">
    <div class="glass-card">
      <!-- Loading -->
      <div v-if="loading" class="state">
        <div class="spinner"></div>
        <h2>Verifying your payment…</h2>
        <p class="muted">Please wait while we confirm with PayMongo.</p>
      </div>

      <!-- Success -->
      <div v-else-if="status === 'succeeded'" class="state success">
        <div class="icon">✓</div>
        <h2>Payment Successful</h2>
        <p class="amount">₱{{ formatMoney(payment?.amount) }}</p>
        <p class="muted">Reference: <code>{{ payment?.payment_ref }}</code></p>
        <p class="muted" v-if="payment?.supplier_name">
          Paid to <strong>{{ payment.supplier_name }}</strong>
        </p>
        <p class="muted" v-if="payment?.po_number">
          PO: <strong>{{ payment.po_number }}</strong>
        </p>
        <div class="actions">
          <button class="btn primary" @click="goBack">Back to Dashboard</button>
          <button class="btn" @click="viewPayment">View Payment</button>
        </div>
      </div>

      <!-- Cancelled -->
      <div v-else-if="status === 'cancelled'" class="state cancelled">
        <div class="icon">×</div>
        <h2>Payment Cancelled</h2>
        <p class="muted">You cancelled the checkout. No charges were made.</p>
        <p class="muted" v-if="payment">Reference: <code>{{ payment.payment_ref }}</code></p>
        <div class="actions">
          <button class="btn primary" @click="retry">Try Again</button>
          <button class="btn" @click="goBack">Back to Dashboard</button>
        </div>
      </div>

      <!-- Failed -->
      <div v-else-if="status === 'failed'" class="state failed">
        <div class="icon">!</div>
        <h2>Payment Failed</h2>
        <p class="muted" v-if="payment?.failure_reason">{{ payment.failure_reason }}</p>
        <p class="muted" v-else>The payment could not be completed. Please try again.</p>
        <p class="muted" v-if="payment">Reference: <code>{{ payment.payment_ref }}</code></p>
        <div class="actions">
          <button class="btn primary" @click="retry">Try Again</button>
          <button class="btn" @click="goBack">Back to Dashboard</button>
        </div>
      </div>

      <!-- Pending / still processing -->
      <div v-else-if="status === 'pending' || status === 'processing'" class="state pending">
        <div class="spinner"></div>
        <h2>Payment Pending</h2>
        <p class="muted">
          PayMongo is still processing this payment. We'll notify you once it's confirmed.
        </p>
        <p class="muted" v-if="payment">Reference: <code>{{ payment.payment_ref }}</code></p>
        <div class="actions">
          <button class="btn primary" @click="goBack">Back to Dashboard</button>
        </div>
      </div>

      <!-- Not found / error -->
      <div v-else class="state error">
        <div class="icon">?</div>
        <h2>{{ errorMessage || 'Payment not found' }}</h2>
        <p class="muted" v-if="paymentRef">Reference: <code>{{ paymentRef }}</code></p>
        <div class="actions">
          <button class="btn" @click="goBack">Back to Dashboard</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePaymentsStore } from '@/stores/payments'

const route  = useRoute()
const router = useRouter()
const store  = usePaymentsStore()

const loading      = ref(true)
const status       = ref('pending')
const payment      = ref(null)
const errorMessage = ref(null)
const paymentRef   = ref(null)

let stopWatch = null

function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function load() {
  loading.value = true
  errorMessage.value = null

  const ref_ = route.query.ref || route.query.reference
  const urlStatus = route.query.status || 'pending'
  paymentRef.value = ref_ || null

  if (!ref_) {
    status.value = 'notfound'
    errorMessage.value = 'No payment reference provided.'
    loading.value = false
    return
  }

  try {
    // First, ask the server to sync with PayMongo (fallback if webhook is late)
    const res = await store.refresh(ref_, { byRef: true, sync: false })
    if (res?.success && res.data) {
      payment.value = res.data
      status.value  = res.data.status || urlStatus
    } else {
      status.value = urlStatus
    }

    // If still pending, poll a few times (webhook may not have arrived yet)
    if (status.value === 'pending' || status.value === 'processing') {
      store.startPolling({
        ref: ref_,
        intervalMs: 3000,
        onUpdate: (p) => {
          payment.value = p
          status.value  = p.status
        }
      })

      // Hard stop after 2 minutes
      setTimeout(() => {
        store.stopPolling()
        if (status.value === 'pending' || status.value === 'processing') {
          status.value = 'pending'
        }
      }, 120000)
    }
  } catch (e) {
    errorMessage.value = e?.message || 'Failed to load payment.'
    status.value = 'notfound'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/')
}

function viewPayment() {
  if (payment.value?.id) {
    router.push(`/supply-chain/procurement/payments?id=${payment.value.id}`)
  } else {
    router.push('/supply-chain/procurement/payments')
  }
}

function retry() {
  // Go back to the payments page where the user can start another checkout
  router.push('/supply-chain/procurement/payments')
}

onMounted(load)

onBeforeUnmount(() => {
  store.stopPolling()
  if (stopWatch) stopWatch()
})
</script>

<style scoped>
.return-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: var(--bg, #0f172a);
}

.glass-card {
  width: 100%;
  max-width: 480px;
  padding: 2.5rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
  color: #f1f5f9;
}

.state h2 {
  margin: 1rem 0 0.5rem;
  font-size: 1.5rem;
}

.state .amount {
  font-size: 2.25rem;
  font-weight: 700;
  margin: 0.5rem 0;
}

.muted {
  color: rgba(241, 245, 249, 0.65);
  font-size: 0.9rem;
  margin: 0.25rem 0;
}

.muted code {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.85em;
}

.icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 2.5rem;
  font-weight: 700;
}

.success .icon { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
.cancelled .icon { background: rgba(234, 179, 8, 0.2); color: #eab308; }
.failed .icon { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.error .icon { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }

.spinner {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.15);
  border-top-color: #6366f1;
  animation: spin 0.9s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: #f1f5f9;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.btn.primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-color: transparent;
}

.btn.primary:hover {
  filter: brightness(1.1);
}
</style>