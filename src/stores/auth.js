// src/stores/auth.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/index.js'

// ============================================
// ROLE CONFIGURATION
// ============================================
export const ROLE_CONFIG = {
  roles: {
    super_admin: {
      label: 'Super Admin',
      icon: 'fas fa-crown',
      color: '#F59E0B',
      modules: ['*'],
      inherits: ['admin']
    },
    admin: {
      label: 'Admin',
      icon: 'fas fa-user-shield',
      color: '#4F46E5',
      modules: [
        'dashboard', 'products', 'sales', 'customers', 'staff', 'pos', 'settings',
        'my_attendance'
      ],
      inherits: ['hr', 'finance', 'supply_chain']
    },
    hr: {
      label: 'HR',
      icon: 'fas fa-users-cog',
      color: '#EC4899',
      modules: [
        'hr_dashboard', 'employees', 'attendance', 'payroll',
        'job_posts', 'hr_reports', 'budget_requests',
        'my_attendance'
      ]
    },
    finance: {
      label: 'Finance',
      icon: 'fas fa-coins',
      color: '#10B981',
      modules: [
        'finance_dashboard', 'transactions', 'wallet', 'budget',
        'budget_requests', 'budget_approvals', 'product_approvals', 'finance_reports',
        'supplier_invoices', 'supplier_payments', 'supply_chain_dashboard',
        'my_attendance'
      ]
    },
    supply_chain: {
      label: 'Supply Chain',
      icon: 'fas fa-truck',
      color: '#8B5CF6',
      modules: [
        'supply_chain_dashboard', 'suppliers', 'inventory',
        'purchase_orders', 'supply_chain_requests', 'supply_chain_notifications',
        'requisitions', 'goods_receipt', 'supplier_performance_menu',
        'finance_dashboard',
        'my_attendance'
      ]
    },
    staff: {
      label: 'Staff',
      icon: 'fas fa-user',
      color: '#6B7280',
      modules: ['pos', 'products', 'sales', 'customers', 'my_attendance']
    },
    cashier: {
      label: 'Cashier',
      icon: 'fas fa-cash-register',
      color: '#F59E0B',
      modules: ['pos', 'sales', 'customers', 'my_attendance']
    }
  },

  menuItems: {
    // Management
    dashboard:                 { label: 'Dashboard',        icon: 'fas fa-chart-pie',          module: 'dashboard',                 path: '/dashboard' },
    products:                  { label: 'Products',         icon: 'fas fa-boxes',              module: 'products',                  path: '/products' },
    sales:                     { label: 'Sales',            icon: 'fas fa-dollar-sign',        module: 'sales',                     path: '/sales' },
    customers:                 { label: 'Customers',        icon: 'fas fa-users',              module: 'customers',                 path: '/customers' },
    staff:                     { label: 'Staff Management', icon: 'fas fa-user-cog',           module: 'staff',                     path: '/staff' },
    pos:                       { label: 'Point of Sale',    icon: 'fas fa-shopping-cart',      module: 'pos',                       path: '/pos' },

    // HR
    hr_dashboard:              { label: 'HR Dashboard',     icon: 'fas fa-columns',            module: 'hr_dashboard',              path: '/hr/dashboard' },
    employees:                 { label: 'Employees',        icon: 'fas fa-user-tie',           module: 'employees',                 path: '/hr/employees' },
    attendance:                { label: 'Attendance',       icon: 'fas fa-clipboard-check',    module: 'attendance',                path: '/hr/attendance' },
    payroll:                   { label: 'Payroll',          icon: 'fas fa-wallet',             module: 'payroll',                   path: '/hr/payroll' },
    job_posts:                 { label: 'Job Posts',        icon: 'fas fa-briefcase',          module: 'job_posts',                 path: '/hr/jobs' },
    hr_reports:                { label: 'HR Reports',       icon: 'fas fa-file-alt',           module: 'hr_reports',                path: '/hr/reports' },
    budget_requests:           { label: 'Budget Requests',  icon: 'fas fa-file-invoice-dollar', module: 'budget_requests',          path: '/hr/budget-requests' },

    // Finance
    finance_dashboard:         { label: 'Dashboard',        icon: 'fas fa-landmark',           module: 'finance_dashboard',         path: '/finance/dashboard' },
    transactions:              { label: 'Transactions',     icon: 'fas fa-exchange-alt',       module: 'transactions',              path: '/finance/transactions' },
    wallet:                    { label: 'Wallet',           icon: 'fas fa-wallet',             module: 'wallet',                    path: '/finance/wallet' },
    budget:                    { label: 'Budget',           icon: 'fas fa-coins',              module: 'budget',                    path: '/finance/budget' },
    budget_approvals:          { label: 'Budget Approvals', icon: 'fas fa-check-double',       module: 'budget_approvals',          path: '/finance/budget-approvals' },
    product_approvals:         { label: 'Product Approvals',icon: 'fas fa-boxes',              module: 'product_approvals',         path: '/finance/product-approvals' },
    finance_reports:           { label: 'Reports',          icon: 'fas fa-file-alt',           module: 'finance_reports',           path: '/finance/reports' },

    // Supply Chain
    supply_chain_dashboard:    { label: 'Dashboard',        icon: 'fas fa-truck',              module: 'supply_chain_dashboard',    path: '/supply-chain' },
    suppliers:                 { label: 'Suppliers',        icon: 'fas fa-building',           module: 'suppliers',                 path: '/supply-chain/suppliers' },
    supply_inventory:          { label: 'Inventory',        icon: 'fas fa-boxes',              module: 'inventory',                 path: '/supply-chain/inventory' },
    purchase_orders:           { label: 'Purchase Orders',  icon: 'fas fa-file-invoice',       module: 'purchase_orders',           path: '/supply-chain/purchase-orders' },
    supply_requests:           { label: 'Requests',         icon: 'fas fa-hand-holding-usd',   module: 'supply_chain_requests',     path: '/supply-chain/requests' },
    supply_notifications:      { label: 'Notifications',    icon: 'fas fa-bell',               module: 'supply_chain_notifications',path: '/supply-chain/notifications' },

    // Procurement
    requisitions:              { label: 'Requisitions',     icon: 'fas fa-file-signature',     module: 'requisitions',              path: '/supply-chain/procurement/requisitions' },
    rfq_management:            { label: 'RFQs',             icon: 'fas fa-file-contract',      module: 'suppliers',                 path: '/supply-chain/procurement/rfqs' },
    goods_receipt:             { label: 'Accept Delivery',  icon: 'fas fa-box-open',           module: 'goods_receipt',             path: '/supply-chain/procurement/goods-receipt' },
    supplier_invoices:         { label: 'Supplier Invoices',icon: 'fas fa-file-invoice-dollar',module: 'supplier_invoices',         path: '/supply-chain/procurement/invoices' },
    supplier_payments:         { label: 'Supplier Payments',icon: 'fas fa-money-bill-wave',    module: 'supplier_payments',         path: '/supply-chain/procurement/payments' },
    supplier_performance_menu: { label: 'Supplier Ratings', icon: 'fas fa-star',               module: 'supplier_performance_menu', path: '/supply-chain/procurement/supplier-performance' },

    // System
    my_attendance:             { label: 'My Attendance',    icon: 'fas fa-user-clock',         module: 'my_attendance',             path: '/my-attendance' },
    settings:                  { label: 'Settings',         icon: 'fas fa-cog',                module: 'settings',                  path: '/settings' },
    logout:                    { label: 'Logout',           icon: 'fas fa-sign-out-alt',       path: '/logout', isLogout: true }
  }
}

