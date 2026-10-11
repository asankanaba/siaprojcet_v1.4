<template>
  <div v-if="visible" class="qr-overlay" @click.self="handleBackdropClick">
    <div class="qr-modal" :class="{ 'dark': isDark }">

      <!-- Header -->
      <div class="qr-header">
        <div class="qr-title-wrap">
          <div class="qr-icon" :class="statusClass">
            <i :class="statusIcon"></i>
          </div>
          <div>
            <h3 class="qr-title">{{ title }}</h3>
            <p class="qr-subtitle">{{ subtitle }}</p>
          </div>
        </div>
        <button v-if="canCancel" class="qr-close" @click="cancel" title="Cancel">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="qr-body">

        <!-- Invoice + amount -->
        <div class="qr-summary">
          <div class="qr-row">
            <span class="qr-label">INVOICE</span>
            <span class="qr-value">{{ invoiceNumber || '—' }}</span>
          </div>
          <div class="qr-row qr-row-total">
            <span class="qr-label">AMOUNT</span>
            <span class="qr-value qr-amount">{{ formatCurrency(amount) }}</span>
          </div>
          <div class="qr-row">
            <span class="qr-label">METHOD</span>
            <span class="qr-value qr-method">{{ methodLabel }}</span>
          </div>
        </div>

        <!-- QR / status area -->
        <div class="qr-stage">

          <!-- LOADING: creating intent -->
          <div v-if="status === 'creating'" class="qr-loading">
            <div class="qr-spinner"></div>
            <p>Creating payment request…</p>
          </div>

          <!-- QR READY: show image -->
          <div v-else-if="status === 'awaiting' && qrImage" class="qr-code-wrap">
            <img :src="qrImage" alt="Scan to pay" class="qr-code" />
            <p class="qr-hint">
              <i class="fas fa-mobile-alt"></i>
              Ask the customer to scan this QR with {{ methodLabel }}
            </p>
          </div>

          <!-- QR READY but PayMongo gave a redirect URL instead of image -->
          <div v-else-if="status === 'awaiting' && !qrImage && redirectUrl" class="qr-redirect">
            <i class="fas fa-external-link-alt"></i>
            <p>PayMongo requires a redirect for this method.</p>
            <a :href="redirectUrl" target="_blank" class="qr-redirect-btn">
              Open Payment Page
            </a>
            <p class="qr-hint">Waiting for payment confirmation…</p>
          </div>

          <!-- WAITING with no QR data yet -->
          <div v-else-if="status === 'awaiting'" class="qr-loading">
            <div class="qr-spinner"></div>
            <p>Preparing QR code…</p>
          </div>

          <!-- PAID -->
          <div v-else-if="status === 'paid'" class="qr-success">
            <div class="qr-success-icon">
              <i class="fas fa-check"></i>
            </div>
            <h4>Payment Received</h4>
            <p class="qr-ref" v-if="paymentReference">
              Ref: <strong>{{ paymentReference }}</strong>
            </p>
            <p class="qr-hint">Closing and printing receipt…</p>
          </div>

          <!-- FAILED -->
          <div v-else-if="status === 'failed'" class="qr-failed">
            <div class="qr-failed-icon">
              <i class="fas fa-times"></i>
            </div>
            <h4>Payment Failed</h4>
            <p class="qr-hint">{{ errorMessage || 'The payment was not completed.' }}</p>
          </div>

          <!-- TIMEOUT -->
          <div v-else-if="status === 'timeout'" class="qr-failed">
            <div class="qr-failed-icon warn">
              <i class="fas fa-hourglass-end"></i>
            </div>
            <h4>Payment Not Confirmed</h4>
            <p class="qr-hint">
              The customer didn't complete payment within the time limit.
              You can retry, or mark the sale as paid manually with a reference number.
            </p>
          </div>

          <!-- CANCELLED -->
          <div v-else-if="status === 'cancelled'" class="qr-failed">
            <div class="qr-failed-icon">
              <i class="fas fa-ban"></i>
            </div>
            <h4>Cancelled</h4>
            <p class="qr-hint">This payment was cancelled.</p>
          </div>

        </div>

        <!-- Countdown / polling line -->
        <div v-if="status === 'awaiting'" class="qr-poll-line">
          <span class="qr-dot"></span>
          <span>Checking every 2s… <strong>{{ secondsLeft }}s</strong> remaining</span>
        </div>

        <!-- Manual reference input (visible during timeout OR while awaiting) -->
        <div v-if="showManualEntry" class="qr-manual">
          <label>Reference Number</label>
          <input
            v-model="manualRef"
            type="text"
            placeholder="e.g. GCash ref 1234 5678 9012"
            maxlength="100"
          />
          <button
            class="qr-manual-btn"
            :disabled="!manualRef.trim() || isSubmittingManual"
            @click="submitManualPaid"
          >
            <i class="fas fa-check" v-if="!isSubmittingManual"></i>
            <i class="fas fa-spinner spin" v-else></i>
            {{ isSubmittingManual ? 'Saving…' : 'Mark as Paid' }}
          </button>
        </div>

      </div>

      <!-- Footer actions -->
      <div class="qr-footer">
        <button
          v-if="status === 'timeout' || status === 'failed'"
          class="qr-btn qr-btn-ghost"
          @click="toggleManual"
        >
          <i class="fas fa-edit"></i>
          {{ showManualEntry ? 'Hide Manual Entry' : 'Enter Reference Manually' }}
        </button>
        <button
          v-if="status === 'timeout'"
          class="qr-btn qr-btn-primary"
          @click="retry"
          :disabled="isRetrying"
        >
          <i class="fas fa-redo" v-if="!isRetrying"></i>
          <i class="fas fa-spinner spin" v-else></i>
          Retry Payment
        </button>
        <button
          v-if="canCancel"
          class="qr-btn qr-btn-ghost"
          @click="cancel"
        >
          Cancel Sale
        </button>
        <button
          v-if="status === 'paid'"
          class="qr-btn qr-btn-primary"
          @click="finish"
        >
          <i class="fas fa-arrow-right"></i>
          Continue
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import api from '@/api/index.js'
import Swal from 'sweetalert2'

