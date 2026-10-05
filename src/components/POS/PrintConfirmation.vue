<template>
  <div v-if="visible" class="print-overlay">
    <div class="print-modal">
      <div class="print-animation">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#10B981" stroke-width="4"/>
          <path d="M30 50 L45 65 L70 35" fill="none" stroke="#10B981" stroke-width="4" stroke-linecap="round"/>
        </svg>
      </div>
      <h3>Receipt Ready!</h3>
      <p>Invoice #{{ invoiceNumber }}</p>
      <p class="total">Total: {{ formatCurrency(total) }}</p>
      <div class="print-options">
        <button @click="printReceipt" class="btn btn-print">
          <i class="fas fa-print"></i> Print Receipt
        </button>
        <button @click="downloadPDF" class="btn btn-pdf">
          <i class="fas fa-file-pdf"></i> Download PDF
        </button>
        <button @click="close" class="btn btn-close">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
      <div class="auto-print-timer">
        <span>Auto-printing in {{ countdown }}s</span>
        <div class="timer-bar">
          <div class="timer-progress" :style="{ width: progress + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  invoiceNumber: {
    type: String,
    default: ''
  },
  total: {
    type: Number,
    default: 0
  },
  saleData: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['close', 'print', 'pdf'])

const countdown = ref(5)
const maxCountdown = 5
let timer = null

const progress = computed(() => {
  return ((maxCountdown - countdown.value) / maxCountdown) * 100
})

const formatCurrency = (amount) => {
  return '₱' + Number(amount).toFixed(2)
}

const startTimer = () => {
  countdown.value = maxCountdown
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      timer = null
      printReceipt()
    }
  }, 1000)
}

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const printReceipt = () => {
  stopTimer()
  emit('print')
}

const downloadPDF = () => {
  stopTimer()
  emit('pdf')
}

const close = () => {
  stopTimer()
  emit('close')
}

watch(() => props.visible, (newVal) => {
  if (newVal) {
    startTimer()
  } else {
    stopTimer()
  }
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.print-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.print-modal {
  background: white;
  border-radius: 24px;
  padding: 2.5rem;
  max-width: 420px;
  width: 90%;
  text-align: center;
  animation: slideUp 0.4s ease;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

body.dark-mode .print-modal {
  background: #1a1a2e;
}

.print-animation {
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
}

.print-animation svg {
  width: 100%;
  height: 100%;
  animation: checkmark 0.5s ease;
}

.print-modal h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-light);
  margin-bottom: 0.5rem;
}

body.dark-mode .print-modal h3 {
  color: white;
}

.print-modal p {
  color: var(--text-muted);
  margin: 0.25rem 0;
}

.print-modal .total {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--primary);
  margin: 0.5rem 0 1.5rem;
}

.print-options {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.btn-print {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: white;
}

.btn-print:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(79,70,229,0.3);
}

.btn-pdf {
  background: #EF4444;
  color: white;
}

.btn-pdf:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(239,68,68,0.3);
}

.btn-close {
  background: var(--bg-light);
  color: var(--text-light);
}

body.dark-mode .btn-close {
  background: #2D3748;
  color: white;
}

.btn-close:hover {
  background: var(--border-light);
}

body.dark-mode .btn-close:hover {
  background: #374151;
}

.auto-print-timer {
  margin-top: 1.5rem;
}

.auto-print-timer span {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.timer-bar {
  width: 100%;
  height: 4px;
  background: var(--border-light);
  border-radius: 2px;
  margin-top: 0.5rem;
  overflow: hidden;
}

.timer-progress {
  height: 100%;
  background: var(--primary);
  border-radius: 2px;
  transition: width 0.3s linear;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes checkmark {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>