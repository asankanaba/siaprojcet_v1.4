<template>
  <aside class="sidebar" :class="{ collapsed: isCollapsed }">
    <!-- Brand -->
    <div class="sidebar-brand">
      <div class="brand-content">
        <i class="fas fa-store"></i>
        <span v-if="!isCollapsed" class="brand-text">Smart POS</span>
        <span v-if="!isCollapsed" class="version-badge">v1.3</span>
      </div>
      <button @click="toggleSidebar" class="toggle-btn">
        <i :class="isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left'"></i>
      </button>
    </div>

    <nav class="sidebar-nav">
      <!-- MANAGEMENT -->
      <template v-if="hasSection('management')">
        <div class="nav-section">
          <span v-if="!isCollapsed" class="nav-section-title">Management</span>
          <span v-else class="nav-section-dot">•</span>

          <router-link
            v-for="item in getMenuItems('management')"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: isActive(item.path) }"
          >
            <i :class="item.icon"></i>
            <span v-if="!isCollapsed">{{ item.label }}</span>
          </router-link>
        </div>
        <div v-if="!isCollapsed && hasNextSection('management')" class="nav-divider"></div>
      </template>

      <!-- HR -->
      <template v-if="hasHRRole() && hasSection('hr')">
        <div class="nav-section">
          <span v-if="!isCollapsed" class="nav-section-title">HR Management</span>
          <span v-else class="nav-section-dot">•</span>

          <router-link
            v-for="item in getHRMenuItems()"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: isActive(item.path) }"
          >
            <i :class="item.icon"></i>
            <span v-if="!isCollapsed">{{ item.label }}</span>
            <span v-if="!isCollapsed && item.badge" class="nav-badge" :class="item.badgeClass">
              {{ item.badge }}
            </span>
            <span
              v-if="!isCollapsed && item.path === '/hr/notifications' && unreadCount > 0"
              class="nav-badge badge-notification"
            >
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </router-link>
        </div>
        <div v-if="!isCollapsed && hasNextSection('hr')" class="nav-divider"></div>
      </template>

      <!-- FINANCE -->
      <template v-if="hasFinanceRole() && hasSection('finance')">
        <div class="nav-section">
          <span v-if="!isCollapsed" class="nav-section-title">Finance</span>
          <span v-else class="nav-section-dot">•</span>

          <router-link
            v-for="item in getFinanceMenuItems()"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: isActive(item.path) }"
          >
            <i :class="item.icon"></i>
            <span v-if="!isCollapsed">{{ item.label }}</span>
            <span v-if="!isCollapsed && item.badge" class="nav-badge" :class="item.badgeClass">
              {{ item.badge }}
            </span>
          </router-link>
        </div>
        <div v-if="!isCollapsed && hasNextSection('finance')" class="nav-divider"></div>
      </template>

      <!-- SUPPLY CHAIN -->
      <template v-if="hasSection('supply_chain')">
        <div class="nav-section">
          <span v-if="!isCollapsed" class="nav-section-title">Supply Chain</span>
          <span v-else class="nav-section-dot">•</span>

          <router-link
            v-for="item in getMenuItems('supply_chain')"
            :key="item.path"
            :to="item.path"
            class="nav-link"
            :class="{ active: isActive(item.path) }"
          >
            <i :class="item.icon"></i>
            <span v-if="!isCollapsed">{{ item.label }}</span>
            <span v-if="!isCollapsed && item.badge" class="nav-badge" :class="item.badgeClass">
              {{ item.badge }}
            </span>
          </router-link>
        </div>
        <div v-if="!isCollapsed && hasNextSection('supply_chain')" class="nav-divider"></div>
      </template>

      <!-- SYSTEM -->
      <div class="nav-section">
        <span v-if="!isCollapsed" class="nav-section-title">System</span>
        <span v-else class="nav-section-dot">•</span>

        <router-link
          v-if="authStore.hasModule('attendance')"
          to="/my-attendance"
          class="nav-link"
          :class="{ active: isActive('/my-attendance') }"
        >
          <i class="fas fa-user-clock"></i>
          <span v-if="!isCollapsed">My Attendance</span>
        </router-link>

        <router-link
          v-if="authStore.hasModule('settings')"
          to="/settings"
          class="nav-link"
          :class="{ active: isActive('/settings') }"
        >
          <i class="fas fa-cog"></i>
          <span v-if="!isCollapsed">Settings</span>
        </router-link>

        <a @click.prevent="handleLogout" class="nav-link logout-link">
          <i class="fas fa-sign-out-alt"></i>
          <span v-if="!isCollapsed">Logout</span>
        </a>
      </div>
    </nav>

    <!-- Footer -->
    <div class="sidebar-footer">
      <div class="user-role-badge" :style="{ color: authStore.roleLabel?.color || '#6B7280' }">
        <i :class="authStore.roleLabel?.icon || 'fas fa-user'"></i>
        <span v-if="!isCollapsed">{{ authStore.roleLabel?.label || 'Staff' }}</span>
      </div>
      <small v-if="!isCollapsed">Smart POS v1.3</small>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useHRNotificationsStore } from '@/stores/hrNotifications'
