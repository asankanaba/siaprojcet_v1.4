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
import { ref } from 'vue'
import { useCartStore } from '../../stores/cart'
import { useAuthStore } from '../../stores/auth'
import api from '../../api/index.js'
import PrintReceiptModal from './PrintReceiptModal.vue'
import { getImageUrl, PLACEHOLDER } from '@/utils/imageHelper'

const cartStore = useCartStore()
const authStore = useAuthStore()
const processing = ref(false)
const showPrintModal = ref(false)
const lastSaleData = ref({})
const lastSaleItems = ref([])
const cashAmount = ref(0)
const paymentMethod = ref('cash')

const formatCurrency = (amount) => '₱' + Number(amount).toFixed(2)

// ✅ Uses imageHelper — picks the correct base URL automatically
const getCartItemImage = (item) => {
  if (!item) return PLACEHOLDER
  return getImageUrl(item.image_url || item.image, 'products')
}

const handleCartImageError = (event) => {
  event.target.src = PLACEHOLDER
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

      // ✅ AUTOMATICALLY ADD TO FINANCE TRANSACTIONS
      try {
        await api.post('/transactions.php', {
          user_id: authStore.user?.id || 1,
          type: 'income',
          amount: saleData.total,
          category: 'POS Sales',
          description: `Sale #${response.data.invoice_number}`,
          payment_method: saleData.payment_method,
          date: new Date().toISOString().split('T')[0]
        })
        console.log('✅ Transaction auto-logged to Finance')
      } catch (e) {
        console.warn('Failed to log transaction, but sale completed:', e)
      }

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
.cart-container {
  background: white;
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

body.dark-mode .cart-container {
  background: var(--bg-card);
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}

/* Header */
.cart-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

body.dark-mode .cart-header {
  border-bottom-color: var(--border-dark);
}

.cart-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cart-header-left i {
  font-size: 1.25rem;
  color: var(--primary);
}

.cart-header-left h5 {
  margin: 0;
  font-weight: 700;
}

.badge {
  background: var(--primary);
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Body */
.cart-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1.25rem;
}

.cart-body::-webkit-scrollbar {
  width: 4px;
}

.cart-body::-webkit-scrollbar-track {
  background: var(--bg-light);
  border-radius: 2px;
}

.cart-body::-webkit-scrollbar-thumb {
  background: var(--primary);
  border-radius: 2px;
}

/* Empty State */
.cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem 0;
}

.cart-empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: var(--bg-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

body.dark-mode .cart-empty-icon {
  background: rgba(255,255,255,0.05);
}

.cart-empty p {
  font-weight: 600;
  color: var(--text-light);
  margin: 0;
}

body.dark-mode .cart-empty p {
  color: var(--text-dark);
}

.cart-empty-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Cart Items */
.cart-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-light);
}

body.dark-mode .cart-item {
  border-bottom-color: var(--border-dark);
}

.cart-item:last-child {
  border-bottom: none;
}

.cart-item-image {
  width: 50px;
  height: 50px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-light);
  border: 1px solid var(--border-light);
}

body.dark-mode .cart-item-image {
  background: rgba(255,255,255,0.05);
  border-color: var(--border-dark);
}

.cart-item-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cart-item-info {
  flex: 1;
  min-width: 0;
}

.cart-item-name {
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cart-item-price-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.cart-item-total {
  font-weight: 600;
  color: var(--primary);
}

.cart-item-stock-limit {
  font-size: 0.65rem;
  color: #EF4444;
}

.cart-item-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-light);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

body.dark-mode .qty-btn {
  border-color: var(--border-dark);
  color: var(--text-dark);
}

.qty-btn:hover:not(:disabled) {
  background: var(--bg-light);
}

body.dark-mode .qty-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.05);
}

.qty-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.qty-number {
  min-width: 24px;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.remove-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid #FEE2E2;
  background: transparent;
  color: #EF4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-left: 0.25rem;
}

.remove-btn:hover {
  background: #FEE2E2;
}

body.dark-mode .remove-btn {
  border-color: rgba(239,68,68,0.3);
  color: #F87171;
}

body.dark-mode .remove-btn:hover {
  background: rgba(239,68,68,0.2);
}

/* Footer */
.cart-footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-light);
  background: var(--bg-light);
  border-radius: 0 0 16px 16px;
  flex-shrink: 0;
}

body.dark-mode .cart-footer {
  border-top-color: var(--border-dark);
  background: rgba(255,255,255,0.02);
}

.cart-totals {
  margin-bottom: 0.75rem;
}

.cart-total-row {
  display: flex;
  justify-content: space-between;
  padding: 0.125rem 0;
  font-size: 0.9rem;
}

.cart-total-row.total {
  border-top: 2px solid var(--border-light);
  padding-top: 0.5rem;
  margin-top: 0.25rem;
  font-weight: 700;
  font-size: 1.05rem;
}

body.dark-mode .cart-total-row.total {
  border-top-color: var(--border-dark);
}

.payment-section {
  margin-bottom: 0.75rem;
}

.form-group {
  margin-bottom: 0.5rem;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 0.8rem;
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid var(--border-light);
  border-radius: 8px;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  background: white;
  color: var(--text-light);
  font-family: inherit;
}

body.dark-mode .form-control {
  background: #2D3748;
  border-color: var(--border-dark);
  color: var(--text-dark);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(79,70,229,0.1);
}

body.dark-mode .form-control:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(79,70,229,0.2);
}

.change-display {
  margin-top: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: white;
  border-radius: 8px;
  border: 2px solid var(--border-light);
}

body.dark-mode .change-display {
  background: var(--bg-dark);
  border-color: var(--border-dark);
}

.change-row {
  display: flex;
  justify-content: space-between;
  padding: 0.125rem 0;
  font-size: 0.85rem;
}

.change-amount {
  font-weight: 700;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border-light);
  color: var(--success);
}

.change-insufficient {
  color: var(--danger);
}

.cart-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn-pay {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.95rem;
}

.btn-pay:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(79,70,229,0.3);
}

.btn-pay:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-clear {
  width: 100%;
  padding: 0.6rem;
  background: var(--bg-light);
  color: var(--text-light);
  border: 2px solid var(--border-light);
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

body.dark-mode .btn-clear {
  background: rgba(255,255,255,0.05);
  color: var(--text-dark);
  border-color: var(--border-dark);
}

.btn-clear:hover:not(:disabled) {
  background: var(--border-light);
}

body.dark-mode .btn-clear:hover:not(:disabled) {
  background: rgba(255,255,255,0.1);
}

.btn-clear:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.stock-limit-reached {
  opacity: 0.7;
}

.cart-body {
  scrollbar-width: thin;
  scrollbar-color: var(--primary) transparent;
}

@media (max-width: 768px) {
  .cart-container { border-radius: 12px; }
  .cart-header { padding: 0.75rem 1rem; }
  .cart-body { padding: 0.5rem 1rem; }
  .cart-footer { padding: 0.75rem 1rem; }
  .cart-item-image { width: 40px; height: 40px; }
}
</style>