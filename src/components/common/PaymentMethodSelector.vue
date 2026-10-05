<template>
  <div class="pm-selector">
    <label v-if="label" class="pm-label">{{ label }}</label>

    <!-- Loading -->
    <div v-if="loading" class="pm-loading">
      <div class="pm-spinner"></div>
      <span>Loading payment methods…</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="pm-error">
      {{ error }}
      <button class="pm-retry" @click="reload">Retry</button>
    </div>

    <!-- Method tiles -->
    <div v-else class="pm-grid">
      <button
        v-for="m in methods"
        :key="m.code"
        type="button"
        class="pm-tile"
        :class="{ active: modelValue === m.code, disabled: disabled }"
        :disabled="disabled"
        @click="select(m.code)"
      >
        <!-- ⬇️ PATCH: removed broken <img> that 404'd. Now shows initials only. -->
        <!-- If you want real icons later, drop SVGs in /public/icons/payments/ -->
        <!-- and restore the <img> block using the iconMap below.                -->
        <span class="pm-icon">
          <span class="pm-icon-fallback">{{ initials(m.label) }}</span>
        </span>
        <span class="pm-text">{{ m.label }}</span>
        <span v-if="modelValue === m.code" class="pm-check">✓</span>
      </button>
    </div>

    <p v-if="hint" class="pm-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { usePaymentsStore } from '@/stores/payments'

const props = defineProps({
  modelValue: { type: String,  default: null },
  methods:    { type: Array,   default: null },       // override fetched list
  label:      { type: String,  default: 'Payment Method' },
  hint:       { type: String,  default: null },
  disabled:   { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'change'])

const store = usePaymentsStore()
const loading = ref(false)
const error   = ref(null)

// ------------------------------------------------------------
// 🔧 OPTIONAL: icon map — uncomment and fill paths if you want
//    real SVG icons. Files go in /public/icons/payments/
//    Example: /public/icons/payments/card.svg  →  '/icons/payments/card.svg'
// ------------------------------------------------------------
// const iconMap = {
//   card:     '/icons/payments/card.svg',
//   gcash:    '/icons/payments/gcash.svg',
//   maya:     '/icons/payments/maya.svg',
//   grabpay:  '/icons/payments/grabpay.svg',
//   qrph:     '/icons/payments/qrph.svg',
//   billease: '/icons/payments/billease.svg',
//   bank:     '/icons/payments/bank.svg'
// }

const methods = computed(() => props.methods || store.methods)

function initials(label = '') {
  return label
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

function select(code) {
  if (props.disabled) return
  emit('update:modelValue', code)
  emit('change', code)
}

async function reload() {
  error.value = null
  loading.value = true
  try {
    await store.loadMethods(true)
  } catch (e) {
    error.value = e?.message || 'Failed to load methods'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (props.methods) return
  loading.value = true
  try {
    await store.loadMethods()
  } catch (e) {
    error.value = e?.message || 'Failed to load methods'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.pm-selector { width: 100%; }

.pm-label {
  display: block;
  font-size: 0.85rem;
  color: rgba(241, 245, 249, 0.7);
  margin-bottom: 0.5rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.pm-loading,
.pm-error {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  color: rgba(241, 245, 249, 0.65);
  font-size: 0.9rem;
}

.pm-spinner {
  width: 20px; height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

.pm-retry {
  margin-left: auto;
  background: rgba(99, 102, 241, 0.15);
  color: #a5b4fc;
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  cursor: pointer;
}

.pm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.pm-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 0.75rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #f1f5f9;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(10px);
}

.pm-tile:hover:not(.disabled) {
  border-color: rgba(99, 102, 241, 0.5);
  background: rgba(99, 102, 241, 0.08);
  transform: translateY(-1px);
}

.pm-tile.active {
  border-color: #6366f1;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(139, 92, 246, 0.12));
  box-shadow: 0 0 0 1px #6366f1, 0 8px 24px -8px rgba(99, 102, 241, 0.4);
}

.pm-tile.disabled { opacity: 0.45; cursor: not-allowed; }

.pm-icon {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 10px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.25);
  overflow: hidden;
}

.pm-icon-fallback {
  font-weight: 700;
  font-size: 0.9rem;
  color: #a5b4fc;
  letter-spacing: 0.5px;
}

.pm-text {
  font-size: 0.8rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.15;
}

.pm-check {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 0.75rem;
  color: #a5b4fc;
  font-weight: 700;
}

.pm-hint {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: rgba(241, 245, 249, 0.5);
}
</style>