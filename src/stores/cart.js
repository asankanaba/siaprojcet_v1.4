import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [],
    customer_id: null,
    discount: 0,
    tax_rate: 0.12,
    tax_type: 'inclusive', // inclusive or exclusive
    currency: '₱'
  }),

  getters: {
    subtotal: (state) => {
      return state.items.reduce((total, item) => total + (item.price * item.quantity), 0)
    },

    tax: (state) => {
      const subtotal = state.subtotal

      // 🟢 FORCE INCLUSIVE LOGIC (Even if Local Storage is corrupted)
      if (state.tax_type === 'inclusive' || localStorage.getItem('tax_type') === 'Inclusive') {
        const taxAmount = subtotal - (subtotal / (1 + state.tax_rate))
        return taxAmount
      }

      // 🔴 Exclusive logic (Fallback)
      return subtotal * state.tax_rate
    },

    total: (state) => {
      const subtotal = state.subtotal
      const discount = state.discount

      // 🟢 FORCE INCLUSIVE TOTAL (The price stays fixed)
      if (state.tax_type === 'inclusive' || localStorage.getItem('tax_type') === 'Inclusive') {
        return subtotal - discount
      }

      // 🔴 Exclusive total (Adds tax on top)
      return subtotal + (subtotal * state.tax_rate) - discount
    },

    getPriceWithTax: (state) => (price) => {
      if (state.tax_type === 'exclusive') {
        return price * (1 + state.tax_rate)
      }
      return price
    },

    itemCount: (state) => {
      return state.items.reduce((count, item) => count + item.quantity, 0)
    },

    hasReachedStockLimit: (state) => (productId) => {
      const item = state.items.find(i => i.product_id === productId)
      if (!item) return false
      return item.quantity >= item.max_stock
    }
  },

  actions: {
    init() {
      const savedRate = localStorage.getItem('tax_rate')
      const savedType = localStorage.getItem('tax_type')

      // Set the tax rate
      if (savedRate) {
        this.tax_rate = parseFloat(savedRate) / 100
      } else {
        this.tax_rate = 0.12
        localStorage.setItem('tax_rate', '12')
      }

      // Set the tax type - Force lowercase to prevent the 'Inclusive' bug
      if (savedType) {
        this.tax_type = savedType.toLowerCase()
      } else {
        this.tax_type = 'inclusive'
        localStorage.setItem('tax_type', 'inclusive')
      }
    },

    addItem(product, quantity = 1) {
      const existing = this.items.find(item => item.product_id === product.id)

      if (existing) {
        if (existing.quantity + quantity > existing.max_stock) {
          alert(`Cannot add more. Only ${existing.max_stock} items available in stock.`)
          return false
        }
        existing.quantity += quantity

        // ✅ Backfill image in case the item was added before the fix
        if (!existing.image_url) {
          existing.image_url = product.image_url || product.image || null
        }
        if (!existing.image) {
          existing.image = product.image || product.image_url || null
        }
      } else {
        if (product.stock <= 0) {
          alert('Product is out of stock!')
          return false
        }
        this.items.push({
          product_id: product.id,
          name: product.name,
          price: product.price,
          quantity: quantity,
          max_stock: product.stock,
          stock: product.stock,
          // ✅ REQUIRED so cart thumbnails render the real product photo
          image_url: product.image_url || product.image || null,
          image:     product.image    || product.image_url || null
        })
      }
      return true
    },

    removeItem(product_id) {
      this.items = this.items.filter(item => item.product_id !== product_id)
    },

    updateQuantity(product_id, quantity) {
      const item = this.items.find(item => item.product_id === product_id)
      if (item) {
        if (quantity <= 0) {
          this.removeItem(product_id)
        } else if (quantity > item.max_stock) {
          alert(`Cannot exceed stock limit of ${item.max_stock} items.`)
          return
        } else {
          item.quantity = quantity
        }
      }
    },

    clearCart() {
      this.items = []
      this.customer_id = null
      this.discount = 0
    },

    updateTaxRate(rate) {
      this.tax_rate = rate / 100
      localStorage.setItem('tax_rate', rate)
    },

    updateTaxType(type) {
      // Force lowercase when saving
      this.tax_type = type.toLowerCase()
      localStorage.setItem('tax_type', type.toLowerCase())
    }
  }
})