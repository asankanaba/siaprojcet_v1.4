<template>
  <div class="notifications-container">
    <div class="page-header">
      <div>
        <h2><i class="fas fa-bell"></i> Notifications</h2>
        <p>All supply chain notifications</p>
      </div>
      <div class="header-actions">
        <button v-if="unreadCount > 0" @click="markAllRead" class="btn-primary">
          <i class="fas fa-check-double"></i> Mark All Read
        </button>
        <button @click="refreshData" class="btn-secondary">
          <i class="fas fa-sync" :class="{ spinning: loading }"></i>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-item">
        <span>Total</span>
        <strong>{{ notifications.length }}</strong>
      </div>
      <div class="stat-item">
        <span>Unread</span>
        <strong class="text-warning">{{ unreadCount }}</strong>
      </div>
      <div class="stat-item">
        <span>Read</span>
        <strong class="text-success">{{ notifications.length - unreadCount }}</strong>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-row">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input v-model="searchQuery" placeholder="Search notifications..." @input="filterNotifications" />
      </div>
      <select v-model="typeFilter" class="filter-select" @change="filterNotifications">
        <option value="">All Types</option>
        <option value="purchase_order_created">Purchase Orders</option>
        <option value="order_received">Order Received</option>
        <option value="low_stock">Low Stock</option>
        <option value="supplier_unavailable">Supplier Issues</option>
        <option value="budget_approved">Budget Approved</option>
        <option value="budget_rejected">Budget Rejected</option>
      </select>
      <select v-model="readFilter" class="filter-select" @change="filterNotifications">
        <option value="">All</option>
        <option value="unread">Unread</option>
        <option value="read">Read</option>
      </select>
    </div>

    <!-- Notifications List -->
    <div class="notifications-list">
      <div v-if="loading" class="text-center">Loading...</div>
      <div v-else-if="filteredNotifications.length === 0" class="empty-state">
        <i class="fas fa-bell-slash"></i>
        <p>No notifications found</p>
      </div>
      <div v-for="notification in filteredNotifications" 
           :key="notification.id" 
           class="notification-item"
           :class="{ unread: !notification.is_read }"
           @click="markAsRead(notification.id)">
        <div class="notification-icon" :class="notification.severity">
          <i :class="getIcon(notification.type)"></i>
        </div>
        <div class="notification-content">
          <div class="notification-header">
            <span class="notification-title">{{ notification.title }}</span>
            <span class="notification-time">{{ formatTime(notification.created_at) }}</span>
          </div>
          <p class="notification-message">{{ notification.message }}</p>
          <span v-if="!notification.is_read" class="unread-badge">New</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import Swal from 'sweetalert2'

const supplyChainStore = useSupplyChainStore()

const loading = ref(false)
const searchQuery = ref('')
const typeFilter = ref('')
const readFilter = ref('')

// Computed
const notifications = computed(() => supplyChainStore.notifications)

const unreadCount = computed(() => {
  return notifications.value.filter(n => !n.is_read).length
})

const filteredNotifications = computed(() => {
  let result = notifications.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(n => 
      n.title.toLowerCase().includes(query) ||
      n.message.toLowerCase().includes(query)
    )
  }
  
  if (typeFilter.value) {
    result = result.filter(n => n.type === typeFilter.value)
  }
  
  if (readFilter.value === 'unread') {
    result = result.filter(n => !n.is_read)
  } else if (readFilter.value === 'read') {
    result = result.filter(n => n.is_read)
  }
  
  return result
})

