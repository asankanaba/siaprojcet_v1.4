<template>
  <div class="cart-container">
    <!-- Header -->
    <div class="cart-header">
      <div class="cart-header-left">
        <i class="fas fa-shopping-cart"></i>
        <h5>Cart</h5>
      </div>
      <span class="badge badge-primary">{{ cartStore.itemCount }} items</span>
    </div>
    
    <!-- Cart Items -->
    <div class="cart-body">
      <div v-if="cartStore.items.length === 0" class="cart-empty">
        <div class="cart-empty-icon">
          <i class="fas fa-cart-plus"></i>
        </div>
        <p>Your cart is empty</p>
        <p class="cart-empty-sub">Start adding products!</p>
      </div>
      
      <div
        v-for="item in cartStore.items"
        :key="item.product_id"
        class="cart-item"
        :class="{ 'stock-limit-reached': item.quantity >= item.max_stock }"
      >
        <div class="cart-item-image">
          <img 
            :src="getCartItemImage(item)" 
            :alt="item.name"
            class="cart-item-img"
            @error="handleCartImageError"
          />
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">{{ item.name }}</div>
          <div class="cart-item-price-row">
            <span class="cart-item-price">{{ formatCurrency(item.price) }} × {{ item.quantity }}</span>
            <span class="cart-item-total">{{ formatCurrency(item.price * item.quantity) }}</span>
          </div>
          <div v-if="item.quantity >= item.max_stock" class="cart-item-stock-limit">
            <i class="fas fa-exclamation-triangle"></i> Max stock reached ({{ item.max_stock }})
          </div>
        </div>
        <div class="cart-item-actions">
          <button 
            class="qty-btn"
            @click="cartStore.updateQuantity(item.product_id, item.quantity - 1)"
            :disabled="item.quantity <= 1"
          >
            <i class="fas fa-minus"></i>
          </button>
          <span class="qty-number">{{ item.quantity }}</span>
          <button 
            class="qty-btn"
            @click="cartStore.updateQuantity(item.product_id, item.quantity + 1)"
            :disabled="item.quantity >= item.max_stock"
          >
            <i class="fas fa-plus"></i>
          </button>
          <button 
            class="remove-btn"
            @click="cartStore.removeItem(item.product_id)"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Cart Footer -->
    <div v-if="cartStore.items.length > 0" class="cart-footer">
      <!-- Totals -->
      <div class="cart-totals">
        <div class="cart-total-row">
          <span>Subtotal</span>
          <span>{{ formatCurrency(cartStore.subtotal) }}</span>
        </div>
        <div class="cart-total-row">
          <span>Tax ({{ (cartStore.tax_rate * 100).toFixed(1) }}% {{ cartStore.tax_type === 'inclusive' ? 'included' : 'added' }})</span>
          <span>{{ formatCurrency(cartStore.tax) }}</span>
        </div>
        <div class="cart-total-row" v-if="cartStore.discount > 0">
          <span>Discount</span>
          <span>-{{ formatCurrency(cartStore.discount) }}</span>
        </div>
        <div class="cart-total-row total">
          <span>Total</span>
          <span style="color:var(--primary);">{{ formatCurrency(cartStore.total) }}</span>
        </div>
      </div>
      
      <!-- Payment Section -->
      <div class="payment-section">
        <div class="form-group">
          <label class="form-label">Payment Method</label>
          <select v-model="paymentMethod" class="form-control">
            <option value="cash">Cash</option>
            <option value="gcash">GCash</option>
            <option value="maya">Maya</option>
            <option value="card">Card</option>
          </select>
        </div>
        
        <div v-if="paymentMethod === 'cash'" class="form-group">
          <label class="form-label">Cash Amount Received</label>
          <input 
            v-model.number="cashAmount" 
            type="number" 
            class="form-control" 
            placeholder="Enter cash amount"
            min="0"
            step="0.01"
          />
          <div v-if="cashAmount > 0" class="change-display">
            <div class="change-row">
              <span>Total:</span>
              <span>{{ formatCurrency(cartStore.total) }}</span>
            </div>
            <div class="change-row">
              <span>Cash:</span>
              <span>{{ formatCurrency(cashAmount) }}</span>
            </div>
            <div class="change-row change-amount" :class="{ 'change-insufficient': cashAmount < cartStore.total }">
              <span>Change:</span>
              <span>{{ cashAmount >= cartStore.total ? formatCurrency(cashAmount - cartStore.total) : 'Insufficient' }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Buttons -->
      <div class="cart-actions">
        <button
          @click="processPayment"
          class="btn-pay"
          :disabled="cartStore.items.length === 0 || processing || (paymentMethod === 'cash' && cashAmount < cartStore.total)"
        >
          <span v-if="!processing">
            <i class="fas fa-credit-card"></i> Pay Now
          </span>
          <span v-else>
            <i class="fas fa-spinner spin"></i> Processing...
          </span>
        </button>
        <button
          @click="cartStore.clearCart()"
          class="btn-clear"
          :disabled="cartStore.items.length === 0"
        >
          <i class="fas fa-trash"></i> Clear Cart
        </button>
      </div>
    </div>
    
    <!-- Print Receipt Modal (In-page) -->
    <PrintReceiptModal
      v-model:visible="showPrintModal"
      :sale="lastSaleData"
      :sale-items="lastSaleItems"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useCartStore } from '../../stores/cart'