import Swal from 'sweetalert2'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const notifStore = useHRNotificationsStore()

const isCollapsed = ref(false)

// ============================================
// DEMO ROLE PREVIEW FILTER
// ============================================
const demoRoleFilter = ref(localStorage.getItem('demoRoleFilter') || 'all')

const handleDemoFilterChange = (e) => {
  demoRoleFilter.value = e.detail?.filter || 'all'
}

// ============================================
// MENU CONFIGURATION
// ============================================
const menuConfig = {
  management: {
    icon: 'fas fa-th-large',
    items: [
      { module: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'fas fa-chart-pie' },
      { module: 'products', label: 'Products', path: '/products', icon: 'fas fa-boxes', roles: ['admin', 'super_admin', 'hr', 'finance'] },
      { module: 'sales', label: 'Sales', path: '/sales', icon: 'fas fa-dollar-sign' },
      { module: 'customers', label: 'Customers', path: '/customers', icon: 'fas fa-users' },
      { module: 'staff', label: 'Staff Management', path: '/staff', icon: 'fas fa-user-cog', roles: ['admin', 'super_admin'] },
      { module: 'pos', label: 'Point of Sale', path: '/pos', icon: 'fas fa-shopping-cart' }
    ]
  },
  hr: {
    icon: 'fas fa-users-cog',
    items: [
      { module: 'hr_dashboard', label: 'HR Dashboard', path: '/hr/dashboard', icon: 'fas fa-columns' },
      { module: 'employees', label: 'Employees', path: '/hr/employees', icon: 'fas fa-user-tie' },
      { module: 'attendance', label: 'Attendance', path: '/hr/attendance', icon: 'fas fa-clipboard-check', badge: 'Live', badgeClass: 'badge-live' },
      { module: 'attendance', label: 'Notifications', path: '/hr/notifications', icon: 'fas fa-bell' },
      { module: 'payroll', label: 'Payroll', path: '/hr/payroll', icon: 'fas fa-wallet', badge: 'Auto', badgeClass: 'badge-auto' },
      { module: 'job_posts', label: 'Job Posts', path: '/hr/jobs', icon: 'fas fa-briefcase' },
      { module: 'hr_reports', label: 'HR Reports', path: '/hr/reports', icon: 'fas fa-file-alt' }
    ]
  },
  finance: {
    icon: 'fas fa-coins',
    items: [
      { module: 'finance_dashboard', label: 'Dashboard', path: '/finance/dashboard', icon: 'fas fa-landmark' },
      { module: 'transactions', label: 'Transactions', path: '/finance/transactions', icon: 'fas fa-exchange-alt' },
      { module: 'wallet', label: 'Wallet', path: '/finance/wallet', icon: 'fas fa-wallet' },
      { module: 'budget', label: 'Budget', path: '/finance/budget', icon: 'fas fa-coins' },
      { module: 'budget_approvals', label: 'Budget Approvals', path: '/finance/budget-approvals', icon: 'fas fa-check-double' },
      { module: 'product_approvals', label: 'Product Approvals', path: '/finance/product-approvals', icon: 'fas fa-boxes' },
      { module: 'supplier_invoices', label: 'Supplier Invoices', path: '/supply-chain/procurement/invoices', icon: 'fas fa-file-invoice-dollar' },
      { module: 'supplier_payments', label: 'Supplier Payments', path: '/supply-chain/procurement/payments', icon: 'fas fa-money-bill-wave' },
      { module: 'finance_reports', label: 'Reports', path: '/finance/reports', icon: 'fas fa-file-alt' }
    ]
  },
  supply_chain: {
    icon: 'fas fa-truck',
    items: [
      { module: 'supply_chain_dashboard', label: 'Dashboard', path: '/supply-chain', icon: 'fas fa-tachometer-alt' },
      { module: 'supply_chain_requests', label: 'Requisitions', path: '/supply-chain/procurement/requisitions', icon: 'fas fa-file-signature' },
      { module: 'suppliers', label: 'RFQs', path: '/supply-chain/procurement/rfqs', icon: 'fas fa-file-contract' },
      { module: 'inventory', label: 'Inventory', path: '/supply-chain/inventory', icon: 'fas fa-boxes' },
      { module: 'purchase_orders', label: 'Purchase Orders', path: '/supply-chain/purchase-orders', icon: 'fas fa-file-invoice' },
      { module: 'purchase_orders', label: 'Accept Delivery', path: '/supply-chain/procurement/goods-receipt', icon: 'fas fa-box-open' },
      { module: 'suppliers', label: 'Supplier Ratings', path: '/supply-chain/procurement/supplier-performance', icon: 'fas fa-star' },
      { module: 'supply_chain_requests', label: 'Requests', path: '/supply-chain/requests', icon: 'fas fa-hand-holding-usd' },
      { module: 'supply_chain_notifications', label: 'Notifications', path: '/supply-chain/notifications', icon: 'fas fa-bell' }
    ]
  }
}

