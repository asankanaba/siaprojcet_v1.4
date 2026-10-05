<template>
  <div v-if="visible" class="receipt-overlay" @click.self="close">
    <div class="receipt-wrapper">
      
      <!-- === THE RECEIPT PAPER === -->
      <div class="receipt-paper" ref="receiptRef">
        <div class="receipt-header">
          <h1 class="store-name">SKYMART</h1>
          <p class="store-address">SKYMART RETAIL INC.</p>
          <p class="store-address">VISION PROPERTIES DEVELOPMENT CORPORATION</p>
          <p class="store-address">GOVERNORS DRIVE MANGANAN</p>
          <p class="store-address">4107 CITY OF GENERAL TRAILS CAVITA PHILIPP</p>
          <p class="store-tin">VAT REG TIN: 659-167-901-00002</p>
          <div class="divider"></div>
          
          <div class="receipt-info">
            <p><strong>TERMINAL#:</strong> P10</p>
            <p><strong>SI#:</strong> {{ sale?.invoice_number || 'N/A' }}</p>
            <p><strong>TRAN#:</strong> {{ sale?.invoice_number || 'N/A' }}</p>
            <p><strong>CASHIER:</strong> {{ sale?.cashier_name || 'CASHIER' }}</p>
            <p><strong>ID#:</strong> {{ sale?.cashier_id || 'N/A' }}</p>
            <p><strong>REF#:</strong> {{ sale?.reference || 'N/A' }}</p>
            <p><strong>DATE:</strong> {{ formatDate(sale?.created_at) }}</p>
            <p><strong>TIME:</strong> {{ formatTime(sale?.created_at) }}</p>
          </div>
          <div class="divider"></div>
        </div>

        <!-- Items Table -->
        <table class="receipt-table">
          <thead>
            <tr>
              <th>QTY.</th>
              <th>DESCRIPTION</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in saleItems" :key="item.id">
              <td>{{ item.quantity }}</td>
              <td>
                {{ item.product_name }}
                <br>
                <span class="item-detail">@P{{ formatPrice(item.price) }}</span>
              </td>
              <td>{{ formatPrice(item.total) }}</td>
            </tr>
          </tbody>
        </table>

        <div class="divider"></div>

        <!-- Totals -->
        <div class="receipt-totals">
          <div class="total-row">
            <span>Total gross value:</span>
            <span>{{ formatPrice(sale?.total || 0) }}</span>
          </div>
          <div class="total-row">
            <span>Tran. Discount:</span>
            <span>{{ formatPrice(sale?.discount || 0) }}</span>
          </div>
          <div class="divider"></div>
          <div class="total-row">
            <span><strong>Total QTY:</strong></span>
            <span><strong>{{ totalQuantity }}</strong></span>
          </div>
          <div class="total-row">
            <span>VATABLE SALE:</span>
            <span>{{ formatPrice(vatableSale) }}</span>
          </div>
          <div class="total-row">
            <span>VAT AMOUNT:</span>
            <span>{{ formatPrice(vatAmount) }}</span>
          </div>
          <div class="divider"></div>
          <div class="total-row grand-total">
            <span><strong>AMOUNT DUE:</strong></span>
            <span><strong>{{ formatPrice(sale?.total || 0) }}</strong></span>
          </div>
          <div class="total-row">
            <span>CASH:</span>
            <span>{{ formatPrice(sale?.payment_amount || 0) }}</span>
          </div>
          <div class="total-row">
            <span>Change:</span>
            <span>{{ formatPrice(sale?.change_amount || 0) }}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="receipt-footer">
          <p>SHOPIFY SYSTEMS INC.</p>
          <p>2361 JUAN LUNA ST. BRGY 167 ZONE 15</p>
          <p>1012 TONDO I/II NCR. CITY OF MANILA</p>
          <div class="divider"></div>
          <div class="footer-message">
            <p><strong>SALES INVOICE</strong></p>
            <p>THANK YOU AND COME AGAIN!</p>
          </div>
        </div>
      </div>

      <!-- === OVERLAY BUTTONS === -->
      <div class="overlay-actions">
        <button @click="printReceipt" class="btn btn-primary">
          <i class="fas fa-print"></i> Print Receipt
        </button>
        <button @click="close" class="btn btn-secondary">
          <i class="fas fa-times"></i> Close & Continue
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  sale: { type: Object, default: () => ({}) },
  saleItems: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:visible', 'close'])
