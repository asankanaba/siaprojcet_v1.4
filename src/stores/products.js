// src/stores/products.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/index.js'

export const useProductStore = defineStore('products', () => {
  // ============================================
  // STATE
  // ============================================
  const products = ref([])
  const categories = ref([])
  const loading = ref(false)
  const error = ref(null)

  // ============================================
  // COMPUTED
  // ============================================
  const lowStockProducts = computed(() => {
    return products.value.filter(p => p.stock <= (p.low_stock_threshold || 5))
  })

  const outOfStockProducts = computed(() => {
    return products.value.filter(p => p.stock <= 0)
  })

  const totalProducts = computed(() => products.value.length)

  // ============================================
  // METHODS
  // ============================================
  const loadProducts = async () => {
    loading.value = true
    try {
      const response = await api.get('/products.php')
      products.value = response.data || []
      return products.value
    } catch (error) {
      console.error('Error loading products:', error)
      error.value = error.message
      return []
    } finally {
      loading.value = false
    }
  }

  const loadCategories = async () => {
    try {
      const response = await api.get('/categories.php')
      categories.value = response.data || []
      return categories.value
    } catch (error) {
      console.error('Error loading categories:', error)
      return []
    }
  }

  const getProduct = async (id) => {
    try {
      const response = await api.get(`/products.php?id=${id}`)
      return response.data
    } catch (error) {
      console.error('Error getting product:', error)
      return null
    }
  }

  const createProduct = async (productData) => {
    try {
      const response = await api.post('/products.php', productData)
      if (response.data.success) {
        await loadProducts()
        return response.data
      }
      throw new Error(response.data.message || 'Failed to create product')
    } catch (error) {
      console.error('Error creating product:', error)
      throw error
    }
  }

  // ⚠️ `stock` is intentionally STRIPPED — stock is managed via
  //    Accept Delivery / GRN, POS sales, or admin inventory adjustments.
  const updateProduct = async (id, productData) => {
    try {
      const { stock, ...safeData } = productData || {}
      const response = await api.put(`/products.php?id=${id}`, safeData)
      if (response.data.success) {
        await loadProducts()
        return response.data
      }
      throw new Error(response.data.message || 'Failed to update product')
    } catch (error) {
      console.error('Error updating product:', error)
      throw error
    }
  }

  const deleteProduct = async (id) => {
    try {
      const response = await api.delete(`/products.php?id=${id}`)
      if (response.data.success) {
        await loadProducts()
        return response.data
      }
      throw new Error(response.data.message || 'Failed to delete product')
    } catch (error) {
      console.error('Error deleting product:', error)
      throw error
    }
  }

  // Internal use only — called by acceptDelivery or admin adjustment flows
  const updateStock = async (id, quantity, type = 'adjustment', note = '') => {
    try {
      const product = products.value.find(p => p.id === id)
      if (!product) throw new Error('Product not found')

      const newStock = type === 'add' ? product.stock + quantity : product.stock - quantity

      const response = await api.put(`/products.php?id=${id}`, {
        stock: Math.max(0, newStock)
      })

      if (response.data.success) {
        await loadProducts()
        await api.post('/inventory_logs.php', {
          product_id: id,
          quantity_change: type === 'add' ? quantity : -quantity,
          type: type,
          note: note
        })
        return response.data
      }
      throw new Error(response.data.message || 'Failed to update stock')
    } catch (error) {
      console.error('Error updating stock:', error)
      throw error
    }
  }

  // ============================================
  // INIT
  // ============================================
  const init = async () => {
    await Promise.all([
      loadProducts(),
      loadCategories()
    ])
  }

  return {
    products,
    categories,
    loading,
    error,
    lowStockProducts,
    outOfStockProducts,
    totalProducts,
    loadProducts,
    loadCategories,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    init
  }
})