// Methods
const getIcon = (type) => {
  const icons = {
    purchase_order_created: 'fas fa-file-invoice',
    order_received: 'fas fa-check-circle',
    low_stock: 'fas fa-bell',
    supplier_unavailable: 'fas fa-exclamation-triangle',
    budget_approved: 'fas fa-check',
    budget_rejected: 'fas fa-times'
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

const refreshData = async () => {
  loading.value = true
  await supplyChainStore.loadNotifications()
  loading.value = false
}

const filterNotifications = () => {
  // Computed handles filtering
}

const markAsRead = async (id) => {
  await supplyChainStore.markNotificationRead(id)
}

const markAllRead = async () => {
  const result = await Swal.fire({
    title: 'Mark All Read?',
    text: `Mark all ${unreadCount.value} notifications as read?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#4F46E5',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Mark All',
    cancelButtonText: 'Cancel'
  })
  
  if (result.isConfirmed) {
    await supplyChainStore.markAllNotificationsRead()
    await refreshData()
  }
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.notifications-container {
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
}

/* Reuse styles from other components */
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
}

.page-header h2 i {
  color: #4F46E5;
}

.page-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .page-header h2 {
  color: #e2e8f0;
}

body.dark-mode .page-header p {
  color: #9ca3af;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary {
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

.btn-primary:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}

.btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

body.dark-mode .btn-secondary {
  background: #2d3748;
  color: #9ca3af;
}

body.dark-mode .btn-secondary:hover {
  background: #374151;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stats-row {
  display: flex;
  gap: 2rem;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 10px;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  flex-wrap: wrap;
}

body.dark-mode .stats-row {
  background: #1e293b;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat-item span {
  font-size: 0.8rem;
  color: #6b7280;
}

body.dark-mode .stat-item span {
  color: #9ca3af;
}

.stat-item strong {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
}

body.dark-mode .stat-item strong {
  color: #e2e8f0;
}

.text-warning {
  color: #f59e0b !important;
}

.text-success {
  color: #10b981 !important;
}

.filters-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  border: 2px solid #e5e7eb;
  flex: 1;
  min-width: 200px;
  max-width: 400px;
  transition: border-color 0.2s;
}

body.dark-mode .search-box {
  background: #1e293b;
  border-color: #374151;
}

.search-box:focus-within {
  border-color: #4F46E5;
}

.search-box i {
  color: #6b7280;
  margin-right: 0.5rem;
}

body.dark-mode .search-box i {
  color: #9ca3af;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-size: 0.9rem;
  color: #1f2937;
}

body.dark-mode .search-box input {
  color: #e2e8f0;
}

.filter-select {
  padding: 0.4rem 0.8rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 0.9rem;
  color: #1f2937;
  cursor: pointer;
  min-width: 130px;
}

body.dark-mode .filter-select {
  background: #1e293b;
  border-color: #374151;
  color: #e2e8f0;
}

.notifications-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

body.dark-mode .notifications-list {
  background: #1e293b;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.2s;
}

body.dark-mode .notification-item {
  border-bottom-color: #2d3748;
}

.notification-item:last-child {
  border-bottom: none;
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
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
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

body.dark-mode .notification-icon.success {
  background: #064e3b;
}

body.dark-mode .notification-icon.info {
  background: #312e81;
}

body.dark-mode .notification-icon.warning {
  background: #78350f;
}

.notification-content {
  flex: 1;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.notification-title {
  font-weight: 600;
  color: #1a1a2e;
  font-size: 0.95rem;
}

body.dark-mode .notification-title {
  color: #e2e8f0;
}

.notification-time {
  font-size: 0.7rem;
  color: #9ca3af;
}

.notification-message {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0;
}

body.dark-mode .notification-message {
  color: #9ca3af;
}

.unread-badge {
  display: inline-block;
  background: #4F46E5;
  color: white;
  font-size: 0.6rem;
  padding: 0.1rem 0.4rem;
  border-radius: 50px;
  font-weight: 600;
  margin-top: 0.3rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.empty-state i {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
  color: #d1d5db;
}

body.dark-mode .empty-state i {
  color: #374151;
}

.text-center {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

@media (max-width: 768px) {
  .notifications-container {
    padding: 1rem;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .filters-row {
    flex-direction: column;
  }
  
  .search-box {
    max-width: 100%;
  }
  
  .stats-row {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .notification-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>