const SHARED_MODULES = ['budget_requests']

// ============================================
// ACTIVE LINK DETECTION
// ============================================
const EXACT_PATHS = [
  '/dashboard', '/products', '/sales', '/customers', '/staff', '/pos',
  '/hr/dashboard', '/hr/employees', '/hr/attendance', '/hr/notifications',
  '/hr/payroll', '/hr/jobs', '/hr/reports',
  '/finance/dashboard', '/finance/transactions', '/finance/wallet',
  '/finance/budget', '/finance/budget-approvals', '/finance/product-approvals',
  '/finance/reports',
  '/supply-chain', '/supply-chain/inventory', '/supply-chain/purchase-orders',
  '/supply-chain/requests', '/supply-chain/notifications',
  '/supply-chain/procurement/requisitions', '/supply-chain/procurement/rfqs',
  '/supply-chain/procurement/goods-receipt', '/supply-chain/procurement/invoices',
  '/supply-chain/procurement/payments', '/supply-chain/procurement/supplier-performance',
  '/my-attendance', '/settings'
]

const isActive = (path) => {
  if (EXACT_PATHS.includes(path)) return route.path === path
  return route.path === path || route.path.startsWith(path + '/')
}

// ============================================
// COMPUTED
// ============================================
const unreadCount = computed(() => notifStore.unreadCount)

const hasHRRole = () => authStore.hasAnyRole(['hr', 'admin', 'super_admin'])
const hasFinanceRole = () => authStore.hasAnyRole(['finance', 'admin', 'super_admin'])

// ⚡ NEW: checks if a section should show based on demo filter
const isSectionAllowed = (section) => {
  if (demoRoleFilter.value === 'all') return true
  if (demoRoleFilter.value === 'management') return section === 'management'
  return section === demoRoleFilter.value
}

const hasSection = (section) => {
  if (!isSectionAllowed(section)) return false  // ⚡ filter applied
  const items = menuConfig[section]?.items || []
  return items.some(item => {
    if (item.roles) {
      return item.roles.some(role => authStore.hasAnyRole(role)) && authStore.hasModule(item.module)
    }
    return authStore.hasModule(item.module)
  })
}

const hasNextSection = (currentSection) => {
  const sections = ['management', 'hr', 'finance', 'supply_chain']
  const currentIndex = sections.indexOf(currentSection)
  for (let i = currentIndex + 1; i < sections.length; i++) {
    if (sections[i] === 'hr' && !hasHRRole()) continue
    if (sections[i] === 'finance' && !hasFinanceRole()) continue
    if (hasSection(sections[i])) return true
  }
  return false
}

