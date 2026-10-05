<template>
  <div class="print-container">
    <div class="receipt-paper" ref="receiptRef">
      <!-- Header -->
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
          <p><strong>SI#:</strong> {{ sale?.invoice_number || '0216P10/000000003336' }}</p>
          <p><strong>TRAN#:</strong> {{ sale?.invoice_number || 'P10/000000003336' }}</p>
          <p><strong>CASHIER:</strong> {{ sale?.cashier_name || 'CHRISTINE CABANGUNAY' }}</p>
          <p><strong>ID#:</strong> {{ sale?.cashier_id || '0216_C0003' }}</p>
          <p><strong>REF#:</strong> {{ sale?.reference || '202607070141' }}</p>
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
              <span class="item-detail">@P{{ formatPrice(item.price) }} | 0.00%</span>
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
          <span>{{ formatPrice(sale?.total || 206.95) }}</span>
        </div>
        <div class="total-row">
          <span>Tran. Discount:</span>
          <span>{{ formatPrice(sale?.discount || 0) }}</span>
        </div>
        <div class="total-row">
          <span>Regular discount:</span>
          <span>{{ formatPrice(0) }}</span>
        </div>
        <div class="total-row">
          <span>0% SC/PWD/NAAC/SOLO+Disc:</span>
          <span>{{ formatPrice(0) }}</span>
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
        <div class="total-row">
          <span>VAT EXEMPT SALE:</span>
          <span>{{ formatPrice(0) }}</span>
        </div>
        <div class="total-row">
          <span>ZERO-RATED SALE:</span>
          <span>{{ formatPrice(0) }}</span>
        </div>
        <div class="divider"></div>
        <div class="total-row grand-total">
          <span><strong>AMOUNT DUE:</strong></span>
          <span><strong>{{ formatPrice(sale?.total || 206.95) }}</strong></span>
        </div>
        <div class="total-row">
          <span>CASH:</span>
          <span>{{ formatPrice(sale?.payment_amount || 210) }}</span>
        </div>
        <div class="total-row">
          <span>Change:</span>
          <span>{{ formatPrice(sale?.change_amount || 3.05) }}</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Customer Information -->
      <div class="customer-info">
        <p><strong>Customer Information</strong></p>
        <p><strong>NAME:</strong> {{ sale?.customer_name || '' }}</p>
        <p><strong>TIN:</strong> {{ sale?.customer_tin || '' }}</p>
        <p><strong>ADDR:</strong> {{ sale?.customer_address || '' }}</p>
        <p><strong>SIGN:</strong> ___________________</p>
      </div>

      <div class="divider"></div>

      <!-- Footer -->
      <div class="receipt-footer">
        <p>SHOPIFY SYSTEMS INC.</p>
        <p>2361 JUAN LUNA ST. BRGY 167 ZONE 15</p>
        <p>1012 TONDO I/II NCR. CITY OF MANILA</p>
        <p>1ST DISTRICT, PHILIPPINES.</p>
        <div class="divider"></div>
        <p><strong>SUPPLIER TIN:</strong> 776-020-450-000</p>
        <p><strong>ACC NO.:</strong> 0297760204502023061813</p>
        <p><strong>ACC DATE:</strong> June 27, 2023</p>
        <p><strong>PERMIT NO.:</strong> FP072025-54B-05291458-00002</p>
        <p><strong>DATE ISSUED:</strong> Jul 04, 2025</p>
        <div class="divider"></div>
        <div class="footer-message">
          <p><strong>SALES INVOICE</strong></p>
          <p>BRING THE RECEIPT IN CASE OF EXCHANGE</p>
          <p>OF MERCHANDISE WITHIN 7 DAYS.</p>
          <p><strong>THANK YOU AND COME AGAIN!</strong></p>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="print-actions">
      <button @click="printReceipt" class="btn btn-primary">
        <i class="fas fa-print"></i> Print Receipt
      </button>
      <button @click="goBack" class="btn btn-secondary">
        <i class="fas fa-arrow-left"></i> Back
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/api/index.js'

const router = useRouter()
const route = useRoute()

const sale = ref(null)
const saleItems = ref([])
const receiptRef = ref(null)