export const useAuthStore = defineStore('auth', () => {
  // ============================================
  // STATE
  // ============================================
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  const userRoles = ref([])
  const userPermissions = ref({})

  // ============================================
  // COMPUTED
  // ============================================
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const displayName = computed(() => user.value?.full_name || user.value?.username || 'User')

  const roleLabel = computed(() => {
    const primaryRole = user.value?.role || 'staff'
    return ROLE_CONFIG.roles[primaryRole] || ROLE_CONFIG.roles.staff
  })

  const accessibleModules = computed(() => {
    if (!user.value) return []
    const modules = new Set()
    const roles = userRoles.value.length > 0 ? userRoles.value : [user.value.role]

    const addRoleModules = (roleName) => {
      const roleConfig = ROLE_CONFIG.roles[roleName]
      if (!roleConfig) return
      if (roleConfig.modules.includes('*')) {
        Object.keys(ROLE_CONFIG.menuItems).forEach(key => modules.add(key))
      } else {
        roleConfig.modules.forEach(mod => modules.add(mod))
      }
      if (roleConfig.inherits) {
        roleConfig.inherits.forEach(inherited => addRoleModules(inherited))
      }
    }

    roles.forEach(addRoleModules)
    return Array.from(modules)
  })

  const menuItems = computed(() => {
    const items = []
    const modules = accessibleModules.value
    Object.keys(ROLE_CONFIG.menuItems).forEach(key => {
      const item = ROLE_CONFIG.menuItems[key]
      if (item.isLogout) {
        items.push(item)
      } else if (modules.includes('*') || modules.includes(item.module)) {
        items.push(item)
      }
    })
    return items
  })

  // ============================================
  // METHODS
  // ============================================
  const login = async (username, password) => {
    try {
      const response = await api.post('/auth.php', { username, password })
      if (response.data.success) {
        user.value = response.data.user
        token.value = response.data.token
        localStorage.setItem('token', token.value)
        localStorage.setItem('user', JSON.stringify(user.value))
        userRoles.value = Array.isArray(user.value.roles) ? user.value.roles : [user.value.role]
        if (user.value.permissions) {
          userPermissions.value = typeof user.value.permissions === 'object'
            ? user.value.permissions
            : JSON.parse(user.value.permissions)
        }
        return { success: true, user: user.value }
      }
      return { success: false, error: response.data.message || 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: error.message || 'Login failed' }
    }
  }

  const checkAuth = () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    if (storedToken && storedUser) {
      token.value = storedToken
      try {
        user.value = JSON.parse(storedUser)
        userRoles.value = Array.isArray(user.value.roles) ? user.value.roles : [user.value.role]
        return true
      } catch { return false }
    }
    return false
  }

  const logout = () => {
    user.value = null
    token.value = null
    userRoles.value = []
    userPermissions.value = {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const getCurrentUser = async () => {
    try {
      if (!user.value?.id) return null
      const response = await api.get(`/users.php?id=${user.value.id}`)
      let userData = response.data
      if (response.data && response.data.success === false) return null
      if (Array.isArray(response.data)) {
        userData = response.data.find(u => u.id === user.value.id)
        if (!userData) return null
      }
      if (userData?.id) {
        user.value = userData
        localStorage.setItem('user', JSON.stringify(userData))
        userRoles.value = Array.isArray(userData.roles) ? userData.roles : [userData.role]
        return userData
      }
      return null
    } catch { return null }
  }

  const hasModule = (module) => {
    return accessibleModules.value.includes('*') || accessibleModules.value.includes(module)
  }

  const hasPermission = (module, action = 'view') => {
    if (!hasModule(module)) return false
    if (userPermissions.value[module]) {
      const perms = userPermissions.value[module]
      if (perms.includes('full') || perms.includes('*')) return true
      return perms.includes(action)
    }
    const role = user.value?.role
    if (role === 'super_admin' || role === 'admin') return true
    return action === 'view'
  }

  const hasAnyRole = (roles) => {
    if (!Array.isArray(roles)) roles = [roles]
    return roles.some(role => userRoles.value.includes(role) || user.value?.role === role)
  }

  // Role shortcuts
  const isHR          = computed(() => hasAnyRole(['hr', 'admin', 'super_admin']))
  const isFinance     = computed(() => hasAnyRole(['finance', 'admin', 'super_admin']))
  const isSupplyChain = computed(() => hasAnyRole(['supply_chain', 'admin', 'super_admin']))
  const isAdmin       = computed(() => hasAnyRole(['admin', 'super_admin']))
  const isCEO         = computed(() => hasAnyRole(['super_admin']))
  const isCashier     = computed(() => hasAnyRole(['cashier']))
  const isStaff       = computed(() => hasAnyRole(['staff', 'cashier']) || (!isAdmin.value && !isHR.value && !isFinance.value && !isSupplyChain.value))

  // Self-service pages available to everyone
  const canViewMyAttendance = computed(() => hasModule('my_attendance'))

  checkAuth()

  return {
    user, token, userRoles, userPermissions,
    isAuthenticated, displayName, roleLabel,
    accessibleModules, menuItems,
    login, logout, checkAuth, getCurrentUser,
    hasModule, hasPermission, hasAnyRole,
    isHR, isFinance, isSupplyChain, isAdmin, isCEO, isCashier, isStaff,
    canViewMyAttendance
  }
})