const getMenuItems = (section) => {
  const items = menuConfig[section]?.items || []
  return items.filter(item => {
    if (item.roles) {
      return item.roles.some(role => authStore.hasAnyRole(role)) && authStore.hasModule(item.module)
    }
    return authStore.hasModule(item.module)
  })
}

const getHRMenuItems = () => {
  const items = menuConfig.hr?.items || []
  const isFinanceUser = hasFinanceRole()
  return items.filter(item => {
    if (isFinanceUser && SHARED_MODULES.includes(item.module)) return false
    return authStore.hasModule(item.module)
  })
}

const getFinanceMenuItems = () => {
  const items = menuConfig.finance?.items || []
  const isHRUser = hasHRRole()
  return items.filter(item => {
    if (isHRUser && SHARED_MODULES.includes(item.module)) return false
    return authStore.hasModule(item.module)
  })
}

// ============================================
// METHODS
// ============================================
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed.value))
}

const fetchUnreadCount = async () => {
  const userId = authStore.user?.id
  if (userId) await notifStore.fetch(userId, 5)
}

const handleLogout = async () => {
  const result = await Swal.fire({
    title: 'Logout?',
    text: 'Are you sure you want to logout?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Logout',
    cancelButtonText: 'Cancel'
  })

  if (result.isConfirmed) {
    authStore.logout()
    router.push('/login')
    Swal.fire({ icon: 'success', title: 'Logged Out', timer: 1000, showConfirmButton: false })
  }
}

// ============================================
// LIFECYCLE
// ============================================
let intervalId = null

