<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="container">
          <!-- Header -->
          <header class="page-header">
            <div>
              <h2><i class="fas fa-bell"></i> Notifications</h2>
              <p>Your personal notifications — only you can see these</p>
            </div>
            <div class="actions">
              <button
                v-if="hasUnread"
                @click="handleMarkAllRead"
                class="btn btn-primary"
              >
                <i class="fas fa-check-double"></i> Mark All Read
              </button>
              <button @click="handleRefresh" class="btn btn-outline" :disabled="loading">
                <i class="fas fa-sync" :class="{ spinning: loading }"></i>
              </button>
            </div>
          </header>

          <!-- Stats -->
          <div class="stats glass-panel">
            <div class="stat">
              <span>Total</span>
              <strong>{{ total }}</strong>
            </div>
            <div class="stat">
              <span>Unread</span>
              <strong class="text-warning">{{ unread }}</strong>
            </div>
            <div class="stat">
              <span>Read</span>
              <strong class="text-success">{{ read }}</strong>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters">
            <div class="search glass-input">
              <i class="fas fa-search"></i>
              <input
                v-model="search"
                placeholder="Search notifications..."
                @input="resetPage"
              />
              <button v-if="search" @click="search = ''" class="clear-btn">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <select v-model="typeFilter" class="filter-select glass-input" @change="resetPage">
              <option value="">All Types</option>
              <option value="attendance">Attendance</option>
              <option value="alert">Alerts</option>
              <option value="reminder">Reminders</option>
              <option value="leave">Leave</option>
              <option value="payroll">Payroll</option>
              <option value="salary">Salary</option>
              <option value="sale">Sales</option>
              <option value="product">Products</option>
              <option value="info">Info</option>
            </select>
            <select v-model="statusFilter" class="filter-select glass-input" @change="resetPage">
              <option value="">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>

          <!-- List -->
          <div class="list glass-panel">
            <div v-if="loading && !items.length" class="state-loading">
              <div class="spinner"></div>
              <span>Loading notifications...</span>
            </div>

            <div v-else-if="!paginated.length" class="state-empty">
              <i class="fas fa-bell-slash"></i>
              <p>No notifications</p>
              <span class="hint">{{ search || typeFilter || statusFilter ? 'Try changing the filters' : "You're all caught up!" }}</span>
            </div>

            <div
              v-for="item in paginated"
              :key="item.id"
              class="item"
              :class="{
                'unread': !item.is_read,
                [item.severity || 'info']: true
              }"
              @click="handleItemClick(item)"
            >
              <div class="item-icon" :class="item.severity || 'info'">
                <i :class="getIcon(item.type)"></i>
              </div>

              <div class="item-content">
                <div class="item-header">
                  <span class="item-title">{{ item.title }}</span>
                  <span class="item-time">{{ formatDate(item.created_at) }}</span>
                </div>
                <p class="item-message">{{ item.message }}</p>
                <div class="item-meta">
                  <span v-if="!item.is_read" class="badge-new">New</span>
                  <span class="badge-type" :class="item.type">
                    {{ (item.type || 'info').toUpperCase() }}
                  </span>
                </div>
              </div>

              <div class="item-actions">
                <button
                  v-if="!item.is_read"
                  @click.stop="handleMarkRead(item.id)"
                  class="action-btn mark"
                  title="Mark as read"
                >
                  <i class="fas fa-check-circle"></i>
                </button>
                <button
                  @click.stop="handleDelete(item.id)"
                  class="action-btn delete"
                  title="Delete"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="totalFiltered > 0" class="pagination glass-panel">
            <span class="pagination-info">
              Showing <strong>{{ startIndex }}</strong>–<strong>{{ endIndex }}</strong> of <strong>{{ totalFiltered }}</strong>
            </span>
            <div class="pagination-controls">
              <select v-model.number="pageSize" class="page-size-select" @change="resetPage">
                <option :value="10">10 / page</option>
                <option :value="15">15 / page</option>
                <option :value="25">25 / page</option>
                <option :value="50">50 / page</option>
              </select>
              <button @click="page--" :disabled="page === 1" class="page-btn">
                <i class="fas fa-chevron-left"></i>
              </button>
              <span class="page-current">{{ page }} / {{ totalPages }}</span>
              <button @click="page++" :disabled="page >= totalPages" class="page-btn">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useHRNotificationsStore } from '@/stores/hrNotifications'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import Swal from 'sweetalert2'

// ============================================
// STORES
// ============================================
const authStore = useAuthStore()
const notifStore = useHRNotificationsStore()

// ============================================
// STATE
// ============================================
const loading = ref(false)
const search = ref('')
const typeFilter = ref('')
const statusFilter = ref('')
const page = ref(1)
const pageSize = ref(15)

