<template>
  <div class="supply-chain-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <div>
        <h2><i class="fas fa-truck"></i> Supply Chain Dashboard</h2>
        <p>Monitor and manage your supply chain operations</p>
      </div>
      <div class="header-actions">
        <button @click="refreshData" class="btn-refresh">
          <i class="fas fa-sync" :class="{ spinning: loading }"></i> Refresh
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card" style="border-left: 4px solid #4F46E5;">
        <div class="stat-icon" style="background: #e0e7ff; color: #4F46E5;">
          <i class="fas fa-building"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">Total Suppliers</p>
          <p class="stat-value">{{ stats.totalSuppliers }}</p>
        </div>
      </div>
      <div class="stat-card" style="border-left: 4px solid #F59E0B;">
        <div class="stat-icon" style="background: #fef3c7; color: #f59e0b;">
          <i class="fas fa-clock"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">Pending Orders</p>
          <p class="stat-value">{{ stats.pendingOrders }}</p>
        </div>
      </div>
      <div class="stat-card" style="border-left: 4px solid #10B981;">
        <div class="stat-icon" style="background: #d1fae5; color: #10b981;">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">Orders Received</p>
          <p class="stat-value">{{ stats.receivedOrders }}</p>
        </div>
      </div>
      <div class="stat-card" style="border-left: 4px solid #EF4444;">
        <div class="stat-icon" style="background: #fee2e2; color: #ef4444;">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="stat-info">
          <p class="stat-label">Low Stock Items</p>
          <p class="stat-value">{{ stats.lowStockCount }}</p>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="quick-actions">
      <div class="action-card" @click="$router.push('/supply-chain/suppliers')">
        <i class="fas fa-truck"></i>
        <span>Manage Suppliers</span>
      </div>
      <div class="action-card" @click="$router.push('/supply-chain/purchase-orders')">
        <i class="fas fa-file-invoice"></i>
        <span>View Orders</span>
      </div>
      <div class="action-card" @click="checkLowStock">
        <i class="fas fa-bell"></i>
        <span>Check Stock Alerts</span>
      </div>
      <div class="action-card" @click="$router.push('/supply-chain/inventory')">
        <i class="fas fa-boxes"></i>
        <span>Inventory</span>
      </div>
    </div>

    <!-- Recent Orders -->
    <div class="recent-orders">
      <div class="section-header">
        <h3>Recent Purchase Orders</h3>
        <button class="btn-view-all" @click="$router.push('/supply-chain/purchase-orders')">
          View All <i class="fas fa-arrow-right"></i>
        </button>
      </div>
      <div class="table-wrapper">
        <table class="orders-table">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Product</th>
              <th>Supplier</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="text-center">Loading...</td>
            </tr>
            <tr v-else-if="recentOrders.length === 0">
              <td colspan="7" class="text-center">No purchase orders found</td>
            </tr>
            <tr v-for="order in recentOrders" :key="order.id">
              <td><strong>{{ order.po_number }}</strong></td>
              <td>{{ order.product_name || 'N/A' }}</td>
              <td>{{ order.supplier_name || 'N/A' }}</td>
              <td>{{ order.quantity }}</td>
              <td>₱{{ formatPrice(order.total_cost) }}</td>
              <td>
                <span :class="getOrderStatusClass(order.status)">
                  {{ (order.status || 'draft').toUpperCase() }}
                </span>
              </td>
              <td>
                <button v-if="order.status === 'ordered' || order.status === 'shipped'"
                        @click="receiveOrder(order.id)"
                        class="btn-receive"
                        title="Receive Order">
                  <i class="fas fa-box"></i> Receive
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Notifications -->
    <div class="notifications-section">
      <div class="section-header">
        <h3><i class="fas fa-bell"></i> Notifications</h3>
        <span class="badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
        <button v-if="unreadCount > 0" @click="markAllRead" class="mark-all-btn">Mark all read</button>
      </div>
      <div class="notifications-list">
        <div v-if="notifications.length === 0" class="empty-state">
          <i class="fas fa-bell-slash"></i>
          <p>No notifications</p>
        </div>
        <div v-for="notification in notifications.slice(0, 5)"
             :key="notification.id"
             class="notification-item"
             :class="{ unread: !notification.is_read }"
             @click="markAsRead(notification.id)">
          <div class="notification-icon" :class="notification.severity || 'info'">
            <i :class="getNotificationIcon(notification.type)"></i>
          </div>
          <div class="notification-content">
            <p class="notification-title">{{ notification.title || 'Notification' }}</p>
            <p class="notification-message">{{ notification.message }}</p>
            <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { useAuthStore } from '@/stores/auth'