const props = defineProps({
  visible:  { type: Boolean, default: false },
  saleId:   { type: Number,  default: null },
  invoice:  { type: String,  default: '' },
  amount:   { type: Number,  default: 0 },
  method:   { type: String,  default: 'gcash' }, // gcash | maya | qrph
  timeoutSeconds: { type: Number, default: 90 },
  pollIntervalMs: { type: Number, default: 2000 }
})

const emit = defineEmits(['paid', 'cancelled', 'failed'])

// ============ STATE ============
const status        = ref('creating') // creating|awaiting|paid|failed|timeout|cancelled
const intentId      = ref(null)
const qrImage       = ref(null)
const redirectUrl   = ref(null)
const paymentReference = ref(null)
const errorMessage  = ref(null)

const secondsLeft   = ref(props.timeoutSeconds)
const manualRef     = ref('')
const showManualEntry = ref(false)
const isSubmittingManual = ref(false)
const isRetrying    = ref(false)

let pollTimer = null
let countdownTimer = null

// ============ COMPUTED ============
const isDark = computed(() =>
  document.documentElement.classList.contains('dark-mode') ||
  document.body.classList.contains('dark-mode') ||
  document.documentElement.getAttribute('data-theme') === 'dark'
)

const methodLabel = computed(() => {
  const m = props.method.toLowerCase()
  if (m === 'gcash') return 'GCash'
  if (m === 'maya' || m === 'paymaya') return 'Maya'
  if (m === 'qrph') return 'QR Ph'
  return m.toUpperCase()
})

