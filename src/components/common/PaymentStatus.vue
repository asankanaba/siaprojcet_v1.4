<template>
  <span class="ps-pill" :class="`ps-${status}`">
    <span class="ps-dot"></span>
    <span class="ps-label">{{ label }}</span>
    <span v-if="payment?.amount" class="ps-amount">
      ₱{{ formatMoney(payment.amount) }}
    </span>
  </span>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { paymentsApi } from '@/api/payments'

const props = defineProps({
  // Either pass a payment_ref (string) or a full payment object
  paymentRef: { type: String, default: null },
  payment:    { type: Object, default: null },
  // Poll while status is pending/processing? Default true
  autoPoll:   { type: Boolean, default: true },
  // How often (ms)
  interval:   { type: Number,  default: 4000 }
})

const local  = ref(props.payment || null)
const timer  = ref(null)
const tries  = ref(0)
const MAX    = 30   // ~2 minutes

const status = computed(() => {
  const s = local.value?.status || 'pending'
  if (s === 'succeeded') return 'succeeded'
  if (s === 'failed')    return 'failed'
  if (s === 'cancelled') return 'cancelled'
  if (s === 'refunded')  return 'refunded'
  if (s === 'processing') return 'processing'
  return 'pending'
})

const label = computed(() => {
  const s = status.value
  return {
    succeeded:  'Paid',
    failed:     'Failed',
    cancelled:  'Cancelled',
    refunded:   'Refunded',
    processing: 'Processing',
    pending:    'Pending'
  }[s] || 'Pending'
})

function formatMoney(v) {
  const n = Number(v || 0)
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function tick() {
  if (!props.paymentRef) return
  try {
    const res = await paymentsApi.findByRef(props.paymentRef)
    if (res?.success && res.data) {
      local.value = res.data
    }
  } catch (e) {
    // silent
  }
  tries.value++
  if (tries.value >= MAX) return stop()
  if (['succeeded','failed','cancelled','refunded'].includes(status.value)) return stop()
  timer.value = setTimeout(tick, props.interval)
}

function start() {
  if (!props.autoPoll) return
  if (!props.paymentRef) return
  if (['succeeded','failed','cancelled','refunded'].includes(status.value)) return
  stop()
  timer.value = setTimeout(tick, props.interval)
}

function stop() {
  if (timer.value) { clearTimeout(timer.value); timer.value = null }
}

watch(() => props.payment, (v) => { if (v) local.value = v }, { immediate: true })
watch(() => props.paymentRef, () => { tries.value = 0; start() }, { immediate: true })

onBeforeUnmount(stop)
</script>

<style scoped>
.ps-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid transparent;
  line-height: 1;
}

.ps-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.ps-amount {
  margin-left: 0.35rem;
  opacity: 0.8;
}

/* Colors */
.ps-pending, .ps-processing {
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
  border-color: rgba(234, 179, 8, 0.3);
}
.ps-pending .ps-dot, .ps-processing .ps-dot {
  background: #facc15;
  animation: pulse 1.4s ease-in-out infinite;
}

.ps-succeeded {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.3);
}
.ps-succeeded .ps-dot { background: #22c55e; }

.ps-failed, .ps-cancelled {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}
.ps-failed .ps-dot, .ps-cancelled .ps-dot { background: #ef4444; }

.ps-refunded {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.3);
}
.ps-refunded .ps-dot { background: #94a3b8; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}
</style>