import Swal from 'sweetalert2'

const router = useRouter()
const supplyChainStore = useSupplyChainStore()
const authStore = useAuthStore()

const loading = ref(false)

// Computed — safe against null
const stats = computed(() => supplyChainStore.stats || {
  totalSuppliers: 0, pendingOrders: 0, receivedOrders: 0, lowStockCount: 0
})

const notifications = computed(() => {
  const n = supplyChainStore.notifications
  return Array.isArray(n) ? n : []
})

const recentOrders = computed(() => {
  const po = supplyChainStore.purchaseOrders
  return Array.isArray(po) ? po.slice(0, 10) : []
})

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.is_read).length
})

// Methods
const formatPrice = (amount) => {
  return Number(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const getOrderStatusClass = (status) => {
  const classes = {
    draft: 'status-draft',
    ordered: 'status-ordered',
    shipped: 'status-shipped',
    received: 'status-received',
    cancelled: 'status-cancelled'
  }
  return classes[status] || 'status-draft'
}

const getNotificationIcon = (type) => {
  const icons = {
    supplier_unavailable: 'fas fa-exclamation-triangle',
    purchase_order_created: 'fas fa-file-invoice',
    order_received: 'fas fa-check-circle',
    low_stock: 'fas fa-bell',
    budget_approved: 'fas fa-check',
    budget_rejected: 'fas fa-times',
    success: 'fas fa-check-circle',
    info: 'fas fa-info-circle',
    warning: 'fas fa-exclamation-triangle'
  }
  return icons[type] || 'fas fa-info-circle'
}

const formatTime = (date) => {
  if (!date) return 'Just now'
  const diff = Math.floor((new Date() - new Date(date)) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  return Math.floor(diff / 86400) + 'd ago'
}

// ✅ Resilient refresh — one failing API no longer breaks the whole page
const refreshData = async () => {
  loading.value = true
  try {
    const userId = authStore.user?.id
    const results = await Promise.allSettled([
      supplyChainStore.loadSuppliers(),
      supplyChainStore.loadPurchaseOrders(),
      userId ? supplyChainStore.loadNotifications(userId) : Promise.resolve([])
    ])
    // Log failures but don't crash
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        console.warn(`Dashboard refresh task ${i} failed:`, r.reason?.message || r.reason)
      }
    })
  } finally {
    loading.value = false
  }
}

const receiveOrder = async (orderId) => {
  const result = await Swal.fire({
    title: 'Receive Order?',
    text: 'Are you sure you want to mark this order as received?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Receive',
    cancelButtonText: 'Cancel'
  })

  if (result.isConfirmed) {
    try {
      await supplyChainStore.receiveOrder(orderId)
      await Swal.fire({
        icon: 'success',
        title: 'Order Received',
        text: 'Inventory has been updated!',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      })
      await refreshData()
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to receive order',
        confirmButtonColor: '#4F46E5'
      })
    }
  }
}

const checkLowStock = async () => {
  await supplyChainStore.checkLowStock()
  await Swal.fire({
    icon: 'info',
    title: 'Stock Check Complete',
    text: 'Low stock items have been checked. Requests have been created for items below threshold.',
    confirmButtonColor: '#4F46E5'
  })
  await refreshData()
}

const markAsRead = async (id) => {
  try {
    await supplyChainStore.markNotificationRead(id)
  } catch (e) {
    console.warn('markAsRead failed:', e.message)
  }
}

const markAllRead = async () => {
  try {
    if (typeof supplyChainStore.markAllNotificationsRead === 'function') {
      await supplyChainStore.markAllNotificationsRead()
    } else {
      // Fallback: mark each unread one
      const unread = notifications.value.filter(n => !n.is_read)
      for (const n of unread) {
        await supplyChainStore.markNotificationRead(n.id)
      }
    }
  } catch (e) {
    console.warn('markAllRead failed:', e.message)
  }
}

// Lifecycle
onMounted(refreshData)
</script>

