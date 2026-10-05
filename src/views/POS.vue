<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="pos-container">
          <!-- Header -->
          <header class="pos-header">
            <div class="header-left">
              <h2><i class="fas fa-shopping-cart"></i> Point of Sale</h2>
              <span class="branch-info">Main Branch</span>
            </div>
            <div class="header-center">
              <div class="search-box">
                <i class="fas fa-search"></i>
                <input 
                  type="text" 
                  v-model="searchQuery" 
                  placeholder="Search products..."
                  @input="searchProducts"
                >
              </div>
            </div>
            <div class="header-right">
              <span class="user-info">
                <i class="fas fa-user-circle"></i>
                {{ user?.full_name || 'Staff' }}
              </span>
              <button @click="logout" class="btn-logout" title="Logout">
                <i class="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </header>

          <!-- Main Content -->
          <div class="pos-main">
            <!-- Product Grid -->
            <div class="product-section">
              <div class="category-tabs">
                <button 
                  v-for="cat in categories" 
                  :key="cat.id || cat"
                  class="category-tab"
                  :class="{ active: selectedCategory === (cat.id || cat) }"
                  @click="selectedCategory = cat.id || cat"
                >
                  {{ cat.name || cat }}
                </button>
              </div>

              <div class="product-grid">
                <div 
                  v-for="product in filteredProducts" 
                  :key="product.id"
                  class="product-card"
                  :class="{ 'out-of-stock': product.stock <= 0 }"
                  @click="addToCart(product)"
                >
                  <div class="product-image">
                    <img 
                      v-if="getProductImage(product)" 
                      :src="getProductImage(product)" 
                      :alt="product.name"
                      @error="handleImageError"
                      loading="lazy"
                    >
                    <i v-else class="fas fa-box"></i>
                  </div>
                  <div class="product-info">
                    <h6 class="product-name">{{ product.name }}</h6>
                    <p class="product-price">{{ formatCurrency(product.price) }}</p>
                    <span class="product-stock" :class="{ 'text-danger': product.stock <= 5, 'text-muted': product.stock <= 0 }">
                      Stock: {{ product.stock }}
                      <span v-if="product.stock <= 0" class="badge badge-danger">Out of Stock</span>
                    </span>
                  </div>
                </div>
                
                <div v-if="filteredProducts.length === 0" class="no-products">
                  <i class="fas fa-box-open"></i>
                  <p>No products found</p>
                </div>
              </div>
            </div>

            <!-- Cart Section -->
            <div class="cart-section">
              <div class="cart-header">
                <h5><i class="fas fa-shopping-bag"></i> Current Order</h5>
                <span class="cart-count">{{ cartStore.itemCount }} items</span>
              </div>

              <div class="cart-items">
                <div v-if="cartStore.items.length === 0" class="empty-cart">
                  <i class="fas fa-shopping-cart"></i>
                  <p>Cart is empty</p>
                </div>
                <div 
                  v-for="(item, index) in cartStore.items" 
                  :key="index"
                  class="cart-item"
                >
                  <div class="item-image">
                    <img 
                      v-if="getProductImage(item)" 
                      :src="getProductImage(item)" 
                      :alt="item.name"
                      @error="handleImageError"
                    >
                    <i v-else class="fas fa-box"></i>
                  </div>
                  <div class="item-info">
                    <span class="item-name">{{ item.name }}</span>
                    <span class="item-price">{{ formatCurrency(item.price) }}</span>
                  </div>
                  <div class="item-controls">
                    <button @click="cartStore.updateQuantity(item.product_id, item.quantity - 1)" class="btn-qty">-</button>
                    <span class="item-qty">{{ item.quantity }}</span>
                    <button @click="cartStore.updateQuantity(item.product_id, item.quantity + 1)" class="btn-qty">+</button>
                    <button @click="cartStore.removeItem(item.product_id)" class="btn-remove">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div class="cart-totals">
                <div class="total-row">
                  <span>Subtotal</span>
                  <span>{{ formatCurrency(cartStore.subtotal) }}</span>
                </div>
                <div class="total-row">
                  <span>Tax (12%)</span>
                  <span>{{ formatCurrency(cartStore.tax) }}</span>
                </div>
                <div class="total-row grand-total">
                  <span>Total</span>
                  <span>{{ formatCurrency(cartStore.total) }}</span>
                </div>

                <div class="payment-section">
                  <div class="input-group">
                    <label>Payment Method</label>
                    <select v-model="paymentMethod" class="form-control" @change="onPaymentMethodChange">
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                    </select>
                  </div>
                  
                  <div v-if="paymentMethod === 'cash'" class="input-group">
                    <label>Amount Paid</label>
                    <input 
                      type="number" 
                      v-model="amountPaid" 
                      class="form-control"
                      placeholder="0.00"
                      @input="calculateChange"
                    >
                  </div>
                  
                  <div v-else class="input-group">
                    <label>Amount Paid (Auto)</label>
                    <input 
                      type="number" 
                      v-model="amountPaid" 
                      class="form-control"
                      readonly
                      disabled
                    >
                    <small class="text-muted">Auto-filled for card/GCash/Maya payments</small>
                  </div>

                  <div class="change-display">
                    <span>Change:</span>
                    <span class="change-amount">{{ formatCurrency(change) }}</span>
                  </div>

                  <div v-if="paymentMethod === 'cash'" class="quick-payment">
                    <button @click="setPaymentAmount('exact')" class="btn btn-sm btn-outline-primary">
                      Exact Amount
                    </button>
                    <button @click="setPaymentAmount('round')" class="btn btn-sm btn-outline-primary">
                      Round Up
                    </button>
                  </div>
                </div>

                <div class="cart-actions">
                  <button @click="clearCart" class="btn btn-secondary">
                    <i class="fas fa-trash-alt"></i> Clear
                  </button>
                  <button 
                    @click="processPayment" 
                    class="btn btn-primary"
                    :disabled="cartStore.items.length === 0 || !isPaymentValid || isProcessing"
                  >
                    <i class="fas fa-spinner spin" v-if="isProcessing"></i>
                    <i class="fas fa-check" v-else></i>
                    {{ isProcessing ? 'Processing...' : 'Pay Now' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Print Receipt Modal -->
        <div v-if="showReceiptModal" class="modal-overlay" @click.self="closeReceiptModal">
          <div class="modal-content receipt-modal">
            <div class="modal-header">
              <h5><i class="fas fa-receipt"></i> Receipt</h5>
              <button @click="closeReceiptModal" class="btn-close">&times;</button>
            </div>
            
            <div class="modal-body" id="receipt-content">
              <div class="receipt-header">
                <h2>Smart POS</h2>
                <p class="branch">{{ saleData?.branch || 'Main Branch' }}</p>
                <p class="address">123 Main Street, City</p>
                <div class="divider"></div>
                <p class="receipt-info">
                  <strong>Invoice #:</strong> {{ saleData?.invoice_number || 'N/A' }}
                </p>
                <p class="receipt-info">
                  <strong>Date:</strong> {{ formatDate(saleData?.date) }}
                </p>
                <p class="receipt-info">
                  <strong>Cashier:</strong> {{ saleData?.cashier || 'Staff' }}
                </p>
                <div class="divider"></div>
              </div>

              <div class="receipt-items">
                <table class="items-table">
                  <thead>
                    <tr>
                      <th class="text-left">Item</th>
                      <th class="text-center">Qty</th>
                      <th class="text-right">Price</th>
                      <th class="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in saleData?.items || []" :key="index">
                      <td class="text-left">{{ item.name }}</td>
                      <td class="text-center">{{ item.quantity }}</td>
                      <td class="text-right">{{ formatCurrency(item.price) }}</td>
                      <td class="text-right">{{ formatCurrency(item.total || item.price * item.quantity) }}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="divider"></div>
              </div>

              <div class="receipt-totals">
                <div class="total-row">
                  <span>Subtotal</span>
                  <span>{{ formatCurrency(saleData?.subtotal || 0) }}</span>
                </div>
                <div class="total-row">
                  <span>Tax (12%)</span>
                  <span>{{ formatCurrency(saleData?.tax || 0) }}</span>
                </div>
                <div class="total-row grand-total">
                  <span><strong>Total</strong></span>
                  <span><strong>{{ formatCurrency(saleData?.total || 0) }}</strong></span>
                </div>
                <div class="total-row">
                  <span>Payment Method</span>
                  <span>{{ (saleData?.payment_method || 'CASH').toUpperCase() }}</span>
                </div>
                <div class="total-row">
                  <span>Amount Paid</span>
                  <span>{{ formatCurrency(saleData?.payment_amount || 0) }}</span>
                </div>
                <div v-if="saleData?.change_amount > 0" class="total-row">
                  <span>Change</span>
                  <span>{{ formatCurrency(saleData?.change_amount || 0) }}</span>
                </div>
                <div class="divider"></div>
              </div>

              <div class="receipt-footer">
                <p class="thank-you">Thank you for your purchase!</p>
                <p class="return-policy">Please keep this receipt for returns and exchanges</p>
                <p class="support">For support: support@smartpos.com</p>
                <div class="divider"></div>
                <p class="timestamp">{{ formatTime(saleData?.date) }}</p>
              </div>
            </div>

            <div class="modal-footer">
              <button @click="closeReceiptModal" class="btn btn-secondary">
                <i class="fas fa-times"></i> Close
              </button>
              <button @click="printReceipt" class="btn btn-primary">
                <i class="fas fa-print"></i> Print
              </button>
              <button @click="downloadReceipt" class="btn btn-success">
                <i class="fas fa-download"></i> Download
              </button>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner">
            <i class="fas fa-spinner spin"></i>
            <p>Loading products...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCartStore } from '../stores/cart'
import Sidebar from '../components/common/Sidebar.vue'
import Navbar from '../components/common/Navbar.vue'
import Swal from 'sweetalert2'
import api from '../api/index.js'

const router = useRouter()
const authStore = useAuthStore()
const cartStore = useCartStore()

// ============ STATE ============
const loading = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('all')
const products = ref([])
const categories = ref([{ id: 'all', name: 'All' }])
const amountPaid = ref('')
const paymentMethod = ref('card')
const user = ref(null)
const saleData = ref(null)
const showReceiptModal = ref(false)
const isProcessing = ref(false)

// ============ BACKEND URL ============
const API_BASE_URL = 'http://localhost/smart-pos-api/api'

// ============ CHECK DARK MODE ============
const isDarkMode = () => {
  return document.documentElement.classList.contains('dark-mode') || 
         document.body.classList.contains('dark-mode') ||
         document.querySelector('.app-layout')?.classList?.contains('dark-mode') ||
         document.documentElement.getAttribute('data-theme') === 'dark'
}

// ============ COMPUTED ============
const filteredProducts = computed(() => {
  let result = products.value
  
  if (selectedCategory.value !== 'all') {
    result = result.filter(p => p.category_id === selectedCategory.value)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.includes(query))
    )
  }
  
  return result
})

