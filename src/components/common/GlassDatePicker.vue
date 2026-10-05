<template>
  <div ref="rootRef" class="glass-datepicker" :class="{ open: isOpen, disabled }">
    <button
      type="button"
      class="glass-datepicker-trigger"
      :disabled="disabled"
      @click="toggle"
    >
      <i class="fas fa-calendar-alt gdp-icon"></i>
      <span class="gdp-label" :class="{ placeholder: !displayValue }">
        {{ displayValue || placeholder }}
      </span>
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="gdp-clear"
        @click.stop="clear"
        title="Clear"
      >
        <i class="fas fa-times"></i>
      </button>
    </button>

    <Teleport to="body">
      <Transition name="gdp-fade">
        <div
          v-if="isOpen"
          ref="calendarRef"
          class="glass-datepicker-panel glass-panel"
          :style="panelStyle"
          @click.stop
        >
          <!-- Header -->
          <div class="gdp-header">
            <button type="button" class="gdp-nav" @click="prevMonth">
              <i class="fas fa-chevron-left"></i>
            </button>

            <div class="gdp-header-center">
              <button type="button" class="gdp-title" @click="viewMode = viewMode === 'day' ? 'month' : 'day'">
                {{ monthLabel }} {{ year }}
              </button>
            </div>

            <button type="button" class="gdp-nav" @click="nextMonth">
              <i class="fas fa-chevron-right"></i>
            </button>
          </div>

          <!-- Month Grid -->
          <div v-if="viewMode === 'month'" class="gdp-month-grid">
            <button
              v-for="(m, idx) in months"
              :key="idx"
              type="button"
              class="gdp-month-btn"
              :class="{ 'is-current': idx === viewMonth && year === viewYear }"
              @click="pickMonth(idx)"
            >
              {{ m.slice(0, 3) }}
            </button>
          </div>

          <!-- Day Grid -->
          <div v-else>
            <div class="gdp-weekdays">
              <span v-for="d in weekdays" :key="d">{{ d }}</span>
            </div>

            <div class="gdp-days">
              <button
                v-for="cell in dayCells"
                :key="cell.key"
                type="button"
                class="gdp-day"
                :class="{
                  'is-other-month': !cell.inMonth,
                  'is-today': cell.isToday,
                  'is-selected': cell.isSelected
                }"
                @click="pickDay(cell)"
              >
                {{ cell.day }}
              </button>
            </div>
          </div>

          <!-- Footer -->
          <div class="gdp-footer">
            <button type="button" class="gdp-action" @click="clear">Clear</button>
            <button type="button" class="gdp-action primary" @click="today">Today</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }, // YYYY-MM-DD
  placeholder: { type: String, default: 'Select date...' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const calendarRef = ref(null)
const isOpen = ref(false)
const viewMode = ref('day')

const today = new Date()
const viewMonth = ref(today.getMonth())
const viewYear = ref(today.getFullYear())

const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
const weekdays = ['Su','Mo','Tu','We','Th','Fr','Sa']

const panelStyle = ref({})

const parseDate = (str) => {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

const formatDate = (date) => {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatDisplay = (str) => {
  const d = parseDate(str)
  if (!d) return ''
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const displayValue = computed(() => formatDisplay(props.modelValue))
const monthLabel = computed(() => months[viewMonth.value])
const year = computed(() => viewYear.value)

const dayCells = computed(() => {
  const cells = []
  const firstOfMonth = new Date(viewYear.value, viewMonth.value, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const prevMonthDays = new Date(viewYear.value, viewMonth.value, 0).getDate()

  const selected = parseDate(props.modelValue)
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)

  // Previous month tail
  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    const dt = new Date(viewYear.value, viewMonth.value - 1, day)
    cells.push({
      key: `p-${day}`,
      day,
      date: dt,
      inMonth: false,
      isToday: dt.getTime() === todayDate.getTime(),
      isSelected: selected && dt.getTime() === selected.getTime()
    })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(viewYear.value, viewMonth.value, d)
    cells.push({
      key: `c-${d}`,
      day: d,
      date: dt,
      inMonth: true,
      isToday: dt.getTime() === todayDate.getTime(),
      isSelected: selected && dt.getTime() === selected.getTime()
    })
  }

  // Next month head
  const totalCells = Math.ceil(cells.length / 7) * 7
  let nd = 1
  while (cells.length < totalCells) {
    const dt = new Date(viewYear.value, viewMonth.value + 1, nd)
    cells.push({
      key: `n-${nd}`,
      day: nd,
      date: dt,
      inMonth: false,
      isToday: dt.getTime() === todayDate.getTime(),
      isSelected: selected && dt.getTime() === selected.getTime()
    })
    nd++
  }

  return cells
})

const toggle = () => {
  if (props.disabled) return
  if (isOpen.value) close()
  else open()
}

const open = async () => {
  const d = parseDate(props.modelValue) || new Date()
  viewMonth.value = d.getMonth()
  viewYear.value = d.getFullYear()
  viewMode.value = 'day'
  isOpen.value = true
  await nextTick()
  positionPanel()
  window.addEventListener('scroll', positionPanel, true)
  window.addEventListener('resize', positionPanel)
  document.addEventListener('mousedown', onOutside)
}

const close = () => {
  isOpen.value = false
  window.removeEventListener('scroll', positionPanel, true)
  window.removeEventListener('resize', positionPanel)
  document.removeEventListener('mousedown', onOutside)
}

const positionPanel = () => {
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  const panelWidth = 320
  const panelHeight = 400
  const spaceBelow = window.innerHeight - rect.bottom
  const openUp = spaceBelow < panelHeight + 20
  const left = Math.min(rect.left, window.innerWidth - panelWidth - 12)

  panelStyle.value = {
    position: 'fixed',
    left: left + 'px',
    top: openUp ? (rect.top - panelHeight - 6) + 'px' : (rect.bottom + 6) + 'px',
    width: panelWidth + 'px',
    zIndex: 10000
  }
}

const prevMonth = () => {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

const nextMonth = () => {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

const pickMonth = (idx) => {
  viewMonth.value = idx
  viewMode.value = 'day'
}

const pickDay = (cell) => {
  const str = formatDate(cell.date)
  emit('update:modelValue', str)
  emit('change', str)
  close()
}

const clear = () => {
  emit('update:modelValue', '')
  emit('change', '')
  close()
}

const todayPick = () => {
  const t = new Date()
  const str = formatDate(t)
  emit('update:modelValue', str)
  emit('change', str)
  close()
}

const onOutside = (e) => {
  if (rootRef.value?.contains(e.target)) return
  if (calendarRef.value?.contains(e.target)) return
  close()
}

onMounted(() => {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close()
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', positionPanel, true)
  window.removeEventListener('resize', positionPanel)
  document.removeEventListener('mousedown', onOutside)
})
</script>

<style scoped>
.glass-datepicker {
  position: relative;
  width: 100%;
}

.glass-datepicker-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.9rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;

  background: rgba(255, 255, 255, 0.6);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 2px 12px rgba(31, 38, 135, 0.05);
}

.glass-datepicker-trigger:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.75);
}

.glass-datepicker.open .glass-datepicker-trigger,
.glass-datepicker-trigger:focus {
  outline: none;
  border-color: rgba(79, 70, 229, 0.5);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
}

body.dark-mode .glass-datepicker-trigger {
  background: rgba(26, 22, 48, 0.55);
  border-color: rgba(167, 139, 250, 0.2);
  color: #e2e8f0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

body.dark-mode .glass-datepicker-trigger:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.15);
  border-color: rgba(167, 139, 250, 0.35);
}

body.dark-mode .glass-datepicker.open .glass-datepicker-trigger,
body.dark-mode .glass-datepicker-trigger:focus {
  border-color: rgba(167, 139, 250, 0.5);
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2);
}

