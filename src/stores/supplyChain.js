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

  // Stats
  const stats = ref({
    totalSuppliers: 0,
    pendingOrders: 0,
    receivedOrders: 0,
    lowStockCount: 0,
    pendingRequests: 0,
    totalSpent: 0
  })

  // ============================================
  // SUPPLY CHAIN WORKFLOW
  // ============================================
  const processSupplyChainRequest = async (productData) => {
    processing.value = true
    
    try {
      // Step 1: Check Inventory
      const inventoryCheck = await checkInventory(productData.productId)
      
      if (inventoryCheck.inStock) {
        await createNotification({
          requestId: null,
          userId: productData.requestedBy,
          type: 'inventory_available',
          message: `Product ${inventoryCheck.product.name} is available in stock.`
        })
        return {
          status: 'completed',
          message: 'Product available in inventory',
          data: inventoryCheck
        }
      }

      // Step 2: Check Finance (Budget)
      const budgetCheck = await checkBudget(productData)
      
      if (!budgetCheck.hasBudget) {
        // Notify Finance for budget approval
        await createNotification({
          requestId: null,
          userId: 1, // Finance user ID
          type: 'budget_needed',
          message: `Budget needed for ${productData.productName} x${productData.quantity} - ₱${budgetCheck.totalCost.toFixed(2)}`
        })
        
        // Notify requester
        await createNotification({
          requestId: null,
          userId: productData.requestedBy,
          type: 'budget_requested',
          message: `Budget request for ${productData.productName} has been sent to Finance.`
        })
        
        return {
          status: 'pending_budget',
          message: 'Budget approval required',
          budgetAmount: budgetCheck.totalCost
        }
      }

      // Step 3: Check Suppliers
      const supplierCheck = await checkSupplierStock(productData.productId, productData.quantity)
      
      if (!supplierCheck.inStock) {
        // Notify Finance
        await createNotification({
          requestId: null,
          userId: 1, // Finance user ID
          type: 'supplier_needed',
          message: `Supplier out of stock for ${productData.productName}. Need to order.`
        })
        
        // Notify requester
        await createNotification({
          requestId: null,
          userId: productData.requestedBy,
          type: 'supplier_out_of_stock',
          message: `Supplier is out of stock for ${productData.productName}. We are placing an order.`
        })
        
        // Try alternative suppliers
        const alternative = await findAlternativeSupplier(productData.productId, productData.quantity)
        if (alternative) {
          return await processOrder(productData, alternative)
        }
        
        return {
          status: 'supplier_unavailable',
          message: 'No supplier available with sufficient stock'
        }
      }

      // Step 4: Process Order
      return await processOrder(productData, supplierCheck.supplier)

    } catch (error) {
      console.error('Supply chain error:', error)
      return {
        status: 'error',
        message: error.message || 'Supply chain request failed'
      }
    } finally {
      processing.value = false
    }
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const checkInventory = async (productId) => {
    try {
      const response = await api.get(`/products.php?id=${productId}`)
      const product = response.data
      
      return {
        inStock: product && product.stock > 0,
        product: product,
        currentStock: product?.stock || 0
      }
    } catch (error) {
      console.error('Inventory check error:', error)
      return { inStock: false, product: null, currentStock: 0 }
    }
  }

  const checkBudget = async (productData) => {
    try {
      const totalCost = productData.quantity * (productData.unitPrice || 0)
      
      // Check budget for operations department
      const response = await api.get('/budgets.php?department=Operations')
      const budgets = response.data || []
      
      const departmentBudget = budgets.find(b => 
        b.category === 'Operations' || b.department === 'Operations'
      )
      
      if (departmentBudget) {
        const remaining = parseFloat(departmentBudget.allocated_amount) - parseFloat(departmentBudget.spent_amount || 0)
        return {
          hasBudget: remaining >= totalCost,
          totalCost: totalCost,
          remainingBudget: remaining,
          budgetId: departmentBudget.id
        }
      }
      
      return {
        hasBudget: false,
        totalCost: totalCost,
        remainingBudget: 0,
        budgetId: null
      }
    } catch (error) {
      console.error('Budget check error:', error)
      return { hasBudget: false, totalCost: 0, remainingBudget: 0 }
    }
  }

  const checkSupplierStock = async (productId, quantity) => {
    try {
      const response = await api.get(`/suppliers.php?product_id=${productId}`)
      const suppliersList = response.data || []
      
      const availableSupplier = suppliersList.find(s => 
        parseInt(s.stock_available) >= parseInt(quantity) && s.status === 'active'
      )
      
      return {
        inStock: !!availableSupplier,
        supplier: availableSupplier,
        availableQuantity: availableSupplier?.stock_available || 0
      }
    } catch (error) {
      console.error('Supplier check error:', error)
      return { inStock: false, supplier: null, availableQuantity: 0 }
    }
  }

  const findAlternativeSupplier = async (productId, quantity) => {
    try {
      const response = await api.get(`/suppliers.php?product_id=${productId}`)
      const suppliersList = response.data || []
      
      const sorted = suppliersList
        .filter(s => s.status === 'active' && parseInt(s.stock_available) > 0)
        .sort((a, b) => (parseInt(a.lead_time_days) || 7) - (parseInt(b.lead_time_days) || 7))
      
      return sorted[0] || null
    } catch (error) {
      console.error('Alternative supplier search error:', error)
      return null
    }
  }

  const processOrder = async (productData, supplier) => {
    const unitPrice = parseFloat(supplier.price_per_unit) || parseFloat(productData.unitPrice) || 0
    const quantity = parseInt(productData.quantity)
    const totalCost = quantity * unitPrice
    
    const orderData = {
      product_id: productData.productId,
      supplier_id: supplier.id,
      quantity: quantity,
      unit_price: unitPrice,
      total_cost: totalCost,
      ordered_by: productData.requestedBy,
      expected_delivery: new Date(Date.now() + (parseInt(supplier.lead_time_days) || 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'ordered',
      product_name: productData.productName || ''
    }
    
    const response = await api.post('/purchase_orders.php', orderData)
    
    if (response.data.success) {
      // Notify requester
      await createNotification({
        requestId: response.data.id,
        userId: productData.requestedBy,
        type: 'order_placed',
        message: `Order placed for ${productData.productName} x${quantity} from ${supplier.name}. PO #${response.data.po_number}`
      })
      
      // Notify Finance
      await createNotification({
        requestId: response.data.id,
        userId: 1, // Finance user ID
        type: 'order_placed',
        message: `Purchase order #${response.data.po_number} created for ${productData.productName} - ₱${totalCost.toFixed(2)}`
      })
    }
    
    return {
      status: 'ordered',
      message: 'Purchase order created successfully',
      data: response.data
    }
  }

  const receiveOrder = async (orderId) => {
    try {
      const response = await api.put(`/purchase_orders.php?id=${orderId}`, {
        status: 'received',
        received_date: new Date().toISOString()
      })
      
      if (response.data.success) {
        const order = purchaseOrders.value.find(o => o.id === orderId)
        if (order) {
          // Update inventory
          await api.post('/products.php', {
            id: order.product_id,
            stock: order.quantity,
            action: 'add_stock'
          })
          
          // Notify requester
          await createNotification({
            requestId: orderId,
            userId: order.ordered_by,
            type: 'order_received',
            message: `Order #${order.po_number} has been received. Inventory updated.`
          })
        }
        
        await loadPurchaseOrders()
        return response.data
      }
    } catch (error) {
      console.error('Error receiving order:', error)
      throw error
    }
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================
  const createNotification = async (notification) => {
    try {
      const response = await api.post('/supply_chain_notifications.php', {
        request_id: notification.requestId,
        user_id: notification.userId,
        type: notification.type,
        message: notification.message
      })
      
      notifications.value.unshift(response.data)
      return response.data
    } catch (error) {
      console.error('Notification error:', error)
    }
  }

  const loadNotifications = async (userId) => {
    try {
      const response = await api.get(`/supply_chain_notifications.php?user_id=${userId}`)
      notifications.value = response.data || []
      return notifications.value
    } catch (error) {
      console.error('Error loading notifications:', error)
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
  // LOAD DATA
  // ============================================
  const loadSuppliers = async () => {
    loading.value = true
    try {
      const response = await api.get('/suppliers.php')
      suppliers.value = response.data || []
      stats.value.totalSuppliers = suppliers.value.length
      return suppliers.value
    } catch (error) {
      console.error('Error loading suppliers:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  const loadPurchaseOrders = async () => {
    loading.value = true
    try {
      const response = await api.get('/purchase_orders.php')
      purchaseOrders.value = response.data || []
      
      stats.value.pendingOrders = purchaseOrders.value.filter(o => 
        o.status === 'ordered' || o.status === 'shipped'
      ).length
      stats.value.receivedOrders = purchaseOrders.value.filter(o => o.status === 'received').length
      stats.value.totalSpent = purchaseOrders.value
        .filter(o => o.status === 'received')
        .reduce((sum, o) => sum + parseFloat(o.total_cost || 0), 0)
      
      return purchaseOrders.value
    } catch (error) {
      console.error('Error loading purchase orders:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  const checkLowStock = async () => {
    try {
      const response = await api.get('/products.php?low_stock=1')
      const lowStockItems = response.data || []
      stats.value.lowStockCount = lowStockItems.length
      return lowStockItems
    } catch (error) {
      console.error('Low stock check error:', error)
      return []
    }
  }

  // ============================================
  // INIT
  // ============================================
  const init = async (userId) => {
    await Promise.all([
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
    processSupplyChainRequest,
    receiveOrder,
    loadSuppliers,
    loadPurchaseOrders,
    loadNotifications,
    markNotificationRead,
    checkLowStock,
    init
  }
})