const change = computed(() => {
  const paid = parseFloat(amountPaid.value) || 0
  return Math.max(0, paid - cartStore.total)
})

const isPaymentValid = computed(() => {
  if (cartStore.items.length === 0) return false
  
  if (paymentMethod.value !== 'cash') {
    return true
  }
  
  const paid = parseFloat(amountPaid.value) || 0
  return paid >= cartStore.total
})

// ============ WATCHERS ============
watch(() => cartStore.total, (newTotal) => {
  if (paymentMethod.value !== 'cash') {
    amountPaid.value = newTotal.toFixed(2)
  }
})

watch(paymentMethod, (newMethod) => {
  if (newMethod !== 'cash') {
    amountPaid.value = cartStore.total.toFixed(2)
  } else {
    amountPaid.value = ''
  }
})

// ============================================
// IMAGE HELPER
// ============================================
const getProductImage = (product) => {
  if (!product) return null;
  let imageUrl = product.image_url || product.image || product.product_image || null;
  if (!imageUrl) return null;
  imageUrl = imageUrl.trim();
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  if (imageUrl.startsWith('/uploads/')) return `http://localhost/smart-pos-api/api${imageUrl}`;
  if (imageUrl.startsWith('uploads/')) return `http://localhost/smart-pos-api/api/${imageUrl}`;
  if (imageUrl.match(/^[a-zA-Z0-9_\-\.]+\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) {
    return `http://localhost/smart-pos-api/api/uploads/products/${imageUrl}`;
  }
  if (imageUrl.includes('/')) return `http://localhost/smart-pos-api/api/${imageUrl}`;
  return `http://localhost/smart-pos-api/api/uploads/products/${imageUrl}`;
};

const handleImageError = (e) => {
  const img = e.target
  img.style.display = 'none'
}

// ============ FORMAT HELPERS ============
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₱0.00'
  return '₱' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const calculateChange = () => {}

const onPaymentMethodChange = () => {
  if (paymentMethod.value !== 'cash') {
    amountPaid.value = cartStore.total.toFixed(2)
  } else {
    amountPaid.value = ''
  }
}

const setPaymentAmount = (type) => {
  if (type === 'exact') {
    amountPaid.value = cartStore.total.toFixed(2)
  } else if (type === 'round') {
    amountPaid.value = Math.ceil(cartStore.total).toFixed(2)
  }
}

// ============================================
// LOAD PRODUCTS - ONLY ONE DECLARATION!
// ============================================
const loadProducts = async () => {
  loading.value = true
  try {
    const response = await api.get('/products.php')
    if (response.data && Array.isArray(response.data)) {
      products.value = response.data.filter(p => p.status !== 'archived')
    }
    try {
      const catResponse = await api.get('/categories.php')
      if (catResponse.data && Array.isArray(catResponse.data)) {
        categories.value = [{ id: 'all', name: 'All' }, ...catResponse.data]
      }
    } catch (e) {
      console.warn('Could not load categories:', e)
    }
  } catch (error) {
    console.error('❌ Error loading products:', error)
  } finally {
    loading.value = false
  }
}

const refreshProducts = async () => {
  try {
    const response = await api.get('/products.php')
    if (response.data && Array.isArray(response.data)) {
      products.value = response.data.filter(p => p.status !== 'archived')
    }
  } catch (error) {
    console.error('❌ Error refreshing products:', error)
  }
}

const searchProducts = () => {}

// ============================================
// CART OPERATIONS (SYNC WITH STORE)
// ============================================
const addToCart = (product) => {
  if (product.stock <= 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Out of Stock',
      text: `${product.name} is out of stock!`,
      confirmButtonColor: '#4F46E5',
      confirmButtonText: 'OK'
    })
    return
  }
  
  const success = cartStore.addItem(product)
  
  if (success && paymentMethod.value !== 'cash') {
    amountPaid.value = cartStore.total.toFixed(2)
  }
}