<style scoped>
.supply-chain-dashboard {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.dashboard-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.dashboard-header h2 i {
  color: #4F46E5;
}

.dashboard-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .dashboard-header h2 {
  color: #e2e8f0;
}

body.dark-mode .dashboard-header p {
  color: #9ca3af;
}

.btn-refresh {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

body.dark-mode .stat-card {
  background: #1e293b;
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0.1rem 0 0 0;
}

body.dark-mode .stat-label {
  color: #9ca3af;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .stat-value {
  color: #e2e8f0;
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.action-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

body.dark-mode .action-card {
  background: #1e293b;
}

.action-card:hover {
  border-color: #4F46E5;
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.action-card i {
  font-size: 1.8rem;
  color: #4F46E5;
  margin-bottom: 0.5rem;
}

.action-card span {
  font-size: 0.9rem;
  font-weight: 500;
  color: #1a1a2e;
}

body.dark-mode .action-card span {
  color: #e2e8f0;
}

/* Recent Orders */
.recent-orders {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

body.dark-mode .recent-orders {
  background: #1e293b;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;
}

.section-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .section-header h3 {
  color: #e2e8f0;
}

.btn-view-all {
  background: none;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
}

.btn-view-all:hover {
  color: #4338CA;
}

.table-wrapper {
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.orders-table th {
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .orders-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.orders-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .orders-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.orders-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .orders-table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

/* Status Badges */
.status-draft {
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-ordered {
  background: #fef3c7;
  color: #92400e;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-shipped {
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-received {
  background: #d1fae5;
  color: #065f46;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
}

.status-cancelled {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
}

body.dark-mode .status-draft {
  background: #374151;
  color: #9ca3af;
}

body.dark-mode .status-ordered {
  background: #78350f;
  color: #fcd34d;
}

body.dark-mode .status-shipped {
  background: #312e81;
  color: #a5b4fc;
}

body.dark-mode .status-received {
  background: #064e3b;
  color: #6ee7b7;
}

body.dark-mode .status-cancelled {
  background: #7f1d1d;
  color: #fca5a5;
}

.btn-receive {
  background: #10B981;
  color: white;
  border: none;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  transition: all 0.2s;
}

.btn-receive:hover {
  background: #059669;
}

/* Notifications */
.notifications-section {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .notifications-section {
  background: #1e293b;
}

.notifications-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.6rem 0.5rem;
  border-radius: 8px;
  transition: background 0.2s;
  cursor: pointer;
}

.notification-item:hover {
  background: #f9fafb;
}

body.dark-mode .notification-item:hover {
  background: #2d3748;
}

.notification-item.unread {
  background: rgba(79,70,229,0.05);
}

body.dark-mode .notification-item.unread {
  background: rgba(79,70,229,0.15);
}

.notification-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.notification-icon.success {
  background: #d1fae5;
  color: #10b981;
}

.notification-icon.info {
  background: #e0e7ff;
  color: #4F46E5;
}

.notification-icon.warning {
  background: #fef3c7;
  color: #f59e0b;
}

.notification-icon.error {
  background: #fee2e2;
  color: #ef4444;
}

body.dark-mode .notification-icon.success {
  background: #064e3b;
}

body.dark-mode .notification-icon.info {
  background: #312e81;
}

body.dark-mode .notification-icon.warning {
  background: #78350f;
}

body.dark-mode .notification-icon.error {
  background: #7f1d1d;
}

.notification-content {
  flex: 1;
}

.notification-title {
  font-weight: 600;
  font-size: 0.85rem;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .notification-title {
  color: #e2e8f0;
}

.notification-message {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0.2rem 0 0 0;
}

body.dark-mode .notification-message {
  color: #9ca3af;
}

.notification-time {
  font-size: 0.65rem;
  color: #9ca3af;
}

.empty-state {
  text-align: center;
  padding: 1.5rem 0;
  color: #6b7280;
}

.empty-state i {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.badge {
  background: #EF4444;
  color: white;
  padding: 0.1rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 700;
}

.mark-all-btn {
  background: none;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  font-size: 0.75rem;
}

.mark-all-btn:hover {
  text-decoration: underline;
}

/* Responsive */
@media (max-width: 768px) {
  .supply-chain-dashboard {
    padding: 1rem;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .quick-actions {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .quick-actions {
    grid-template-columns: 1fr;
  }
}
</style>