const title = computed(() => {
  if (status.value === 'paid')     return 'Payment Successful'
  if (status.value === 'failed')   return 'Payment Failed'
  if (status.value === 'timeout')  return 'Payment Timed Out'
  if (status.value === 'cancelled')return 'Payment Cancelled'
  if (status.value === 'creating') return 'Preparing Payment'
  return `Scan to Pay via ${methodLabel.value}`
})

const subtitle = computed(() => {
  if (status.value === 'awaiting') return 'Waiting for customer to scan the QR'
  if (status.value === 'paid')     return 'Thank you — printing receipt'
  if (status.value === 'timeout')  return 'No payment detected'
  if (status.value === 'failed')   return errorMessage.value || 'Something went wrong'
  return ''
})

const statusClass = computed(() => `qr-icon-${status.value}`)
const statusIcon  = computed(() => {
  if (status.value === 'paid')     return 'fas fa-check'
  if (status.value === 'failed')   return 'fas fa-times'
  if (status.value === 'timeout')  return 'fas fa-hourglass-end'
  if (status.value === 'cancelled')return 'fas fa-ban'
  return 'fas fa-qrcode'
})

const canCancel = computed(() => status.value === 'awaiting' || status.value === 'creating')

const formatCurrency = (n) => '₱' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// ============ LIFECYCLE ============
watch(() => props.visible, (v) => {
  if (v) startFlow()
  else   stopTimers()
})

onUnmounted(stopTimers)

// ============ FLOW ============
async function startFlow() {
  stopTimers()
  status.value = 'creating'
  intentId.value = null
  qrImage.value = null
  redirectUrl.value = null
  paymentReference.value = null
  errorMessage.value = null
  manualRef.value = ''
  showManualEntry.value = false
  secondsLeft.value = props.timeoutSeconds

  try {
    const res = await api.post('/payments.php', {
      kind: 'pos_checkout',
      sale_id: props.saleId,
      amount: props.amount,
      method: props.method
    })

    const data = res.data || {}
    if (!data.success) {
      status.value = 'failed'
      errorMessage.value = data.message || 'Failed to create payment'
      return
    }

    intentId.value = data.intent_id || null

    // Extract QR / redirect from next_action
    const na = data.next_action || {}
    const code = na.code || {}
    if (code.image_url) {
      qrImage.value = code.image_url
    } else if (na.redirect && na.redirect.url) {
      redirectUrl.value = na.redirect.url
    } else if (code.url) {
      // PayMongo sometimes returns the raw QR string under `code.url`
      redirectUrl.value = code.url
    }

    status.value = 'awaiting'
    startPolling()
    startCountdown()

  } catch (err) {
    console.error('[PayMongoQRModal] startFlow error:', err)
    status.value = 'failed'
    errorMessage.value = err.response?.data?.message || err.message || 'Network error'
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(pollStatus, props.pollIntervalMs)
  // run one immediately
  pollStatus()
}

async function pollStatus() {
  if (!props.saleId) return
  try {
    const res = await api.post('/payments.php', {
      kind: 'pos_status',
      sale_id: props.saleId
    })
    const data = res.data || {}
    if (!data.success) return

    if (data.payment_status === 'paid') {
      paymentReference.value = data.payment_reference || null
      status.value = 'paid'
      stopTimers()
      setTimeout(() => emit('paid', {
        sale_id: props.saleId,
        invoice_number: data.invoice_number,
        payment_reference: data.payment_reference,
        paymongo_intent_id: data.paymongo_intent_id
      }), 1200)
    } else if (data.payment_status === 'failed') {
      status.value = 'failed'
      errorMessage.value = 'Payment was not completed.'
      stopTimers()
    }
  } catch (err) {
    // silent — polling errors shouldn't kill the flow
  }
}

function startCountdown() {
  stopCountdown()
  countdownTimer = setInterval(() => {
    secondsLeft.value -= 1
    if (secondsLeft.value <= 0) {
      stopTimers()
      status.value = 'timeout'
    }
  }, 1000)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}
function stopCountdown() {
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null }
}
function stopTimers() {
  stopPolling()
  stopCountdown()
}