const clearCart = async () => {
  if (cartStore.items.length === 0) return
  
  const result = await Swal.fire({
    title: 'Clear Cart?',
    text: 'Are you sure you want to clear all items from the cart?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Clear All',
    cancelButtonText: 'Cancel'
  })
  
  if (result.isConfirmed) {
    cartStore.clearCart()
    amountPaid.value = ''
    await Swal.fire({
      icon: 'success',
      title: 'Cart Cleared',
      text: 'All items have been removed from the cart.',
      confirmButtonColor: '#4F46E5',
      timer: 1500,
      showConfirmButton: false
    })
  }
}

// ============================================
// PROCESS PAYMENT
// ============================================
const processPayment = async () => {
  if (cartStore.items.length === 0) {
    await Swal.fire({
      icon: 'error',
      title: 'Cart is Empty',
      text: 'Please add items to the cart before proceeding.',
      confirmButtonColor: '#4F46E5',
      confirmButtonText: 'OK'
    })
    return
  }
  
  if (paymentMethod.value === 'cash') {
    const paid = parseFloat(amountPaid.value) || 0
    if (paid < cartStore.total) {
      await Swal.fire({
        icon: 'error',
        title: 'Insufficient Payment',
        html: `
          <div style="text-align: left;">
            <p><strong>Total:</strong> ${formatCurrency(cartStore.total)}</p>
            <p><strong>Amount Paid:</strong> ${formatCurrency(paid)}</p>
            <p style="color: #EF4444;"><strong>Shortage:</strong> ${formatCurrency(cartStore.total - paid)}</p>
          </div>
        `,
        confirmButtonColor: '#4F46E5',
        confirmButtonText: 'OK'
      })
      return
    }
  } else {
    amountPaid.value = cartStore.total.toFixed(2)
  }
  
  if (isProcessing.value) return
  isProcessing.value = true
  
  const darkMode = isDarkMode()
  const bgColor = darkMode ? '#1e293b' : '#fafafa'
  const borderColor = darkMode ? '#334155' : '#e5e5e5'
  const textColor = darkMode ? '#e2e8f0' : '#000'
  const labelColor = darkMode ? '#94a3b8' : '#666'
  const dividerColor = darkMode ? '#334155' : '#ddd'
  const warningBg = darkMode ? '#422006' : '#fffbeb'
  const warningText = darkMode ? '#fcd34d' : '#92400E'
  const modalBg = darkMode ? '#1e293b' : '#ffffff'
  const modalText = darkMode ? '#e2e8f0' : '#000000'
  const popupClass = darkMode ? 'swal-popup-dark' : 'swal-popup-soft'
  
  // Show confirmation dialog - WITH DARK MODE SUPPORT
  const confirmResult = await Swal.fire({
    title: 'Confirm Payment',
    html: `
      <div style="font-family: 'Courier New', monospace; text-align: left; padding: 5px 0;">
        <div style="background: ${bgColor}; padding: 16px; border-radius: 8px; border: 1px solid ${borderColor};">
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed ${dividerColor};">
            <span style="color: ${labelColor}; font-size: 12px;">ITEMS</span>
            <span style="font-weight: 600; color: ${textColor};">${cartStore.itemCount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed ${dividerColor};">
            <span style="color: ${labelColor}; font-size: 12px;">TOTAL</span>
            <span style="font-weight: 700; color: #4F46E5; font-size: 1.1rem;">${formatCurrency(cartStore.total)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed ${dividerColor};">
            <span style="color: ${labelColor}; font-size: 12px;">PAYMENT</span>
            <span style="font-weight: 600; text-transform: uppercase; color: ${textColor};">${paymentMethod.value}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0;">
            <span style="color: ${labelColor}; font-size: 12px;">AMOUNT PAID</span>
            <span style="font-weight: 600; color: ${textColor};">${formatCurrency(parseFloat(amountPaid.value) || cartStore.total)}</span>
          </div>
          ${paymentMethod.value === 'cash' ? `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; margin-top: 4px; border-top: 1px dashed ${dividerColor};">
              <span style="color: ${labelColor}; font-size: 12px;">CHANGE</span>
              <span style="font-weight: 600; color: #10B981;">${formatCurrency(change.value)}</span>
            </div>
          ` : ''}
        </div>
        <div style="background: ${warningBg}; padding: 10px; border-radius: 6px; border-left: 3px solid #F59E0B; margin-top: 10px;">
          <p style="margin: 0; font-size: 0.8rem; color: ${warningText};">
            ⚠️ Please verify the amount before confirming.
          </p>
        </div>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#4F46E5',
    cancelButtonColor: '#9CA3AF',
    confirmButtonText: 'Confirm Payment',
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    padding: '1.5rem',
    width: '420px',
    backdrop: 'rgba(0,0,0,0.3)',
    background: modalBg,
    color: modalText,
    customClass: {
      popup: popupClass,
      confirmButton: 'swal-btn-confirm',
      cancelButton: 'swal-btn-cancel'
    }
  })
  
  if (!confirmResult.isConfirmed) {
    isProcessing.value = false
    return
  }
  
  try {
    const paid = parseFloat(amountPaid.value) || cartStore.total
    const invoiceNumber = 'INV-' + Date.now().toString().slice(-8)
    
    // Capture ALL cart data BEFORE clearing
    const cartItemsCopy = cartStore.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity
    }))
    
    const subtotalCopy = cartStore.subtotal
    const taxCopy = cartStore.tax
    const totalCopy = cartStore.total
    const itemCountCopy = cartStore.itemCount
    const discountCopy = cartStore.discount || 0
    
    // Prepare order data for API
    const orderData = {
      invoice_number: invoiceNumber,
      customer_id: null,
      user_id: user.value?.id || 1,
      items: cartStore.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      subtotal: subtotalCopy,
      discount: discountCopy,
      tax: taxCopy,
      total: totalCopy,
      payment_method: paymentMethod.value,
      payment_amount: paid,
      change_amount: change.value,
      status: 'completed'
    }
    
    // Send to API
    const response = await api.post('/sales.php', orderData)
    
    if (response.data && response.data.success) {
      // Set sale data
      const receiptData = {
        sale_id: response.data.sale_id,
        invoice_number: invoiceNumber,
        items: cartItemsCopy,
        subtotal: subtotalCopy,
        tax: taxCopy,
        total: totalCopy,
        item_count: itemCountCopy,
        discount: discountCopy,
        payment_method: paymentMethod.value,
        payment_amount: paid,
        change_amount: change.value,
        cashier: user.value?.full_name || 'Staff',
        date: new Date().toISOString(),
        branch: 'Main Branch'
      }
      
      saleData.value = receiptData
      
      // Refresh products
      await refreshProducts()
      
      // Clear cart
      cartStore.clearCart()
      
      // Reset payment fields
      if (paymentMethod.value === 'cash') {
        amountPaid.value = ''
      } else {
        amountPaid.value = totalCopy.toFixed(2)
      }
      
      // Show success notification
      const successBg = darkMode ? '#1e293b' : '#fafafa'
      const successBorder = darkMode ? '#334155' : '#e5e5e5'
      const successText = darkMode ? '#e2e8f0' : '#000'
      const successLabel = darkMode ? '#94a3b8' : '#666'
      const successDivider = darkMode ? '#334155' : '#ddd'
      
      await Swal.fire({
        icon: 'success',
        title: 'Payment Successful!',
        html: `
          <div style="font-family: 'Courier New', monospace; text-align: left; padding: 5px 0;">
            <div style="background: ${successBg}; padding: 16px; border-radius: 8px; border: 1px solid ${successBorder};">
              <div style="text-align: center; border-bottom: 2px solid #4F46E5; padding-bottom: 8px; margin-bottom: 8px;">
                <span style="font-size: 14px; font-weight: 700; color: #4F46E5;">SMART POS</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed ${successDivider};">
                <span style="color: ${successLabel}; font-size: 11px;">INVOICE</span>
                <span style="font-weight: 600; color: ${successText}; font-size: 12px;">${invoiceNumber}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed ${successDivider};">
                <span style="color: ${successLabel}; font-size: 11px;">ITEMS</span>
                <span style="font-weight: 600; color: ${successText}; font-size: 12px;">${itemCountCopy}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed ${successDivider};">
                <span style="color: ${successLabel}; font-size: 11px;">TOTAL</span>
                <span style="font-weight: 700; color: #10B981; font-size: 1.1rem;">${formatCurrency(totalCopy)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dashed ${successDivider};">
                <span style="color: ${successLabel}; font-size: 11px;">PAYMENT</span>
                <span style="font-weight: 600; text-transform: uppercase; color: ${successText}; font-size: 12px;">${paymentMethod.value}</span>
              </div>
              ${paymentMethod.value === 'cash' ? `
                <div style="display: flex; justify-content: space-between; padding: 3px 0;">
                  <span style="color: ${successLabel}; font-size: 11px;">CHANGE</span>
                  <span style="font-weight: 600; color: #F59E0B; font-size: 12px;">${formatCurrency(change.value)}</span>
                </div>
              ` : ''}
            </div>
            <div style="text-align: center; margin-top: 12px; border-top: 1px dashed ${successDivider}; padding-top: 10px;">
              <span style="color: ${successLabel}; font-size: 11px; font-family: 'Courier New', monospace;">
                ⏱️ Receipt will open in <strong style="color: #4F46E5;">8</strong> seconds
              </span>
            </div>
            <div style="text-align: center; margin-top: 6px;">
              <span style="color: ${successLabel}; font-size: 10px; font-family: 'Courier New', monospace;">
                Please keep this receipt for returns and exchanges
              </span>
            </div>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        timer: 8000,
        timerProgressBar: true,
        width: '420px',
        padding: '1.5rem',
        backdrop: 'rgba(0,0,0,0.3)',
        background: modalBg,
        color: modalText,
        customClass: {
          popup: popupClass
        },
        didOpen: () => {
          const timerInterval = setInterval(() => {
            const remaining = Swal.getTimerLeft()
            if (remaining) {
              const seconds = Math.ceil(remaining / 1000)
              const htmlContainer = Swal.getHtmlContainer()
              if (htmlContainer) {
                const strongEl = htmlContainer.querySelector('strong')
                if (strongEl) {
                  strongEl.textContent = seconds
                }
              }
            }
          }, 1000)
          Swal.getPopup()._timerInterval = timerInterval
        },
        willClose: () => {
          const popup = Swal.getPopup()
          if (popup && popup._timerInterval) {
            clearInterval(popup._timerInterval)
          }
        }
      })
      
      // Show the receipt modal
      showReceiptModal.value = true
      
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Payment Failed',
        text: response.data?.message || 'Something went wrong. Please try again.',
        confirmButtonColor: '#4F46E5',
        confirmButtonText: 'Try Again',
        background: modalBg,
        color: modalText,
        customClass: {
          popup: popupClass
        }
      })
    }
    
  } catch (error) {
    console.error('Payment error:', error)
    
    const darkMode = isDarkMode()
    const modalBg = darkMode ? '#1e293b' : '#ffffff'
    const modalText = darkMode ? '#e2e8f0' : '#000000'
    const popupClass = darkMode ? 'swal-popup-dark' : 'swal-popup-soft'
    
    let errorMessage = 'Failed to process payment'
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    if (errorMessage.includes('Insufficient stock')) {
      await refreshProducts()
      await Swal.fire({
        icon: 'warning',
        title: 'Stock Update',
        text: 'Some items are out of stock. The product list has been updated.',
        confirmButtonColor: '#4F46E5',
        confirmButtonText: 'OK',
        background: modalBg,
        color: modalText,
        customClass: {
          popup: popupClass
        }
      })
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Payment Error',
        text: errorMessage,
        confirmButtonColor: '#4F46E5',
        confirmButtonText: 'OK',
        background: modalBg,
        color: modalText,
        customClass: {
          popup: popupClass
        }
      })
    }
  } finally {
    isProcessing.value = false
  }
}