const totalQuantity = computed(() => {
  return saleItems.value.reduce((sum, item) => sum + item.quantity, 0)
})

const vatableSale = computed(() => {
  return sale.value?.subtotal || 0
})

const vatAmount = computed(() => {
  return sale.value?.tax || 0
})

const formatPrice = (amount) => {
  return Number(amount).toFixed(2)
}

const formatDate = (date) => {
  if (!date) return '07/07/2026'
  return new Date(date).toLocaleDateString('en-PH', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  })
}

const formatTime = (date) => {
  if (!date) return '16:46:14'
  return new Date(date).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

const loadReceipt = async () => {
  try {
    const saleId = route.params.id
    const response = await api.get(`/sales.php?id=${saleId}`)
    sale.value = response.data
    
    // Get sale items
    const itemsResponse = await api.get(`/sale_items.php?sale_id=${saleId}`)
    saleItems.value = itemsResponse.data || []
  } catch (error) {
    console.error('Error loading receipt:', error)
    // Use mock data for demo
    sale.value = {
      invoice_number: '0216P10/000000003336',
      cashier_name: 'CHRISTINE CABANGUNAY',
      cashier_id: '0216_C0003',
      reference: '202607070141',
      created_at: '2026-07-07 16:46:14',
      total: 206.95,
      discount: 0,
      payment_amount: 210,
      change_amount: 3.05,
      subtotal: 184.78,
      tax: 22.17
    }
    saleItems.value = [
      { id: 1, product_name: 'b7391 dental floss', quantity: 1, price: 11.95, total: 11.95 },
      { id: 2, product_name: '#9006 tear-off trash bag', quantity: 1, price: 195.00, total: 195.00 }
    ]
  }
}

const printReceipt = () => {
  window.print()
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadReceipt()
})
</script>

<style scoped>
.print-container {
  padding: 20px;
  background: #f0f2f5;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.receipt-paper {
  background: white;
  width: 320px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 1.5;
}

.receipt-header {
  text-align: center;
}

.store-name {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  letter-spacing: 2px;
}

.store-address {
  font-size: 9px;
  margin: 2px 0;
  color: #333;
}

.store-tin {
  font-size: 9px;
  margin: 4px 0;
}

.divider {
  border-top: 1px dashed #999;
  margin: 8px 0;
}

.receipt-info p {
  margin: 2px 0;
  font-size: 10px;
}

.receipt-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
}

.receipt-table th {
  text-align: left;
  font-size: 10px;
  border-bottom: 1px solid #999;
  padding: 4px 0;
}

.receipt-table td {
  padding: 4px 0;
  vertical-align: top;
  font-size: 10px;
}

.receipt-table td:first-child {
  text-align: center;
}

.receipt-table td:last-child {
  text-align: right;
}

.item-detail {
  font-size: 9px;
  color: #666;
}

.receipt-totals {
  margin: 8px 0;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  padding: 2px 0;
}

.grand-total {
  font-size: 13px;
  padding: 4px 0;
}

.customer-info {
  font-size: 10px;
}

.customer-info p {
  margin: 2px 0;
}

.receipt-footer {
  text-align: center;
  font-size: 9px;
}

.receipt-footer p {
  margin: 2px 0;
}

.footer-message {
  margin-top: 8px;
}

.footer-message p {
  margin: 3px 0;
  font-size: 10px;
}

.print-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #4F46E5;
  color: white;
}

.btn-primary:hover {
  background: #4338CA;
  transform: translateY(-2px);
}

.btn-secondary {
  background: #E5E7EB;
  color: #1F2937;
}

.btn-secondary:hover {
  background: #D1D5DB;
}

/* Print styles */
@media print {
  .print-container {
    padding: 0;
    background: white;
  }
  
  .print-actions {
    display: none !important;
  }
  
  .receipt-paper {
    box-shadow: none;
    border-radius: 0;
    padding: 10px;
    width: 100%;
  }
}

/* Dark mode support */
body.dark-mode .receipt-paper {
  background: #1a1a2e;
  color: #e2e8f0;
}

body.dark-mode .store-address {
  color: #9ca3af;
}

body.dark-mode .item-detail {
  color: #9ca3af;
}

body.dark-mode .divider {
  border-top-color: #374151;
}
</style>