// src/stores/index.js
import { createPinia } from 'pinia'

const pinia = createPinia()

export default pinia

// Export all stores
export { useAuthStore } from './auth'
export { useCartStore } from './cart'
export { usePayrollStore } from './payroll'
export { useProductStore } from './products'
export { useSupplyChainStore } from './supplyChain'
export { useThemeStore } from './theme'