const closeReceiptModal = () => {
  showReceiptModal.value = false
}

const printReceipt = () => {
  const printContent = document.getElementById('receipt-content')
  if (!printContent) return

  const printContainer = document.createElement('div')
  printContainer.id = 'print-container'
  printContainer.style.cssText = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    z-index: 99999; background: white; padding: 20px; overflow: auto; display: none;
  `
  const receiptClone = printContent.cloneNode(true)
  const buttons = receiptClone.querySelectorAll('button, .modal-footer, .modal-header')
  buttons.forEach(btn => btn.remove())
  
  printContainer.appendChild(receiptClone)
  document.body.appendChild(printContainer)
  printContainer.style.display = 'block'

  const modal = document.querySelector('.modal-overlay')
  if (modal) modal.style.display = 'none'

  window.print()

  setTimeout(() => {
    if (modal) modal.style.display = 'flex'
    if (document.body.contains(printContainer)) document.body.removeChild(printContainer)
  }, 1000)
}

const downloadReceipt = async () => {
  await Swal.fire({
    icon: 'info',
    title: 'Coming Soon',
    text: 'PDF download feature is coming soon!',
    confirmButtonColor: '#4F46E5',
    confirmButtonText: 'OK'
  })
}

const logout = async () => {
  const result = await Swal.fire({
    title: 'Logout',
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
  }
}

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  user.value = authStore.user
  loadProducts()
  amountPaid.value = cartStore.total.toFixed(2)
})
</script>

<style scoped>
/* ============================================
   RESPONSIVE DESIGN FOR POS
   ============================================ */

/* 1. Tablet and Smaller Laptops */
@media (max-width: 1200px) {
  .cart-section {
    width: 340px;
  }
}

/* 2. Mobile and Small Tablets */
@media (max-width: 992px) {
  .pos-main {
    flex-direction: column;
    gap: 0.5rem;
  }

  .product-section {
    flex: 1;
    height: 50vh;
    min-height: 300px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .product-section .product-grid {
    overflow-y: auto;
    flex: 1;
    padding: 0.5rem;
  }

  .cart-section {
    width: 100%;
    height: 40vh;
    flex-shrink: 0;
  }

  .pos-header {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .header-center {
    order: 3;
    flex: 1 1 100%;
    margin-top: 0.5rem;
    max-width: 100%;
  }
}

/* 3. Extra Small Mobile Phones */
@media (max-width: 768px) {
  .page-content {
    padding: 0.5rem;
  }
  
  .pos-header {
    padding: 0.5rem 1rem;
  }
  
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 0.5rem;
  }
  
  .product-card {
    padding: 0.5rem;
  }

  .product-image {
    width: 50px;
    height: 50px;
  }

  .product-image i {
    font-size: 1.2rem;
  }

  .product-name {
    font-size: 0.75rem;
  }
}

/* SweetAlert2 Dark Mode Styles */
:deep(.swal-popup-dark) {
  border-radius: 16px !important;
  padding: 1.5rem !important;
  background: #1e293b !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5) !important;
  border: 1px solid #334155 !important;
}

:deep(.swal-popup-dark .swal2-title) {
  color: #e2e8f0 !important;
  font-weight: 700 !important;
  font-size: 1.3rem !important;
}

:deep(.swal-popup-dark .swal2-html-container) {
  color: #94a3b8 !important;
}

:deep(.swal-popup-dark .swal2-icon.swal2-success) {
  color: #10B981 !important;
}

:deep(.swal-popup-dark .swal2-icon.swal2-question) {
  color: #4F46E5 !important;
}

:deep(.swal-popup-dark .swal2-icon.swal2-error) {
  color: #EF4444 !important;
}

:deep(.swal-popup-dark .swal2-icon.swal2-warning) {
  color: #F59E0B !important;
}

:deep(.swal-popup-dark .swal2-timer-progress-bar) {
  background: #4F46E5 !important;
}

:deep(.swal-popup-dark .swal2-confirm) {
  background: #4F46E5 !important;
  color: white !important;
  border-radius: 10px !important;
  padding: 10px 24px !important;
  font-weight: 600 !important;
}

:deep(.swal-popup-dark .swal2-cancel) {
  background: #334155 !important;
  color: #94a3b8 !important;
  border-radius: 10px !important;
  padding: 10px 24px !important;
  font-weight: 600 !important;
}

:deep(.swal-popup-dark .swal2-cancel:hover) {
  background: #475569 !important;
}

/* SweetAlert2 Light Mode Styles */
:deep(.swal-popup-soft) {
  border-radius: 16px !important;
  padding: 1.5rem !important;
  background: #ffffff !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15) !important;
}

:deep(.swal-popup-soft .swal2-title) {
  color: #1F2937 !important;
  font-weight: 700 !important;
  font-size: 1.3rem !important;
}

:deep(.swal-popup-soft .swal2-html-container) {
  color: #4B5563 !important;
}

:deep(.swal-popup-soft .swal2-icon.swal2-success) {
  color: #10B981 !important;
}

:deep(.swal-popup-soft .swal2-icon.swal2-question) {
  color: #4F46E5 !important;
}

:deep(.swal-popup-soft .swal2-icon.swal2-error) {
  color: #EF4444 !important;
}

:deep(.swal-popup-soft .swal2-icon.swal2-warning) {
  color: #F59E0B !important;
}

:deep(.swal-popup-soft .swal2-timer-progress-bar) {
  background: #4F46E5 !important;
}

:deep(.swal-btn-confirm) {
  background: #4F46E5 !important;
  color: white !important;
  border-radius: 10px !important;
  padding: 10px 24px !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}

:deep(.swal-btn-confirm:hover) {
  background: #4338CA !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(79,70,229,0.3) !important;
}

:deep(.swal-btn-cancel) {
  background: #F3F4F6 !important;
  color: #6B7280 !important;
  border-radius: 10px !important;
  padding: 10px 24px !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}

:deep(.swal-btn-cancel:hover) {
  background: #E5E7EB !important;
  transform: translateY(-2px) !important;
}

:deep(.swal-btn-success) {
  background: #10B981 !important;
  color: white !important;
  border-radius: 10px !important;
  padding: 10px 24px !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}

:deep(.swal-btn-success:hover) {
  background: #059669 !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important;
}

:deep(.swal-popup-soft .swal2-icon) {
  border-color: transparent !important;
}

:deep(.swal-popup-dark .swal2-icon) {
  border-color: transparent !important;
}

/* Rest of the styles remain the same */
.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-content {
  padding: 0;
  background: #f1f5f9;
  flex: 1;
}

body.dark-mode .page-content {
  background: #0f172a;
}

.pos-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
}

.pos-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  z-index: 10;
}

body.dark-mode .pos-header {
  background: #1e293b;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-left h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #4F46E5;
}

.branch-info {
  font-size: 0.7rem;
  color: var(--text-muted);
  padding: 0.2rem 0.6rem;
  background: var(--bg-light);
  border-radius: 50px;
}

body.dark-mode .branch-info {
  background: rgba(255,255,255,0.05);
}

.header-center {
  flex: 1;
  max-width: 400px;
  margin: 0 1.5rem;
}

.search-box {
  display: flex;
  align-items: center;
  background: var(--bg-light);
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

body.dark-mode .search-box {
  background: #2d3748;
}

.search-box:focus-within {
  border-color: #4F46E5;
  background: white;
}

body.dark-mode .search-box:focus-within {
  background: #2d3748;
}

.search-box i {
  color: var(--text-muted);
  margin-right: 0.5rem;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  width: 100%;
  font-size: 0.85rem;
  color: var(--text-light);
}

body.dark-mode .search-box input {
  color: var(--text-dark);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-light);
}

body.dark-mode .user-info {
  color: var(--text-dark);
}

.btn-logout {
  background: none;
  border: none;
  color: #EF4444;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem;
  transition: color 0.2s ease;
}

.btn-logout:hover {
  color: #DC2626;
}

.pos-main {
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 0.75rem;
  gap: 0.75rem;
}

.product-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .product-section {
  background: #1e293b;
}

.category-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--border-light);
  overflow-x: auto;
  flex-shrink: 0;
}

body.dark-mode .category-tabs {
  border-bottom-color: var(--border-dark);
}

.category-tab {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 6px;
  background: var(--bg-light);
  color: var(--text-light);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s ease;
}

body.dark-mode .category-tab {
  background: rgba(255,255,255,0.05);
  color: var(--text-dark);
}

.category-tab:hover {
  background: #E5E7EB;
}

body.dark-mode .category-tab:hover {
  background: rgba(255,255,255,0.1);
}

.category-tab.active {
  background: #4F46E5;
  color: white;
}

.product-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
  padding: 0.75rem;
  overflow-y: auto;
  align-content: start;
}

.product-card {
  background: var(--bg-light);
  border-radius: 10px;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  border: 2px solid transparent;
}

body.dark-mode .product-card {
  background: rgba(255,255,255,0.03);
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: #4F46E5;
}

.product-card.out-of-stock {
  opacity: 0.6;
  cursor: not-allowed;
  border-color: #EF4444;
}

.product-card.out-of-stock:hover {
  transform: none;
  box-shadow: none;
  border-color: #EF4444;
}

.product-image {
  width: 70px;
  height: 70px;
  margin: 0 auto 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E5E7EB;
  border-radius: 50%;
  overflow: hidden;
}

body.dark-mode .product-image {
  background: #2d3748;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-image i {
  font-size: 1.8rem;
  color: #6B7280;
}

.product-name {
  margin: 0.25rem 0;
  font-weight: 600;
  font-size: 0.85rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-price {
  font-weight: 700;
  color: #4F46E5;
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.product-stock {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.product-stock.text-danger {
  color: #EF4444 !important;
}

.product-stock.text-muted {
  color: var(--text-muted) !important;
}

.badge-danger {
  background: #EF4444;
  color: white;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.6rem;
  margin-left: 0.25rem;
}

.no-products {
  grid-column: 1 / -1;
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
}

.no-products i {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.cart-section {
  width: 380px;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}

body.dark-mode .cart-section {
  background: #1e293b;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

body.dark-mode .cart-header {
  border-bottom-color: var(--border-dark);
}

.cart-header h5 {
  margin: 0;
  font-weight: 700;
  font-size: 0.95rem;
}

.cart-count {
  background: #4F46E5;
  color: white;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.empty-cart {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-muted);
}

.empty-cart i {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.5rem;
}

.cart-item {
  display: flex;
  align-items: center;
  padding: 0.4rem 0.5rem;
  border-bottom: 1px solid var(--border-light);
  gap: 0.5rem;
}

body.dark-mode .cart-item {
  border-bottom-color: var(--border-dark);
}

.item-image {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: center;
}

body.dark-mode .item-image {
  background: #2d3748;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-image i {
  font-size: 0.8rem;
  color: #6B7280;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  font-weight: 500;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-price {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.item-controls {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.btn-qty {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: var(--bg-light);
  cursor: pointer;
  font-weight: 700;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

body.dark-mode .btn-qty {
  background: rgba(255,255,255,0.05);
}

.btn-qty:hover {
  background: #E5E7EB;
}

body.dark-mode .btn-qty:hover {
  background: rgba(255,255,255,0.1);
}

.item-qty {
  font-weight: 600;
  min-width: 20px;
  text-align: center;
  font-size: 0.85rem;
}

.btn-remove {
  background: none;
  border: none;
  color: #EF4444;
  cursor: pointer;
  padding: 0.2rem;
  font-size: 0.7rem;
}

.cart-totals {
  padding: 0.75rem 1rem;
  border-top: 2px solid var(--border-light);
  flex-shrink: 0;
}

body.dark-mode .cart-totals {
  border-top-color: var(--border-dark);
}

.total-row {
  display: flex;
  justify-content: space-between;
  padding: 0.2rem 0;
  font-size: 0.85rem;
}

.grand-total {
  font-weight: 700;
  font-size: 1rem;
  padding: 0.4rem 0;
  border-top: 1px solid var(--border-light);
  margin-top: 0.2rem;
}

body.dark-mode .grand-total {
  border-top-color: var(--border-dark);
}

.payment-section {
  margin: 0.4rem 0;
}

.input-group {
  margin-bottom: 0.4rem;
}

.input-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 0.2rem;
}

.form-control {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 2px solid var(--border-light);
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  color: var(--text-light);
}

body.dark-mode .form-control {
  background: #2d3748;
  border-color: var(--border-dark);
  color: var(--text-dark);
}

.form-control:focus {
  outline: none;
  border-color: #4F46E5;
}

.form-control:disabled,
.form-control[readonly] {
  background-color: #f3f4f6;
  opacity: 0.7;
  cursor: not-allowed;
}

body.dark-mode .form-control:disabled,
body.dark-mode .form-control[readonly] {
  background-color: #374151;
}

.change-display {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0.6rem;
  background: var(--bg-light);
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
}

body.dark-mode .change-display {
  background: rgba(255,255,255,0.03);
}

.change-amount {
  color: #10B981;
}

.quick-payment {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.3rem;
}

.btn-outline-primary {
  background: transparent;
  border: 2px solid #4F46E5;
  color: #4F46E5;
}

.btn-outline-primary:hover {
  background: #4F46E5;
  color: white;
}

.cart-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #4F46E5;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4338CA;
}

.btn-secondary {
  background: #E5E7EB;
  color: #1F2937;
}

.btn-secondary:hover {
  background: #D1D5DB;
}

body.dark-mode .btn-secondary {
  background: #2d3748;
  color: #E2E8F0;
}

body.dark-mode .btn-secondary:hover {
  background: #374151;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loading-spinner {
  background: white;
  padding: 2rem 3rem;
  border-radius: 16px;
  text-align: center;
}

body.dark-mode .loading-spinner {
  background: var(--bg-card);
}

.loading-spinner i {
  font-size: 2rem;
  color: var(--primary);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { rotate: 360deg; }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideDown 0.3s ease;
}

body.dark-mode .modal-content {
  background: #1e293b;
}

.receipt-modal {
  max-width: 500px;
}

.receipt-modal .modal-body {
  max-height: 60vh;
  overflow-y: auto;
}

@keyframes slideDown {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-light);
}

body.dark-mode .modal-header {
  border-bottom-color: var(--border-dark);
}

.modal-header h5 {
  margin: 0;
  font-weight: 700;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6B7280;
}

.btn-close:hover {
  color: #1F2937;
}

body.dark-mode .btn-close {
  color: #9CA3AF;
}

body.dark-mode .btn-close:hover {
  color: #E2E8F0;
}

.modal-footer {
  display: flex;
  gap: 0.5rem;
  padding: 1.5rem;
  border-top: 1px solid var(--border-light);
}

body.dark-mode .modal-footer {
  border-top-color: var(--border-dark);
}

/* Receipt Styles */
.receipt-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.receipt-header h2 {
  margin: 0;
  color: #4F46E5;
  font-weight: 700;
}

body.dark-mode .receipt-header h2 {
  color: #818CF8;
}

.branch {
  font-weight: 600;
  margin: 0.25rem 0;
}

.address {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0.1rem 0;
}

.receipt-info {
  font-size: 0.9rem;
  margin: 0.25rem 0;
  text-align: left;
}

.divider {
  border-top: 1px dashed var(--border-light);
  margin: 0.75rem 0;
}

body.dark-mode .divider {
  border-top-color: var(--border-dark);
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.items-table th {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-light);
}

body.dark-mode .items-table th {
  border-bottom-color: var(--border-dark);
  color: #94a3b8;
}

.items-table td {
  padding: 0.4rem 0;
}

.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

.receipt-totals {
  margin-top: 0.5rem;
}

.receipt-totals .total-row {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  font-size: 0.9rem;
}

.receipt-totals .grand-total {
  font-size: 1.1rem;
  padding: 0.5rem 0;
  border-top: 2px solid var(--border-light);
  border-bottom: 2px solid var(--border-light);
  margin: 0.5rem 0;
}

body.dark-mode .receipt-totals .grand-total {
  border-top-color: var(--border-dark);
  border-bottom-color: var(--border-dark);
}

.receipt-footer {
  text-align: center;
  margin-top: 1.5rem;
}

.thank-you {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4F46E5;
}

body.dark-mode .thank-you {
  color: #818CF8;
}

.return-policy,
.support {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0.25rem 0;
}

.timestamp {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0.25rem 0;
}

/* Print container styles */
#print-container {
  font-family: 'Courier New', monospace;
}

#print-container .receipt-header {
  text-align: center;
  margin-bottom: 15px;
}

#print-container .receipt-header h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: #000;
}

#print-container .branch {
  font-weight: 600;
  font-size: 14px;
  margin: 5px 0;
}

#print-container .address {
  font-size: 12px;
  color: #666;
  margin: 2px 0;
}

#print-container .divider {
  border-top: 1px dashed #999;
  margin: 10px 0;
}

#print-container .receipt-info {
  font-size: 12px;
  margin: 3px 0;
  display: flex;
  justify-content: space-between;
}

#print-container .items-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  margin: 5px 0;
}

#print-container .items-table th {
  font-size: 11px;
  text-transform: uppercase;
  color: #666;
  padding-bottom: 5px;
  border-bottom: 1px solid #ccc;
  text-align: left;
}

#print-container .items-table td {
  padding: 4px 0;
  border-bottom: 1px dotted #eee;
}

#print-container .text-left { text-align: left; }
#print-container .text-center { text-align: center; }
#print-container .text-right { text-align: right; }

#print-container .receipt-totals {
  margin-top: 10px;
}

#print-container .total-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 13px;
}

#print-container .grand-total {
  font-size: 16px;
  padding: 8px 0;
  border-top: 2px solid #000;
  border-bottom: 2px solid #000;
  margin: 5px 0;
  font-weight: 700;
}

#print-container .receipt-footer {
  text-align: center;
  margin-top: 15px;
}

#print-container .thank-you {
  font-size: 14px;
  font-weight: 600;
  margin: 5px 0;
}

#print-container .return-policy,
#print-container .support {
  font-size: 10px;
  color: #666;
  margin: 3px 0;
}

#print-container .timestamp {
  font-size: 11px;
  color: #666;
  margin: 5px 0;
}

.text-muted {
  color: var(--text-muted);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #CBD5E1;
  border-radius: 2px;
}

body.dark-mode ::-webkit-scrollbar-thumb {
  background: #475569;
}

/* Variables */
:root {
  --text-muted: #6B7280;
  --text-light: #1F2937;
  --text-dark: #E2E8F0;
  --bg-light: #F3F4F6;
  --bg-card: #1E293B;
  --border-light: #E5E7EB;
  --border-dark: #334155;
}

body.dark-mode {
  --text-muted: #94A3B8;
  --text-light: #E2E8F0;
  --text-dark: #F1F5F9;
  --bg-light: #2D3748;
  --border-light: #334155;
}

/* Responsive */
@media (max-width: 1024px) {
  .cart-section {
    width: 320px;
  }
}

@media (max-width: 768px) {
  .pos-main {
    flex-direction: column;
    padding: 0.5rem;
  }
  
  .cart-section {
    width: 100%;
    max-height: 50vh;
  }
  
  .pos-header {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
  }
  
  .header-center {
    order: 3;
    flex: 1 1 100%;
    margin: 0;
  }
  
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  }
  
  .modal-content {
    max-width: 100%;
    margin: 1rem;
  }
  
  .modal-footer {
    flex-direction: column;
  }
}
</style>