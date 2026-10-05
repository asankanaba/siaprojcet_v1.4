<template>
  <div class="role-selector">
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-1">
      {{ label }}
    </label>
    <div class="space-y-2">
      <!-- Role Badges -->
      <div class="flex flex-wrap gap-2">
        <span
          v-for="role in selectedRoles"
          :key="role"
          class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
          :style="{ backgroundColor: getRoleColor(role) + '20', color: getRoleColor(role) }"
        >
          <i :class="getRoleIcon(role)" class="mr-1"></i>
          {{ getRoleLabel(role) }}
          <button
            v-if="editable"
            @click="removeRole(role)"
            class="ml-1 hover:text-red-600"
          >
            <i class="fas fa-times"></i>
          </button>
        </span>
      </div>
      
      <!-- Role Dropdown for Adding -->
      <div v-if="editable" class="flex gap-2">
        <select
          v-model="selectedRoleToAdd"
          class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">Add Role...</option>
          <option
            v-for="role in availableRoles"
            :key="role.key"
            :value="role.key"
            :disabled="selectedRoles.includes(role.key)"
          >
            {{ role.label }}
          </option>
        </select>
        <button
          @click="addRole"
          :disabled="!selectedRoleToAdd"
          class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ROLE_CONFIG } from '@/stores/auth'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  label: {
    type: String,
    default: 'Roles'
  },
  editable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedRoleToAdd = ref('')

// Available roles (all roles)
const availableRoles = computed(() => {
  return Object.keys(ROLE_CONFIG.roles).map(key => ({
    key,
    label: ROLE_CONFIG.roles[key].label,
    icon: ROLE_CONFIG.roles[key].icon,
    color: ROLE_CONFIG.roles[key].color
  }))
})

const selectedRoles = computed({
  get: () => props.modelValue || [],
  set: (value) => emit('update:modelValue', value)
})

const getRoleLabel = (roleKey) => {
  return ROLE_CONFIG.roles[roleKey]?.label || roleKey
}

const getRoleIcon = (roleKey) => {
  return ROLE_CONFIG.roles[roleKey]?.icon || 'fas fa-user'
}

const getRoleColor = (roleKey) => {
  return ROLE_CONFIG.roles[roleKey]?.color || '#6B7280'
}

const addRole = () => {
  if (selectedRoleToAdd.value && !selectedRoles.value.includes(selectedRoleToAdd.value)) {
    selectedRoles.value = [...selectedRoles.value, selectedRoleToAdd.value]
    selectedRoleToAdd.value = ''
  }
}

const removeRole = (role) => {
  selectedRoles.value = selectedRoles.value.filter(r => r !== role)
}
</script>