.gdp-icon {
  font-size: 0.85rem;
  opacity: 0.6;
}

.gdp-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gdp-label.placeholder {
  color: #9ca3af;
}

.gdp-clear {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.gdp-clear:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.glass-datepicker.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>

<style>
/* Teleported panel — global styles */
.glass-datepicker-panel {
  padding: 0.75rem;
  border-radius: 14px;
  user-select: none;

  background: rgba(255, 255, 255, 0.88);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  backdrop-filter: blur(28px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 24px 60px rgba(31, 38, 135, 0.2);
  color: #1f2937;
}

body.dark-mode .glass-datepicker-panel {
  background: rgba(20, 16, 46, 0.94);
  border-color: rgba(167, 139, 250, 0.25);
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.6),
    0 0 60px rgba(124, 58, 237, 0.2);
  color: #f1f5f9;
}

/* Header */
.gdp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  gap: 0.5rem;
}

.gdp-nav {
  background: none;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gdp-nav:hover {
  background: rgba(79, 70, 229, 0.1);
  color: #4f46e5;
}

body.dark-mode .gdp-nav:hover {
  background: rgba(124, 58, 237, 0.2);
  color: #a78bfa;
}

.gdp-header-center {
  flex: 1;
  text-align: center;
}

.gdp-title {
  background: none;
  border: none;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1a1a2e;
  cursor: pointer;
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.gdp-title:hover {
  background: rgba(79, 70, 229, 0.08);
}

body.dark-mode .gdp-title {
  color: #f1f5f9;
}

body.dark-mode .gdp-title:hover {
  background: rgba(124, 58, 237, 0.15);
}

/* Weekdays */
.gdp-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 0.25rem;
}

.gdp-weekdays span {
  text-align: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #9ca3af;
  padding: 0.35rem 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Days */
.gdp-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.gdp-day {
  background: none;
  border: none;
  padding: 0.5rem 0;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  color: #1f2937;
  transition: all 0.15s ease;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gdp-day:hover {
  background: rgba(79, 70, 229, 0.1);
}

body.dark-mode .gdp-day {
  color: #e2e8f0;
}

body.dark-mode .gdp-day:hover {
  background: rgba(124, 58, 237, 0.2);
}

.gdp-day.is-other-month {
  color: #cbd5e1;
}

body.dark-mode .gdp-day.is-other-month {
  color: #475569;
}

.gdp-day.is-today {
  border: 2px solid #4f46e5;
  font-weight: 700;
}

body.dark-mode .gdp-day.is-today {
  border-color: #a78bfa;
}

.gdp-day.is-selected {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff !important;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

body.dark-mode .gdp-day.is-selected {
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.5);
}

/* Month Grid */
.gdp-month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin: 0.5rem 0;
}

.gdp-month-btn {
  padding: 0.65rem 0.4rem;
  border-radius: 8px;
  border: none;
  background: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: #1f2937;
  transition: all 0.15s ease;
}

.gdp-month-btn:hover {
  background: rgba(79, 70, 229, 0.1);
}

body.dark-mode .gdp-month-btn {
  color: #e2e8f0;
}

body.dark-mode .gdp-month-btn:hover {
  background: rgba(124, 58, 237, 0.2);
}

.gdp-month-btn.is-current {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
}

/* Footer */
.gdp-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

body.dark-mode .gdp-footer {
  border-top-color: rgba(167, 139, 250, 0.12);
}

.gdp-action {
  background: none;
  border: none;
  padding: 0.35rem 0.8rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  color: #4f46e5;
  transition: all 0.15s ease;
}

.gdp-action:hover {
  background: rgba(79, 70, 229, 0.1);
}

body.dark-mode .gdp-action {
  color: #a78bfa;
}

body.dark-mode .gdp-action:hover {
  background: rgba(124, 58, 237, 0.2);
}

.gdp-action.primary {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
}

.gdp-action.primary:hover {
  background: linear-gradient(135deg, #4338ca, #6d28d9);
}

/* Transition */
.gdp-fade-enter-active,
.gdp-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.gdp-fade-enter-from,
.gdp-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>