// ============ ACTIONS ============
async function submitManualPaid() {
  const ref = manualRef.value.trim()
  if (!ref) return
  isSubmittingManual.value = true
  try {
    const res = await api.post('/payments.php', {
      kind: 'pos_manual_paid',
      sale_id: props.saleId,
      reference: ref
    })
    const data = res.data || {}
    if (data.success) {
      paymentReference.value = ref
      status.value = 'paid'
      stopTimers()
      setTimeout(() => emit('paid', {
        sale_id: props.saleId,
        invoice_number: props.invoice,
        payment_reference: ref,
        manual: true
      }), 800)
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Could not save',
        text: data.message || 'Unknown error',
        confirmButtonColor: '#4F46E5'
      })
    }
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Network error',
      text: err.message,
      confirmButtonColor: '#4F46E5'
    })
  } finally {
    isSubmittingManual.value = false
  }
}

function toggleManual() {
  showManualEntry.value = !showManualEntry.value
}

async function retry() {
  isRetrying.value = true
  await startFlow()
  isRetrying.value = false
}

function cancel() {
  stopTimers()
  status.value = 'cancelled'
  emit('cancelled', { sale_id: props.saleId })
}

function finish() {
  emit('paid', {
    sale_id: props.saleId,
    invoice_number: props.invoice,
    payment_reference: paymentReference.value
  })
}

function handleBackdropClick() {
  // Do NOT close on backdrop — cashier must explicitly cancel or finish
}
</script>