const receiptRef = ref(null)

const totalQuantity = computed(() => props.saleItems.reduce((sum, item) => sum + item.quantity, 0))
const vatableSale = computed(() => props.sale?.subtotal || 0)
const vatAmount = computed(() => props.sale?.tax || 0)

const formatPrice = (amount) => Number(amount).toFixed(2)
const formatDate = (date) => {
  if (!date) return '07/07/2026'
  return new Date(date).toLocaleDateString('en-PH', { month: '2-digit', day: '2-digit', year: 'numeric' })
}
const formatTime = (date) => {
  if (!date) return '16:46:14'
  return new Date(date).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

const close = () => {
  emit('update:visible', false)
  emit('close')
}

const printReceipt = async () => {
  await nextTick()
  window.print()
}
</script>

<style scoped>
/* Main Overlay */
.receipt-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1.5rem;
}

.receipt-wrapper {
  background: #1a1a2e;
  padding: 1.5rem;
  border-radius: 20px;
  max-width: 450px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 60px rgba(0,0,0,0.7);
}

/* Receipt Styles */
.receipt-paper {
  background: white;
  padding: 1.5rem;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
  color: #333;
  border-radius: 12px;
}
.receipt-header { text-align: center; }
.store-name { font-size: 18px; font-weight: 700; margin: 0; letter-spacing: 2px; }
.store-address { font-size: 9px; margin: 2px 0; color: #555; }
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
.footer-message { margin-top: 8px; }
.footer-message p { margin: 3px 0; font-size: 10px; }

/* Buttons */
.overlay-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}
.btn-primary { background: #F59E0B; color: #1a1a2e; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(245,158,11,0.3); }
.btn-secondary { background: #374151; color: white; }
.btn-secondary:hover { background: #4B5563; }

/* ============================================== */
/*           BULLETPROOF PRINT STYLES             */
/* ============================================== */
@media print {
  @page {
    margin: 0 !important;      /* Removes browser margins */
    size: auto !important;     /* Auto-sizes paper */
  }

  /* 1. Hide ALL app layout elements (Sidebar, Navbar, POS, Cart) */
  .app-layout, 
  .sidebar, 
  .main-content, 
  .navbar, 
  .page-content,
  .pos-container,
  .pos-layout,
  .pos-products,
  .pos-cart,
  .cart-container,
  .cart-body,
  .cart-footer,
  .cart-header {
    display: none !important;
  }

  /* 2. Reset body and HTML to be completely pure white and take full page */
  html, body {
    background: white !important;
    margin: 0 !important;
    padding: 0 !important;
    height: 100% !important;
    width: 100% !important;
  }

  /* 3. Force ONLY the overlay and wrapper to be visible */
  .receipt-overlay,
  .receipt-wrapper,
  .receipt-paper,
  .receipt-overlay *,
  .receipt-wrapper *,
  .receipt-paper * {
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }

  /* 4. Reset the overlay to be a full-page white background */
  .receipt-overlay {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    background: white !important;
    backdrop-filter: none !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    z-index: 0 !important;
  }

  /* 5. Remove dark wrapper background */
  .receipt-wrapper {
    background: white !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 0 !important;
    max-width: 100% !important;
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    overflow: hidden !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
  }

  /* 6. Maximize and center the receipt paper */
  .receipt-paper {
    background: white !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 40px 20px !important;
    width: 320px !important;
    height: auto !important;
    margin: 0 auto !important;
    font-size: 11px !important;
  }

  /* 7. Hide the buttons */
  .overlay-actions {
    display: none !important;
  }
}
</style>