<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <h2><i class="fas fa-store"></i>Smart POS</h2>
      <span class="version-badge">v1.3</span>
    </div>
    
    <nav class="sidebar-nav">
      <div class="nav-section">
        <span class="nav-section-title">Finance</span>
        <router-link
          v-for="item in financeMenu"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          active-class="active"
        >
          <i :class="item.icon"></i>
          <span>{{ item.label }}</span>
        </router-link>
      </div>
    </nav>
    
    <div class="sidebar-footer">
      <small>Smart POS v1.3</small>
    </div>
  </aside>
</template>

<script setup>
const authStore = useAuthStore()
// Delete the role checking code because we only want Finance menu here
// Finance Menu
const financeMenu = [
  { path: '/finance/dashboard', label: 'Dashboard', icon: 'fas fa-chart-pie' },
  { path: '/finance/transactions', label: 'Transactions', icon: 'fas fa-exchange-alt' },
  { path: '/finance/wallet', label: 'Wallet', icon: 'fas fa-wallet' },
  { path: '/finance/goals', label: 'Goals', icon: 'fas fa-bullseye' },
  { path: '/finance/budget', label: 'Budget', icon: 'fas fa-file-invoice-dollar' },
  { path: '/finance/requests', label: 'Budget Requests', icon: 'fas fa-clipboard-list' },
  { path: '/finance/reports', label: 'Reports', icon: 'fas fa-file-invoice-dollar' }
]
</script>

<style scoped>
/* Copy the same CSS from your original Sidebar.vue here */
.sidebar {
  width: 240px;
  background: white;
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 4px 0 20px rgba(0,0,0,0.03);
  height: 100vh;
  position: sticky;
  top: 0;
}
body.dark-mode .sidebar { background: var(--bg-card); border-right-color: var(--border-dark); }
.sidebar-brand { padding: 1.5rem 1rem; border-bottom: 1px solid var(--border-light); text-align: center; }
body.dark-mode .sidebar-brand { border-bottom-color: var(--border-dark); }
.sidebar-brand h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-light); margin: 0; }
body.dark-mode .sidebar-brand h2 { color: white; }
.sidebar-brand i { margin-right: 0.5rem; color: var(--primary); }
.version-badge { display: inline-block; background: var(--primary); color: white; font-size: 0.5rem; padding: 0.125rem 0.5rem; border-radius: 10px; font-weight: 600; margin-left: 0.25rem; vertical-align: middle; }
.sidebar-nav { padding: 1rem 0.75rem; flex: 1; overflow-y: auto; }
.nav-section { margin-bottom: 0.5rem; }
.nav-section-title { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-weight: 700; padding: 0.5rem 0.75rem; display: block; }
.sidebar-nav .nav-link { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 12px; color: var(--text-muted); font-weight: 500; text-decoration: none; transition: all 0.2s ease; }
.sidebar-nav .nav-link:hover { background: var(--bg-light); color: var(--primary); }
body.dark-mode .sidebar-nav .nav-link:hover { background: rgba(255,255,255,0.05); color: white; }
.sidebar-nav .nav-link.active { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; box-shadow: 0 4px 15px rgba(79,70,229,0.3); }
.sidebar-nav .nav-link i { width: 1.25rem; text-align: center; font-size: 1.1rem; }
.sidebar-footer { padding: 1rem; border-top: 1px solid var(--border-light); text-align: center; flex-shrink: 0; }
body.dark-mode .sidebar-footer { border-top-color: var(--border-dark); }
.sidebar-footer small { color: var(--text-muted); font-size: 0.75rem; }
</style>