onMounted(() => {
  const saved = localStorage.getItem('sidebarCollapsed')
  if (saved !== null) isCollapsed.value = JSON.parse(saved)

  // Listen for role preview changes
  window.addEventListener('demo-role-filter-changed', handleDemoFilterChange)

  fetchUnreadCount()
  intervalId = setInterval(fetchUnreadCount, 30000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  window.removeEventListener('demo-role-filter-changed', handleDemoFilterChange)
})
</script>

<style scoped>
/* ============================================
   BASE SIDEBAR
   ⚠️ Glass background is provided GLOBALLY by liquid-glass.css
   (the .sidebar and body.dark-mode .sidebar rules). We only set
   layout + non-theme styles here so the global glass wins.
============================================ */
.sidebar {
  width: 240px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;
  transition: width 0.3s ease;
  overflow: hidden;
  z-index: 100;
}

.sidebar.collapsed {
  width: 64px;
}

/* ============================================
   BRAND
============================================ */
.sidebar-brand {
  padding: 1rem 1rem;
  border-bottom: 1px solid var(--glass-border-light-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  flex-shrink: 0;
}

body.dark-mode .sidebar-brand {
  border-bottom-color: var(--glass-border-dark-soft);
}

.brand-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.brand-content i {
  font-size: 1.25rem;
  color: var(--primary, #4F46E5);
}

.brand-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-light, #1a1a2e);
  white-space: nowrap;
}

body.dark-mode .brand-text {
  color: #f1f5f9;
}

.version-badge {
  display: inline-block;
  background: var(--primary, #4F46E5);
  color: white;
  font-size: 0.5rem;
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-weight: 600;
  margin-left: 0.1rem;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: var(--text-muted, #6b7280);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 0.8rem;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.4);
  color: var(--text-light, #1a1a2e);
}

body.dark-mode .toggle-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

/* ============================================
   NAVIGATION
============================================ */
.sidebar-nav {
  padding: 0.5rem 0.5rem;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-nav::-webkit-scrollbar {
  width: 3px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--border-light, #e5e7eb);
  border-radius: 4px;
}

body.dark-mode .sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--border-dark, #374151);
}

.nav-section {
  margin-bottom: 0.25rem;
}

.nav-section-title {
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted, #6b7280);
  font-weight: 700;
  padding: 0.5rem 0.75rem;
  display: block;
  white-space: nowrap;
}

.nav-section-dot {
  display: none;
  color: var(--text-muted, #6b7280);
  text-align: center;
  font-size: 0.6rem;
  padding: 0.25rem 0;
}

.sidebar.collapsed .nav-section-title {
  display: none;
}

.sidebar.collapsed .nav-section-dot {
  display: block;
}

.nav-divider {
  height: 1px;
  background: var(--glass-border-light-soft, rgba(255, 255, 255, 0.4));
  margin: 0.25rem 0.75rem;
}

body.dark-mode .nav-divider {
  background: var(--glass-border-dark-soft, rgba(255, 255, 255, 0.08));
}

.sidebar-nav .nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  color: var(--text-muted, #6b7280);
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  position: relative;
}

.sidebar.collapsed .nav-link {
  justify-content: center;
  padding: 0.6rem;
}

.sidebar.collapsed .nav-link span {
  display: none;
}

.sidebar-nav .nav-link:hover {
  background: rgba(255, 255, 255, 0.5);
  color: var(--primary, #4F46E5);
}

body.dark-mode .sidebar-nav .nav-link:hover {
  background: rgba(124, 58, 237, 0.12);
  color: #c4b5fd;
}

.sidebar-nav .nav-link.active {
  background: linear-gradient(135deg, var(--primary, #4F46E5), var(--secondary, #7C3AED));
  color: white;
  box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3);
}

body.dark-mode .sidebar-nav .nav-link.active {
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.55);
}

.sidebar-nav .nav-link i {
  width: 1.1rem;
  text-align: center;
  font-size: 1rem;
  flex-shrink: 0;
}

/* Logout Link */
.logout-link {
  color: #ef4444 !important;
  margin-top: 0.25rem;
  border-top: 1px solid var(--glass-border-light-soft, rgba(255, 255, 255, 0.4));
  padding-top: 0.75rem;
}

body.dark-mode .logout-link {
  border-top-color: var(--glass-border-dark-soft, rgba(255, 255, 255, 0.08));
}

.logout-link:hover {
  background: rgba(254, 226, 226, 0.6) !important;
  color: #dc2626 !important;
}

body.dark-mode .logout-link:hover {
  background: rgba(127, 29, 29, 0.6) !important;
  color: #fca5a5 !important;
}

/* ============================================
   BADGES
============================================ */
.nav-badge {
  font-size: 0.55rem;
  padding: 0.1rem 0.4rem;
  border-radius: 50px;
  font-weight: 700;
  margin-left: auto;
  flex-shrink: 0;
  min-width: 16px;
  text-align: center;
  line-height: 1.4;
}

.badge-live {
  background: #10B981;
  color: white;
  animation: pulse 2s infinite;
}

.badge-auto {
  background: #8B5CF6;
  color: white;
}

.badge-notification {
  background: #EF4444 !important;
  color: white !important;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* ============================================
   FOOTER
============================================ */
.sidebar-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--glass-border-light-soft, rgba(255, 255, 255, 0.4));
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

body.dark-mode .sidebar-footer {
  border-top-color: var(--glass-border-dark-soft, rgba(255, 255, 255, 0.08));
}

.user-role-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.5);
  font-size: 0.7rem;
  font-weight: 600;
  width: 100%;
  transition: all 0.3s ease;
}

.sidebar.collapsed .user-role-badge {
  padding: 0.25rem;
}

.sidebar.collapsed .user-role-badge span {
  display: none;
}

body.dark-mode .user-role-badge {
  background: rgba(255, 255, 255, 0.06);
}

.sidebar-footer small {
  color: var(--text-muted, #6b7280);
  font-size: 0.65rem;
}

.sidebar.collapsed .sidebar-footer small {
  display: none;
}

/* ============================================
   RESPONSIVE
============================================ */
@media (max-width: 768px) {
  .sidebar {
    width: 64px;
  }

  .sidebar:not(.collapsed) {
    width: 240px;
    position: fixed;
    left: 0;
    top: 0;
    z-index: 1000;
  }

  .sidebar.collapsed .brand-text,
  .sidebar.collapsed .version-badge,
  .sidebar.collapsed .nav-link span,
  .sidebar.collapsed .nav-badge,
  .sidebar.collapsed .user-role-badge span,
  .sidebar.collapsed .sidebar-footer small {
    display: none;
  }

  .sidebar.collapsed .nav-section-title {
    display: none;
  }

  .sidebar.collapsed .nav-section-dot {
    display: block;
  }

  .sidebar:not(.collapsed) .toggle-btn {
    display: flex;
  }
}

@media (max-width: 480px) {
  .sidebar:not(.collapsed) {
    width: 100%;
    max-width: 280px;
  }
}
</style>