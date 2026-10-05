<template>
  <div ref="rootRef" class="glass-select" :class="{ open: isOpen, disabled }">
    <button
      type="button"
      class="glass-select-trigger"
      :disabled="disabled"
      @click="toggle"
      @keydown.down.prevent="openAndFocus(0)"
      @keydown.up.prevent="openAndFocus(options.length - 1)"
      @keydown.enter.prevent="toggle"
      @keydown.esc="close"
    >
      <span class="glass-select-label" :class="{ placeholder: !selectedLabel }">
        {{ selectedLabel || placeholder }}
      </span>
      <i class="fas fa-chevron-down glass-select-chevron" :class="{ rotated: isOpen }"></i>
    </button>

    <Teleport to="body">
      <Transition name="gs-fade">
        <div
          v-if="isOpen"
          ref="menuRef"
          class="glass-select-menu glass-panel"
          :style="menuStyle"
          @click.stop
        >
          <div
            v-for="(opt, idx) in options"
            :key="opt.value"
            class="glass-select-option"
            :class="{
              'is-selected': opt.value === modelValue,
              'is-active': idx === activeIndex,
              'is-disabled': opt.disabled
            }"
            @click="selectOption(opt)"
            @mouseenter="activeIndex = idx"
          >
            <span class="gs-opt-label">{{ opt.label }}</span>
            <i v-if="opt.value === modelValue" class="fas fa-check gs-opt-check"></i>
          </div>
          <div v-if="options.length === 0" class="glass-select-empty">
            No options
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: '' },
  options: { type: Array, default: () => [] }, // [{ label, value, disabled? }]
  placeholder: { type: String, default: 'Select...' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const menuRef = ref(null)
const isOpen = ref(false)
const activeIndex = ref(-1)
const menuStyle = ref({})

const selectedLabel = computed(() => {
  const found = props.options.find(o => o.value === props.modelValue)
  return found ? found.label : ''
})

const toggle = () => {
  if (props.disabled) return
  if (isOpen.value) close()
  else open()
}

const open = async () => {
  isOpen.value = true
  activeIndex.value = props.options.findIndex(o => o.value === props.modelValue)
  await nextTick()
  positionMenu()
  window.addEventListener('scroll', positionMenu, true)
  window.addEventListener('resize', positionMenu)
  document.addEventListener('mousedown', onOutside)
}

const close = () => {
  isOpen.value = false
  window.removeEventListener('scroll', positionMenu, true)
  window.removeEventListener('resize', positionMenu)
  document.removeEventListener('mousedown', onOutside)
}

const openAndFocus = (idx) => {
  isOpen.value = true
  activeIndex.value = Math.max(0, idx)
}

const selectOption = (opt) => {
  if (opt.disabled) return
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  close()
}

const positionMenu = () => {
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  const menuHeight = Math.min(280, props.options.length * 40 + 16)
  const spaceBelow = window.innerHeight - rect.bottom
  const openUp = spaceBelow < menuHeight + 20

  menuStyle.value = {
    position: 'fixed',
    left: rect.left + 'px',
    width: rect.width + 'px',
    top: openUp ? (rect.top - menuHeight - 6) + 'px' : (rect.bottom + 6) + 'px',
    maxHeight: menuHeight + 'px',
    zIndex: 10000
  }
}

const onOutside = (e) => {
  if (rootRef.value?.contains(e.target)) return
  if (menuRef.value?.contains(e.target)) return
  close()
}

const onKeydown = (e) => {
  if (!isOpen.value) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, props.options.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    if (activeIndex.value >= 0) selectOption(props.options[activeIndex.value])
  } else if (e.key === 'Escape') {
    close()
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('scroll', positionMenu, true)
  window.removeEventListener('resize', positionMenu)
  document.removeEventListener('mousedown', onOutside)
})

watch(() => props.modelValue, () => { if (isOpen.value) positionMenu() })
</script>

<style scoped>
.glass-select {
  position: relative;
  width: 100%;
}

.glass-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.glass-select-trigger:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.75);
}

.glass-select.open .glass-select-trigger,
.glass-select-trigger:focus {
  outline: none;
  border-color: rgba(79, 70, 229, 0.5);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
}

body.dark-mode .glass-select-trigger {
  background: rgba(26, 22, 48, 0.55);
  border-color: rgba(167, 139, 250, 0.2);
  color: #e2e8f0;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

body.dark-mode .glass-select-trigger:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.15);
  border-color: rgba(167, 139, 250, 0.35);
}

body.dark-mode .glass-select.open .glass-select-trigger,
body.dark-mode .glass-select-trigger:focus {
  border-color: rgba(167, 139, 250, 0.5);
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2);
}

.glass-select-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glass-select-label.placeholder {
  color: #9ca3af;
}

.glass-select-chevron {
  font-size: 0.7rem;
  opacity: 0.6;
  transition: transform 0.2s ease;
}

.glass-select-chevron.rotated {
  transform: rotate(180deg);
}

.glass-select.disabled {
  opacity: 0.5;
  pointer-events: none;
}
</style>

<!-- Menu is teleported — needs global CSS -->
<style>
.glass-select-menu {
  border-radius: 12px;
  padding: 0.35rem;
  overflow-y: auto;

  background: rgba(255, 255, 255, 0.85);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 20px 48px rgba(31, 38, 135, 0.18);
}

body.dark-mode .glass-select-menu {
  background: rgba(20, 16, 46, 0.92);
  border-color: rgba(167, 139, 250, 0.25);
  box-shadow:
    0 20px 48px rgba(0, 0, 0, 0.55),
    0 0 60px rgba(124, 58, 237, 0.2);
}

.glass-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
  color: #1f2937;
}

body.dark-mode .glass-select-option {
  color: #e2e8f0;
}

.glass-select-option.is-active,
.glass-select-option:hover {
  background: rgba(79, 70, 229, 0.1);
}

body.dark-mode .glass-select-option.is-active,
body.dark-mode .glass-select-option:hover {
  background: rgba(124, 58, 237, 0.2);
}

.glass-select-option.is-selected {
  background: linear-gradient(135deg, rgba(79, 70, 229, 0.15), rgba(124, 58, 237, 0.15));
  color: #4f46e5;
  font-weight: 600;
}

body.dark-mode .glass-select-option.is-selected {
  color: #a78bfa;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(79, 70, 229, 0.25));
}

.glass-select-option.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.gs-opt-label {
  flex: 1;
}

.gs-opt-check {
  font-size: 0.75rem;
}

.glass-select-empty {
  padding: 1rem;
  text-align: center;
  font-size: 0.85rem;
  color: #9ca3af;
}

.gs-fade-enter-active,
.gs-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.gs-fade-enter-from,
.gs-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>