<style scoped>
.qr-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.qr-modal {
  width: 100%;
  max-width: 460px;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 25px 70px rgba(0,0,0,0.4);
  overflow: hidden;
  animation: slideUp 0.25s ease;
  color: #1F2937;
}
.qr-modal.dark {
  background: #1e293b;
  color: #e2e8f0;
  border: 1px solid #334155;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

/* Header */
.qr-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.25rem 0.75rem;
}
.qr-title-wrap {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
.qr-icon {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.1rem;
  background: #4F46E5;
  flex-shrink: 0;
}
.qr-icon-awaiting { background: #4F46E5; }
.qr-icon-creating { background: #6366F1; }
.qr-icon-paid     { background: #10B981; }
.qr-icon-failed   { background: #EF4444; }
.qr-icon-timeout  { background: #F59E0B; }
.qr-icon-cancelled{ background: #6B7280; }

.qr-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}
.qr-subtitle {
  margin: 0.15rem 0 0;
  font-size: 0.78rem;
  opacity: 0.7;
}

.qr-close {
  background: transparent;
  border: none;
  color: inherit;
  opacity: 0.5;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 8px;
  transition: all 0.15s;
}
.qr-close:hover { opacity: 1; background: rgba(0,0,0,0.06); }

/* Body */
.qr-body { padding: 0 1.25rem 0.5rem; }

.qr-summary {
  background: rgba(79,70,229,0.06);
  border: 1px solid rgba(79,70,229,0.15);
  border-radius: 12px;
  padding: 0.75rem 0.9rem;
  margin-bottom: 1rem;
}
.qr-modal.dark .qr-summary {
  background: rgba(99,102,241,0.08);
  border-color: rgba(99,102,241,0.2);
}
.qr-row {
  display: flex;
  justify-content: space-between;
  padding: 0.2rem 0;
  font-size: 0.82rem;
}
.qr-label {
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  opacity: 0.55;
  font-weight: 600;
}
.qr-value {
  font-weight: 600;
  font-family: 'Courier New', monospace;
}
.qr-amount {
  font-size: 1.15rem;
  color: #4F46E5;
  font-weight: 700;
}
.qr-modal.dark .qr-amount { color: #818CF8; }
.qr-method { text-transform: uppercase; letter-spacing: 0.05em; }

/* QR stage */
.qr-stage {
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.qr-code-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.qr-code {
  width: 220px;
  height: 220px;
  border-radius: 12px;
  background: #fff;
  padding: 8px;
  border: 4px solid #4F46E5;
  object-fit: contain;
}
.qr-hint {
  text-align: center;
  font-size: 0.8rem;
  opacity: 0.75;
  margin: 0;
  padding: 0 0.5rem;
}
.qr-hint i { margin-right: 0.35rem; }

.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: inherit;
  opacity: 0.8;
  font-size: 0.85rem;
}
.qr-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(79,70,229,0.2);
  border-top-color: #4F46E5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.qr-redirect {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}
.qr-redirect i { font-size: 2rem; color: #4F46E5; }
.qr-redirect-btn {
  background: #4F46E5;
  color: white;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.85rem;
}

.qr-success, .qr-failed {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
}
.qr-success-icon, .qr-failed-icon {
  width: 72px; height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: #fff;
}
.qr-success-icon { background: #10B981; box-shadow: 0 0 0 8px rgba(16,185,129,0.15); }
.qr-failed-icon  { background: #EF4444; box-shadow: 0 0 0 8px rgba(239,68,68,0.15); }
.qr-failed-icon.warn { background: #F59E0B; box-shadow: 0 0 0 8px rgba(245,158,11,0.15); }

.qr-success h4, .qr-failed h4 {
  margin: 0.5rem 0 0;
  font-size: 1.05rem;
  font-weight: 700;
}
.qr-ref {
  margin: 0;
  font-size: 0.85rem;
  font-family: 'Courier New', monospace;
}

/* Poll line */
.qr-poll-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  opacity: 0.7;
  padding: 0.6rem 0;
  border-top: 1px dashed rgba(148,163,184,0.3);
  margin-top: 0.5rem;
}
.qr-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #4F46E5;
  animation: pulse 1.4s infinite;
}
@keyframes pulse {
  0%,100% { opacity: 1; transform: scale(1); }
  50%     { opacity: 0.4; transform: scale(0.75); }
}

/* Manual entry */
.qr-manual {
  margin-top: 0.75rem;
  padding: 0.9rem;
  border-radius: 12px;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.3);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.qr-manual label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
}
.qr-manual input {
  padding: 0.55rem 0.7rem;
  border: 2px solid rgba(148,163,184,0.3);
  border-radius: 8px;
  background: #fff;
  font-size: 0.9rem;
  font-family: 'Courier New', monospace;
  color: #1F2937;
  outline: none;
}
.qr-modal.dark .qr-manual input {
  background: #0f172a;
  color: #e2e8f0;
  border-color: #334155;
}
.qr-manual input:focus { border-color: #4F46E5; }

.qr-manual-btn {
  padding: 0.6rem;
  border: none;
  border-radius: 8px;
  background: #10B981;
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}
.qr-manual-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.qr-manual-btn:hover:not(:disabled) { background: #059669; }

/* Footer */
.qr-footer {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem 1.25rem;
  flex-wrap: wrap;
}
.qr-btn {
  flex: 1;
  min-width: 130px;
  padding: 0.7rem 1rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: all 0.15s;
}
.qr-btn-primary {
  background: #4F46E5;
  color: white;
}
.qr-btn-primary:hover:not(:disabled) { background: #4338CA; }
.qr-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.qr-btn-ghost {
  background: transparent;
  color: inherit;
  border: 1px solid rgba(148,163,184,0.35);
}
.qr-btn-ghost:hover { background: rgba(148,163,184,0.12); }

@media (max-width: 480px) {
  .qr-code { width: 180px; height: 180px; }
  .qr-footer { flex-direction: column; }
  .qr-btn { min-width: unset; }
}
</style>