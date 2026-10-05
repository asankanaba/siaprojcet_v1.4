<template>
  <div v-if="visible" class="alert-overlay" @click.self="close">
    <div class="alert-modal" :class="type">
      <div class="alert-header">
        <div class="alert-icon">
          <i :class="iconClass"></i>
        </div>
        <h3>{{ title }}</h3>
      </div>
      <div class="alert-body">
        <p>{{ message }}</p>
        <div v-if="countdown > 0" class="countdown">
          <div class="countdown-circle">
            <svg viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    fill="none" 
                    stroke="#e5e7eb" 
                    stroke-width="3"/>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                    fill="none" 
                    stroke="#4F46E5" 
                    stroke-width="3"
                    :stroke-dasharray="`${progress}, 100`"/>
            </svg>
            <span>{{ countdown }}</span>
          </div>
          <span class="countdown-text">Auto-logout in {{ countdown }}s</span>
        </div>
      </div>
      <div class="alert-footer">
        <button v-if="showCancel" @click="close" class="btn btn-secondary">
          Cancel
        </button>
        <button @click="confirm" class="btn" :class="confirmClass" :disabled="loading">
          <i v-if="loading" class="fas fa-spinner spin"></i>
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'info'
  },
  title: {
    type: String,
    default: 'Alert'
  },
  message: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  showCancel: {
    type: Boolean,
    default: true
  },
  autoClose: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['confirm', 'close'])

const countdown = ref(0)
let countdownInterval = null

const iconClass = computed(() => {
  const icons = {
    info: 'fas fa-info-circle',
    success: 'fas fa-check-circle',
    warning: 'fas fa-exclamation-triangle',
    danger: 'fas fa-times-circle'
  }
  return icons[props.type] || icons.info
})

const confirmClass = computed(() => {
  const classes = {
    info: 'btn-primary',
    success: 'btn-success',
    warning: 'btn-warning',
    danger: 'btn-danger'
  }
  return classes[props.type] || 'btn-primary'
})

const progress = computed(() => {
  return props.autoClose > 0 ? ((props.autoClose - countdown.value) / props.autoClose * 100) : 0
})

const close = () => {
  stopCountdown()
  emit('close')
}

const confirm = () => {
  stopCountdown()
  emit('confirm')
}

const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  countdown.value = 0
}

const startCountdown = () => {
  stopCountdown()
  
  if (props.autoClose > 0 && props.visible) {
    countdown.value = props.autoClose
    
    countdownInterval = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        stopCountdown()
        // Auto confirm when countdown reaches 0
        emit('confirm')
      }
    }, 1000)
  }
}

// Watch for visibility changes
watch(() => props.visible, (newVal) => {
  if (newVal) {
    // Start countdown when modal opens
    startCountdown()
  } else {
    // Stop countdown when modal closes
    stopCountdown()
  }
}, { immediate: true })

// Watch for autoClose prop changes
watch(() => props.autoClose, () => {
  if (props.visible) {
    startCountdown()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  stopCountdown()
})
</script>

<style scoped>
.alert-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.alert-modal {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

body.dark-mode .alert-modal {
  background: #1a1a2e;
}

.alert-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: 1.5rem;
}

.alert-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin-bottom: 1rem;
}

.alert-modal.info .alert-icon {
  background: rgba(59, 130, 246, 0.1);
  color: #3B82F6;
}
.alert-modal.success .alert-icon {
  background: rgba(16, 185, 129, 0.1);
  color: #10B981;
}
.alert-modal.warning .alert-icon {
  background: rgba(245, 158, 11, 0.1);
  color: #F59E0B;
}
.alert-modal.danger .alert-icon {
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
}

.alert-header h3 {
  margin: 0;
  font-weight: 700;
  color: #1a1a2e;
}

body.dark-mode .alert-header h3 {
  color: white;
}

.alert-body {
  text-align: center;
  margin-bottom: 1.5rem;
}

.alert-body p {
  color: #6b7280;
  line-height: 1.6;
  white-space: pre-line;
}

body.dark-mode .alert-body p {
  color: #9ca3af;
}

.countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 1rem;
}

.countdown-circle {
  position: relative;
  width: 56px;
  height: 56px;
}

.countdown-circle svg {
  transform: rotate(-90deg);
  width: 56px;
  height: 56px;
}

.countdown-circle span {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.25rem;
  font-weight: 700;
  color: #4F46E5;
}

.countdown-text {
  font-size: 0.8rem;
  color: #9ca3af;
  margin-top: 0.5rem;
}

.alert-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.alert-footer .btn {
  min-width: 100px;
  padding: 0.625rem 1.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-weight: 600;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  font-family: inherit;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4F46E5;
  color: white;
}
.btn-primary:hover:not(:disabled) {
  background: #4338CA;
}

.btn-secondary {
  background: #E5E7EB;
  color: #1F2937;
}
.btn-secondary:hover:not(:disabled) {
  background: #D1D5DB;
}
body.dark-mode .btn-secondary {
  background: #374151;
  color: #E2E8F0;
}
body.dark-mode .btn-secondary:hover:not(:disabled) {
  background: #4B5563;
}

.btn-success {
  background: #10B981;
  color: white;
}
.btn-success:hover:not(:disabled) {
  background: #059669;
}

.btn-warning {
  background: #F59E0B;
  color: white;
}
.btn-warning:hover:not(:disabled) {
  background: #D97706;
}

.btn-danger {
  background: #EF4444;
  color: white;
}
.btn-danger:hover:not(:disabled) {
  background: #DC2626;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(20px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}
</style>