// src/stores/supplyChain.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/index.js'

export const useSupplyChainStore = defineStore('supplyChain', () => {
  // ============================================
  // STATE
  // ============================================
  const suppliers = ref([])
  const purchaseOrders = ref([])
  const requests = ref([])
  const notifications = ref([])
  const loading = ref(false)
  const processing = ref(false)

  const stats = ref({
    totalSuppliers: 0,
    pendingOrders: 0,
    receivedOrders: 0,
    lowStockCount: 0,
    pendingRequests: 0,
    totalSpent: 0
  })

  // ============================================
  // HELPERS — normalize wrapped vs array responses
  // ============================================
  const asArray = (response) => {
    const d = response?.data
    if (Array.isArray(d)) return d
    if (Array.isArray(d?.data)) return d.data
    return []
  }

  // ============================================
  // REQUESTS (supply_chain.php)
  // ============================================
  const loadRequests = async () => {
    loading.value = true
    try {
      const response = await api.get('/supply_chain.php')
      const list = asArray(response)
      requests.value = list
      stats.value.pendingRequests = list.filter(r =>
        ['pending', 'approved', 'ordered'].includes(r.status)
      ).length
      return list
    } catch (error) {
      console.error('Error loading supply chain requests:', error)
      requests.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  const createRequest = async ({ product_id, quantity, requested_by, notes }) => {
    processing.value = true
    try {
      const response = await api.post('/supply_chain.php', {
        product_id,
        quantity,
        requested_by,
        notes
      })
      await loadRequests()
      return response.data
    } finally {
      processing.value = false
    }
  }

  const updateRequestStatus = async (id, status, extra = {}) => {
    processing.value = true
    try {
      const response = await api.put(`/supply_chain.php?id=${id}`, {
        status,
        ...extra
      })
      await loadRequests()
      return response.data
    } finally {
      processing.value = false
    }
  }

  // ============================================
  // SUPPLIERS
  // ============================================
  const loadSuppliers = async () => {
    loading.value = true
    try {
      const response = await api.get('/suppliers.php')
      const list = asArray(response)
      suppliers.value = list
      stats.value.totalSuppliers = list.length
      return list
    } catch (error) {
      console.error('Error loading suppliers:', error)
      suppliers.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  // ============================================
  // PURCHASE ORDERS
  // ============================================
  const loadPurchaseOrders = async () => {
    loading.value = true
    try {
      const response = await api.get('/purchase_orders.php')
      const list = asArray(response)
      purchaseOrders.value = list

      stats.value.pendingOrders = list.filter(o =>
        o.status === 'ordered' || o.status === 'shipped'
      ).length
      stats.value.receivedOrders = list.filter(o => o.status === 'received').length
      stats.value.totalSpent = list
        .filter(o => o.status === 'received')
        .reduce((sum, o) => sum + parseFloat(o.total_cost || 0), 0)

      return list
    } catch (error) {
      console.error('Error loading purchase orders:', error)
      purchaseOrders.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  // ============================================
  // LOW STOCK
  // ============================================
  const checkLowStock = async () => {
    try {
      const response = await api.get('/products.php?low_stock=1')
      const list = asArray(response)
      stats.value.lowStockCount = list.length
      return list
    } catch (error) {
      console.error('Low stock check error:', error)
      return []
    }
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================
  const loadNotifications = async (userId) => {
    try {
      const response = await api.get(`/supply_chain_notifications.php?user_id=${userId}`)
      const list = asArray(response)
      notifications.value = list
      return list
    } catch (error) {
      console.error('Error loading notifications:', error)
      notifications.value = []
      return []
    }
  }

  const markNotificationRead = async (id) => {
    try {
      await api.put(`/supply_chain_notifications.php?id=${id}`, { is_read: true })
      const notification = notifications.value.find(n => n.id === id)
      if (notification) notification.is_read = true
    } catch (error) {
      console.error('Error marking notification read:', error)
    }
  }

  // ============================================
  // INIT
  // ============================================
  const init = async (userId) => {
    await Promise.all([
      loadRequests(),
      loadSuppliers(),
      loadPurchaseOrders(),
      loadNotifications(userId),
      checkLowStock()
    ])
  }

  return {
    suppliers,
    purchaseOrders,
    requests,
    notifications,
    loading,
    processing,
    stats,
    loadRequests,
    createRequest,
    updateRequestStatus,
    loadSuppliers,
    loadPurchaseOrders,
    loadNotifications,
    markNotificationRead,
    checkLowStock,
    init
  }
})