// ============================================
// COMPUTED
// ============================================
const items = computed(() => notifStore.items)
const unreadCount = computed(() => notifStore.unreadCount)

const total = computed(() => items.value.length)
const unread = computed(() => unreadCount.value)
const read = computed(() => total.value - unread.value)

const filtered = computed(() => {
  let result = items.value

  if (search.value) {
    const q = search.value.toLowerCase()
    result = result.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.message || '').toLowerCase().includes(q)
    )
  }

  if (typeFilter.value) {
    result = result.filter(n => n.type === typeFilter.value)
  }

  if (statusFilter.value === 'unread') {
    result = result.filter(n => !n.is_read)
  } else if (statusFilter.value === 'read') {
    result = result.filter(n => n.is_read)
  }

  return result
})

const totalFiltered = computed(() => filtered.value.length)

const totalPages = computed(() => Math.max(1, Math.ceil(totalFiltered.value / pageSize.value)))

const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const startIndex = computed(() => totalFiltered.value === 0 ? 0 : (page.value - 1) * pageSize.value + 1)
const endIndex = computed(() => Math.min(page.value * pageSize.value, totalFiltered.value))

const hasUnread = computed(() => unread.value > 0)

// ============================================
// METHODS
// ============================================
const getIcon = (type = 'info') => {
  const map = {
    attendance: 'fas fa-clock',
    alert: 'fas fa-exclamation-triangle',
    reminder: 'fas fa-bell',
    leave: 'fas fa-calendar-alt',
    payroll: 'fas fa-wallet',
    salary: 'fas fa-money-bill-wave',
    sale: 'fas fa-shopping-cart',
    product: 'fas fa-box',
    success: 'fas fa-check-circle',
    warning: 'fas fa-exclamation-circle',
    error: 'fas fa-times-circle',
    info: 'fas fa-info-circle'
  }
  return map[type] || 'fas fa-bell'
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'N/A'

  const now = new Date()
  const diff = Math.floor((now - d) / 1000)

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`

  return d.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchData = async () => {
  loading.value = true
  try {
    // JWT identifies the user — no need to pass userId
    await notifStore.fetch(100)
  } catch (err) {
    console.error('[HR Notifications] Fetch error:', err)
  } finally {
    loading.value = false
  }
}

const handleMarkRead = async (id) => {
  try { await notifStore.markRead(id) } catch (e) { console.error(e) }
}

const handleMarkAllRead = async () => {
  const result = await Swal.fire({
    title: 'Mark All Read?',
    text: `Mark all ${unread.value} notifications as read?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#4F46E5',
    confirmButtonText: 'Yes',
    cancelButtonText: 'Cancel'
  })

  if (result.isConfirmed) {
    try {
      await notifStore.markAllRead()
      await fetchData()
    } catch (e) { console.error(e) }
  }
}

const handleDelete = async (id) => {
  const result = await Swal.fire({
    title: 'Delete Notification?',
    text: 'This cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel'
  })

  if (result.isConfirmed) {
    try { await notifStore.remove(id) } catch (e) { console.error(e) }
  }
}

const handleItemClick = async (item) => {
  if (!item.is_read) await handleMarkRead(item.id)
}

const handleRefresh = async () => {
  await fetchData()
}

const resetPage = () => {
  page.value = 1
}

// ============================================
// LIFECYCLE
// ============================================
onMounted(fetchData)
</script>

<style scoped>
/* ============================================
   LAYOUT — transparent (body shows gradient)
   ============================================ */
.app-layout {
  display: flex;
  min-height: 100vh;
  background: transparent;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.page-content {
  flex: 1;
  padding: 1.5rem;
  background: transparent;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

/* ============================================
   HEADER
   ============================================ */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.page-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-header h2 i {
  color: #4f46e5;
}

.page-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
}

body.dark-mode .page-header h2 { color: #f1f5f9; }
body.dark-mode .page-header h2 i { color: #a78bfa; }
body.dark-mode .page-header p { color: #94a3b8; }

.actions { display: flex; gap: 0.5rem; }

/* ============================================
   BUTTONS
   ============================================ */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  box-shadow: 0 4px 16px rgba(79, 70, 229, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.45);
}

body.dark-mode .btn-primary {
  box-shadow: 0 4px 20px rgba(124, 58, 237, 0.45);
}

.btn-outline {
  background: rgba(255, 255, 255, 0.55);
  color: #374151;
  border: 1px solid rgba(255, 255, 255, 0.7);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
}

.btn-outline:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.75);
  border-color: #d1d5db;
}

body.dark-mode .btn-outline {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border-color: rgba(167, 139, 250, 0.2);
}

body.dark-mode .btn-outline:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.15);
  border-color: rgba(167, 139, 250, 0.4);
}

.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ============================================
   STATS — Glass panel
   ============================================ */
