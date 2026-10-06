<template>
  <div class="role-preview">
    <button
      class="rp-trigger"
      :class="{ active: isActive }"
      @click="isOpen = !isOpen"
      title="Preview sidebar as a specific role (demo tool)"
    >
      <span class="rp-icon">🎭</span>
      <span class="rp-label" v-if="!isCollapsed">
        View as: <strong>{{ currentLabel }}</strong>
      </span>
      <span class="rp-chevron" :class="{ open: isOpen }">▾</span>
    </button>

    <Teleport to="body">
      <div v-if="isOpen" class="rp-backdrop" @click="isOpen = false"></div>
      <div
        v-if="isOpen"
        class="rp-menu"
        :style="menuStyle"
      >
        <div class="rp-menu-title">Preview sidebar as</div>
        <button
          v-for="opt in options"
          :key="opt.value"
          class="rp-item"
          :class="{ selected: filter === opt.value }"
          @click="select(opt.value)"
        >
          <span class="rp-item-icon">{{ opt.icon }}</span>
          <span class="rp-item-body">
            <span class="rp-item-label">{{ opt.label }}</span>
            <span class="rp-item-hint">{{ opt.hint }}</span>
          </span>
          <span v-if="filter === opt.value" class="rp-check">✓</span>
        </button>
        <div class="rp-menu-footer">
          <span>💡 Only filters sidebar display — doesn't change access.</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const STORAGE_KEY = 'demoRoleFilter'

const isOpen = ref(false)
const isCollapsed = ref(false)
const filter = ref(localStorage.getItem(STORAGE_KEY) || 'all')

const options = [
  { value: 'all',          icon: '👤', label: 'All Roles',     hint: 'Show every section the user can access' },
  { value: 'management',   icon: '🏠', label: 'Management',    hint: 'Dashboard, Products, Sales, POS' },
  { value: 'hr',           icon: '👥', label: 'HR',            hint: 'Employees, Attendance, Payroll' },
  { value: 'finance',      icon: '💰', label: 'Finance',       hint: 'Transactions, Budget, Reports' },
  { value: 'supply_chain', icon: '🚚', label: 'Supply Chain',  hint: 'Inventory, POs, Suppliers' }
]

const currentLabel = computed(() => {
  const opt = options.find(o => o.value === filter.value)
  return opt ? opt.label : 'All Roles'
})

const isActive = computed(() => filter.value !== 'all')

function select(value) {
  filter.value = value
  localStorage.setItem(STORAGE_KEY, value)
  isOpen.value = false
  // Broadcast to Sidebar
  window.dispatchEvent(new CustomEvent('demo-role-filter-changed', { detail: { filter: value } }))
}

const menuStyle = computed(() => ({}))

function handleClickOutside(e) {
  if (!e.target.closest('.role-preview')) isOpen.value = false
}

function syncCollapsed() {
  const saved = localStorage.getItem('sidebarCollapsed')
  isCollapsed.value = saved === 'true'
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('storage', syncCollapsed)
  syncCollapsed()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('storage', syncCollapsed)
})
</script>

<style scoped>
.role-preview {
  position: relative;
}

/* ---------- Trigger button ---------- */
.rp-trigger {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.7rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(124, 58, 237, 0.18);
  color: #4c1d95;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.rp-trigger:hover {
  background: rgba(124, 58, 237, 0.08);
  border-color: rgba(124, 58, 237, 0.4);
}

.rp-trigger.active {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.15), rgba(139, 92, 246, 0.15));
  border-color: rgba(124, 58, 237, 0.5);
  color: #6d28d9;
  box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
}

.rp-icon {
  font-size: 0.85rem;
  line-height: 1;
}

.rp-label {
  display: inline-flex;
  gap: 0.2rem;
  white-space: nowrap;
}

.rp-label strong {
  color: #7c3aed;
  font-weight: 600;
}

.rp-chevron {
  font-size: 0.7rem;
  transition: transform 0.15s ease;
  opacity: 0.7;
}

.rp-chevron.open {
  transform: rotate(180deg);
}

/* Dark mode */
body.dark-mode .rp-trigger {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(167, 139, 250, 0.22);
  color: #c4b5fd;
}

body.dark-mode .rp-trigger:hover {
  background: rgba(124, 58, 237, 0.15);
  border-color: rgba(167, 139, 250, 0.5);
}

body.dark-mode .rp-trigger.active {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(139, 92, 246, 0.25));
  border-color: rgba(167, 139, 250, 0.6);
  color: #e9d5ff;
}

body.dark-mode .rp-label strong {
  color: #c4b5fd;
}

/* ---------- Backdrop ---------- */
.rp-backdrop {
  position: fixed;
  inset: 0;
  background: transparent;
  z-index: 9998;
}

/* ---------- Menu ---------- */
.rp-menu {
  position: fixed;
  top: 68px;
  right: 1rem;
  width: 300px;
  background: #ffffff;
  border-radius: 14px;
  border: 1px solid rgba(124, 58, 237, 0.18);
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18), 0 0 40px rgba(124, 58, 237, 0.1);
  padding: 0.6rem;
  z-index: 9999;
  animation: rpPop 0.14s ease;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}

@keyframes rpPop {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

body.dark-mode .rp-menu {
  background: rgba(20, 16, 46, 0.98);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border-color: rgba(167, 139, 250, 0.25);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 50px rgba(124, 58, 237, 0.25);
}

.rp-menu-title {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
  font-weight: 700;
  padding: 0.4rem 0.6rem;
}

body.dark-mode .rp-menu-title {
  color: #94a3b8;
}

/* ---------- Items ---------- */
.rp-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.6rem 0.7rem;
  border-radius: 10px;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  color: #1e293b;
  font-family: inherit;
  font-size: 0.82rem;
  transition: background 0.12s ease;
}

.rp-item:hover {
  background: rgba(124, 58, 237, 0.08);
}

.rp-item.selected {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(139, 92, 246, 0.12));
  color: #6d28d9;
}

body.dark-mode .rp-item {
  color: #e2e8f0;
}

body.dark-mode .rp-item:hover {
  background: rgba(124, 58, 237, 0.18);
}

body.dark-mode .rp-item.selected {
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(139, 92, 246, 0.28));
  color: #e9d5ff;
}

.rp-item-icon {
  font-size: 1.15rem;
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.rp-item-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.rp-item-label {
  font-weight: 600;
  font-size: 0.85rem;
}

.rp-item-hint {
  font-size: 0.68rem;
  color: #6b7280;
  margin-top: 0.05rem;
}

body.dark-mode .rp-item-hint {
  color: #94a3b8;
}

.rp-check {
  color: #7c3aed;
  font-weight: 700;
  font-size: 0.9rem;
}

body.dark-mode .rp-check {
  color: #c4b5fd;
}

/* ---------- Footer ---------- */
.rp-menu-footer {
  margin-top: 0.4rem;
  padding: 0.5rem 0.6rem 0.3rem;
  border-top: 1px solid rgba(124, 58, 237, 0.12);
  font-size: 0.68rem;
  color: #6b7280;
  line-height: 1.4;
}

body.dark-mode .rp-menu-footer {
  border-top-color: rgba(167, 139, 250, 0.15);
  color: #94a3b8;
}
</style>