import { useAuthStore } from '../../stores/auth'
import api from '../../api/index.js'
import PrintReceiptModal from './PrintReceiptModal.vue'

const cartStore = useCartStore()
const authStore = useAuthStore()
const processing = ref(false)
const showPrintModal = ref(false)
const lastSaleData = ref({})
const lastSaleItems = ref([])
const cashAmount = ref(0)
const paymentMethod = ref('cash')

const API_BASE_URL = 'http://localhost/smart-pos-api'

const formatCurrency = (amount) => {
  return '₱' + Number(amount).toFixed(2)
}

const getCartItemImage = (item) => {
  if (!item) return ''
  if (item.image_url) {
    if (item.image_url.startsWith('/uploads/')) return `${API_BASE_URL}${item.image_url}`
    if (item.image_url.startsWith('http')) return item.image_url
    return `${API_BASE_URL}${item.image_url}`
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=4F46E5&color=fff&size=100`
}

const handleCartImageError = (event) => {
  const name = event.target.alt || 'Product'
  event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4F46E5&color=fff&size=100`
}

const processPayment = async () => {
  processing.value = true
  
  try {
    const saleData = {
      customer_id: cartStore.customer_id || null,
      user_id: authStore.user?.id || 1,
      items: cartStore.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      subtotal: cartStore.subtotal,
      discount: cartStore.discount || 0,
      tax: cartStore.tax,
      total: cartStore.total,
      payment_method: paymentMethod.value,
      payment_amount: paymentMethod.value === 'cash' ? cashAmount.value : cartStore.total,
      change_amount: paymentMethod.value === 'cash' ? cashAmount.value - cartStore.total : 0
    }
    
    const response = await api.post('/sales.php', saleData)
    
    if (response.data.success) {
      // Prepare data for the modal
      lastSaleData.value = {
        ...saleData,
        invoice_number: response.data.invoice_number,
        cashier_name: authStore.user?.full_name || 'Cashier',
        cashier_id: authStore.user?.id || 'N/A',
        reference: response.data.reference || 'N/A',
        created_at: new Date().toISOString()
      }
      
      // Prepare items for the modal
      lastSaleItems.value = cartStore.items.map(item => ({
        id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      }))
      
      // Show print modal instead of navigating
      showPrintModal.value = true
      
      cartStore.clearCart()
      cashAmount.value = 0
      window.dispatchEvent(new Event('refresh-products'))
    } else {
      alert('Transaction failed: ' + (response.data.message || 'Unknown error'))
    }
  } catch (error) {
    console.error('Payment error:', error)
    alert('Error processing payment: ' + (error.response?.data?.message || 'Network error'))
  } finally {
    processing.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-container {
  background: #1a1a2e;
  padding: 1.5rem;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  position: relative;
}

.receipt-paper {
  background: white;
  padding: 20px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #333;
  width: 100%;
  border-radius: 8px;
}

.receipt-header { text-align: center; }
.store-name { font-size: 18px; font-weight: 700; margin: 0; letter-spacing: 2px; }
.store-address { font-size: 9px; margin: 2px 0; color: #333; }
.store-tin { font-size: 9px; margin: 4px 0; }
.divider { border-top: 1px dashed #999; margin: 8px 0; }
.receipt-info p { margin: 2px 0; font-size: 10px; }

.receipt-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
.receipt-table th { text-align: left; font-size: 10px; border-bottom: 1px solid #999; padding: 4px 0; }
.receipt-table td { padding: 4px 0; vertical-align: top; font-size: 10px; }
.receipt-table td:last-child { text-align: right; }
.item-detail { font-size: 9px; color: #666; }

.receipt-totals { margin: 8px 0; }
.total-row { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; }
.grand-total { font-size: 13px; padding: 4px 0; }

.receipt-footer { text-align: center; font-size: 9px; }
.receipt-footer p { margin: 2px 0; }
.footer-message { margin-top: 8px; }
.footer-message p { margin: 3px 0; font-size: 10px; }

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #F59E0B;
  color: #1a1a2e;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(245,158,11,0.3); }

.btn-secondary {
  background: #374151;
  color: white;
}
.btn-secondary:hover { background: #4B5563; }

/* Print Styles */
@media print {
  body * { visibility: hidden; }
  .modal-container, .modal-container * { visibility: visible; }
  .modal-container { position: absolute; left: 0; top: 0; background: none; box-shadow: none; padding: 0; max-width: 100%; }
  .modal-actions { display: none !important; }
  .modal-overlay { background: none; backdrop-filter: none; }
  .receipt-paper { border-radius: 0; padding: 10px; }
}
</style>