.stats {
  display: flex;
  gap: 2rem;
  padding: 0.9rem 1.25rem;
  border-radius: 14px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat span {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

body.dark-mode .stat span { color: #94a3b8; }

.stat strong {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
}

body.dark-mode .stat strong { color: #f1f5f9; }

.text-warning { color: #f59e0b !important; }
.text-success { color: #10b981 !important; }

/* ============================================
   FILTERS
   ============================================ */
.filters {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.9rem;
  border-radius: 12px;
  flex: 1;
  min-width: 220px;
  max-width: 420px;
  transition: all 0.2s ease;
}

.search i {
  color: #9ca3af;
  margin-right: 0.5rem;
  font-size: 0.85rem;
}

.search input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-size: 0.9rem;
  color: #1f2937;
}

body.dark-mode .search input { color: #e2e8f0; }

.search input::placeholder { color: #9ca3af; }

.clear-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  transition: all 0.15s;
}

.clear-btn:hover {
  color: #4f46e5;
  background: rgba(79, 70, 229, 0.1);
}

body.dark-mode .clear-btn:hover {
  color: #a78bfa;
  background: rgba(124, 58, 237, 0.2);
}

.filter-select {
  padding: 0.5rem 0.9rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #1f2937;
  cursor: pointer;
  min-width: 130px;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.9rem center;
  padding-right: 2.2rem;
}

body.dark-mode .filter-select {
  color: #e2e8f0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a78bfa' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
}

/* ============================================
   GLASS INPUT WRAPPER
   ============================================ */
.glass-input,
.search,
.filter-select {
  background: rgba(255, 255, 255, 0.6);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 2px 12px rgba(31, 38, 135, 0.05);
}

.search:focus-within,
.filter-select:focus {
  border-color: rgba(79, 70, 229, 0.5);
  box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.12);
}

body.dark-mode .glass-input,
body.dark-mode .search,
body.dark-mode .filter-select {
  background: rgba(26, 22, 48, 0.55);
  border: 1px solid rgba(167, 139, 250, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
}

body.dark-mode .search:focus-within,
body.dark-mode .filter-select:focus {
  border-color: rgba(167, 139, 250, 0.5);
  box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2);
}

/* ============================================
   LIST — Glass panel
   ============================================ */
.list {
  border-radius: 14px;
  overflow: hidden;
}

.item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: background 0.15s ease;
}

body.dark-mode .item {
  border-bottom-color: rgba(167, 139, 250, 0.08);
}

.item:last-child { border-bottom: none; }

.item:hover {
  background: rgba(255, 255, 255, 0.35);
}

body.dark-mode .item:hover {
  background: rgba(124, 58, 237, 0.08);
}

.item.unread {
  background: rgba(79, 70, 229, 0.06);
  border-left: 3px solid #4f46e5;
}

body.dark-mode .item.unread {
  background: rgba(124, 58, 237, 0.12);
  border-left-color: #a78bfa;
}

.item-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.item:hover .item-icon {
  transform: scale(1.05);
}

.item-icon.success { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #059669; }
.item-icon.info    { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4f46e5; }
.item-icon.warning { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
.item-icon.error   { background: linear-gradient(135deg, #fee2e2, #fecaca); color: #dc2626; }

body.dark-mode .item-icon.success {
  background: linear-gradient(135deg, rgba(16,185,129,0.25), rgba(5,150,105,0.15));
  color: #34d399;
}
body.dark-mode .item-icon.info {
  background: linear-gradient(135deg, rgba(124,58,237,0.25), rgba(79,70,229,0.15));
  color: #a78bfa;
}
body.dark-mode .item-icon.warning {
  background: linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.15));
  color: #fbbf24;
}
body.dark-mode .item-icon.error {
  background: linear-gradient(135deg, rgba(239,68,68,0.25), rgba(220,38,38,0.15));
  color: #f87171;
}

.item-content { flex: 1; min-width: 0; }

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  gap: 0.75rem;
}

.item-title {
  font-weight: 600;
  color: #1a1a2e;
  font-size: 0.95rem;
  word-break: break-word;
}

body.dark-mode .item-title { color: #f1f5f9; }

.item-time {
  font-size: 0.7rem;
  color: #9ca3af;
  flex-shrink: 0;
  white-space: nowrap;
}

.item-message {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
  word-break: break-word;
}

body.dark-mode .item-message { color: #94a3b8; }

.item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.badge-new {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  font-size: 0.6rem;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.badge-type {
  font-size: 0.6rem;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  background: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

body.dark-mode .badge-type {
  background: rgba(148, 163, 184, 0.15);
  color: #cbd5e1;
}

.badge-type.attendance { background: rgba(79, 70, 229, 0.15); color: #4f46e5; }
.badge-type.alert      { background: rgba(239, 68, 68, 0.15); color: #dc2626; }
.badge-type.payroll,
.badge-type.salary     { background: rgba(16, 185, 129, 0.15); color: #059669; }
.badge-type.leave      { background: rgba(245, 158, 11, 0.15); color: #d97706; }
.badge-type.sale       { background: rgba(59, 130, 246, 0.15); color: #2563eb; }
.badge-type.product    { background: rgba(168, 85, 247, 0.15); color: #9333ea; }

body.dark-mode .badge-type.attendance { background: rgba(124, 58, 237, 0.2); color: #a78bfa; }
body.dark-mode .badge-type.alert      { background: rgba(239, 68, 68, 0.2); color: #f87171; }
body.dark-mode .badge-type.payroll,
body.dark-mode .badge-type.salary     { background: rgba(16, 185, 129, 0.2); color: #34d399; }
body.dark-mode .badge-type.leave      { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
body.dark-mode .badge-type.sale       { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
body.dark-mode .badge-type.product    { background: rgba(168, 85, 247, 0.2); color: #c084fc; }

.item-actions {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}

.item:hover .item-actions { opacity: 1; }

.action-btn {
  background: none;
  border: none;
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  color: #9ca3af;
  transition: all 0.15s ease;
  font-size: 0.9rem;
}

.action-btn:hover { background: rgba(255, 255, 255, 0.6); }
body.dark-mode .action-btn:hover { background: rgba(255, 255, 255, 0.08); }

.action-btn.mark:hover { color: #4f46e5; }
.action-btn.delete:hover { color: #ef4444; }
body.dark-mode .action-btn.mark:hover { color: #a78bfa; }
body.dark-mode .action-btn.delete:hover { color: #f87171; }

/* ============================================
   STATES
   ============================================ */
.state-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 1rem;
  color: #6b7280;
  gap: 0.75rem;
}

body.dark-mode .state-loading { color: #94a3b8; }

.state-loading .spinner {
  width: 34px;
  height: 34px;
  border: 3px solid rgba(79, 70, 229, 0.15);
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

body.dark-mode .state-loading .spinner {
  border-color: rgba(167, 139, 250, 0.2);
  border-top-color: #a78bfa;
}

.state-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

body.dark-mode .state-empty { color: #94a3b8; }

.state-empty i {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.75rem;
  color: #d1d5db;
}

body.dark-mode .state-empty i { color: #475569; }

.state-empty p {
  font-weight: 600;
  font-size: 1rem;
  margin: 0 0 0.25rem 0;
}

.hint {
  font-size: 0.8rem;
  color: #9ca3af;
  display: block;
}

/* ============================================
   PAGINATION
   ============================================ */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  margin-top: 1rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.pagination-info {
  font-size: 0.85rem;
  color: #6b7280;
}

.pagination-info strong { color: #1f2937; font-weight: 600; }

body.dark-mode .pagination-info { color: #94a3b8; }
body.dark-mode .pagination-info strong { color: #f1f5f9; }

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-size-select {
  padding: 0.35rem 0.7rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 500;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.75);
  cursor: pointer;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

body.dark-mode .page-size-select {
  background: rgba(26, 22, 48, 0.55);
  border-color: rgba(167, 139, 250, 0.2);
  color: #e2e8f0;
}

.page-btn {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 0.35rem 0.65rem;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s ease;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}

body.dark-mode .page-btn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2);
  color: #cbd5e1;
}

.page-btn:hover:not(:disabled) {
  background: rgba(79, 70, 229, 0.1);
  border-color: #4f46e5;
  color: #4f46e5;
}

body.dark-mode .page-btn:hover:not(:disabled) {
  background: rgba(124, 58, 237, 0.2);
  border-color: #a78bfa;
  color: #a78bfa;
}

.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.page-current {
  font-weight: 600;
  color: #1a1a2e;
  min-width: 60px;
  text-align: center;
  font-size: 0.85rem;
}

body.dark-mode .page-current { color: #f1f5f9; }

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .page-content { padding: 1rem; }

  .page-header { flex-direction: column; align-items: flex-start; }

  .actions { width: 100%; }
  .actions .btn { flex: 1; justify-content: center; }

  .filters { flex-direction: column; }
  .search { max-width: 100%; }
  .filter-select { width: 100%; }

  .stats { flex-direction: column; gap: 0.5rem; }

  .item { flex-wrap: wrap; }

  .item-header { flex-direction: column; align-items: flex-start; gap: 0.25rem; }
  .item-time { font-size: 0.7rem; }

  .item-actions {
    width: 100%;
    justify-content: flex-end;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    opacity: 1;
  }

  body.dark-mode .item-actions {
    border-top-color: rgba(167, 139, 250, 0.1);
  }

  .pagination { flex-direction: column; text-align: center; }
}
</style>