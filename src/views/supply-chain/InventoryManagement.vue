<template>
  <div class="inventory-container">
    <div class="page-header">
      <div>
        <h2><i class="fas fa-boxes"></i> Inventory Management</h2>
        <p>Monitor stock levels and manage inventory</p>
      </div>
      <div class="header-actions">
        <button @click="refreshData" class="btn-secondary">
          <i class="fas fa-sync" :class="{ spinning: loading }"></i>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-item">
        <span>Total Products</span>
        <strong>{{ products.length }}</strong>
      </div>
      <div class="stat-item">
        <span>Low Stock</span>
        <strong class="text-warning">{{ lowStockItems }}</strong>
      </div>
      <div class="stat-item">
        <span>Out of Stock</span>
        <strong class="text-danger">{{ outOfStockItems }}</strong>
      </div>
      <div class="stat-item">
        <span>Total Value</span>
        <strong>₱{{ formatPrice(totalValue) }}</strong>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-row">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input v-model="searchQuery" placeholder="Search products..." @input="filterProducts" />
      </div>
      <select v-model="stockFilter" class="filter-select" @change="filterProducts">
        <option value="">All Stock</option>
        <option value="low">Low Stock</option>
        <option value="out">Out of Stock</option>
        <option value="ok">In Stock</option>
      </select>
    </div>

    <!-- Inventory Table -->
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Threshold</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="text-center">Loading...</td>
          </tr>
          <tr v-else-if="filteredProducts.length === 0">
            <td colspan="7" class="text-center">No products found</td>
          </tr>
          <tr v-for="product in filteredProducts" :key="product.id">
            <td><strong>{{ product.name }}</strong></td>
            <td>{{ product.category_name || 'Uncategorized' }}</td>
            <td>₱{{ formatPrice(product.price) }}</td>
            <td>
              <span :class="getStockClass(product.stock)">
                {{ product.stock }}
              </span>
            </td>
            <td>{{ product.low_stock_threshold || 5 }}</td>
            <td>
              <span :class="getStatusClass(product.stock, product.low_stock_threshold)">
                {{ getStockStatus(product.stock, product.low_stock_threshold) }}
              </span>
            </td>
            <td>
              <button @click="openRestockModal(product)" class="btn-restock">
                <i class="fas fa-plus"></i> Restock
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Restock Modal -->
    <div v-if="showRestockModal" class="modal-overlay" @click.self="showRestockModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h5>Restock Product</h5>
          <button @click="showRestockModal = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <p><strong>Product:</strong> {{ restockProduct?.name }}</p>
          <p><strong>Current Stock:</strong> {{ restockProduct?.stock }}</p>
          <div class="form-group">
            <label>Quantity to Add <span class="required">*</span></label>
            <input v-model="restockQuantity" type="number" class="form-control" min="1" />
          </div>
          <div class="form-group">
            <label>Reason</label>
            <select v-model="restockReason" class="form-control">
              <option value="restock">Regular Restock</option>
              <option value="return">Returned Items</option>
              <option value="adjustment">Stock Adjustment</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea v-model="restockNotes" class="form-control" rows="2" placeholder="Additional notes..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="showRestockModal = false" class="btn btn-secondary">Cancel</button>
          <button @click="processRestock" class="btn btn-primary" :disabled="restocking">
            {{ restocking ? 'Processing...' : 'Restock' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '@/stores/products'
import api from '@/api/index.js'
import Swal from 'sweetalert2'

const productStore = useProductStore()

const loading = ref(false)
const restocking = ref(false)
const searchQuery = ref('')
const stockFilter = ref('')
const showRestockModal = ref(false)
const restockProduct = ref(null)
const restockQuantity = ref(1)
const restockReason = ref('restock')
const restockNotes = ref('')

// Computed
const products = computed(() => productStore.products)

const lowStockItems = computed(() => {
  return products.value.filter(p => p.stock > 0 && p.stock <= (p.low_stock_threshold || 5)).length
})

const outOfStockItems = computed(() => {
  return products.value.filter(p => p.stock <= 0).length
})

const totalValue = computed(() => {
  return products.value.reduce((sum, p) => sum + (p.stock * p.price), 0)
})

const filteredProducts = computed(() => {
  let result = products.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(query))
  }
  
  if (stockFilter.value === 'low') {
    result = result.filter(p => p.stock > 0 && p.stock <= (p.low_stock_threshold || 5))
  } else if (stockFilter.value === 'out') {
    result = result.filter(p => p.stock <= 0)
  } else if (stockFilter.value === 'ok') {
    result = result.filter(p => p.stock > (p.low_stock_threshold || 5))
  }
  
  return result
})

// Methods
const formatPrice = (amount) => {
  return Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const getStockClass = (stock) => {
  if (stock <= 0) return 'stock-out'
  if (stock <= 5) return 'stock-low'
  return 'stock-ok'
}

const getStatusClass = (stock, threshold) => {
  if (stock <= 0) return 'status-danger'
  if (stock <= (threshold || 5)) return 'status-warning'
  return 'status-success'
}

const getStockStatus = (stock, threshold) => {
  if (stock <= 0) return 'OUT OF STOCK'
  if (stock <= (threshold || 5)) return 'LOW STOCK'
  return 'IN STOCK'
}

const refreshData = async () => {
  loading.value = true
  await productStore.loadProducts()
  loading.value = false
}

const filterProducts = () => {
  // Computed handles filtering
}

const openRestockModal = (product) => {
  restockProduct.value = product
  restockQuantity.value = 1
  restockReason.value = 'restock'
  restockNotes.value = ''
  showRestockModal.value = true
}

const processRestock = async () => {
  if (!restockQuantity.value || restockQuantity.value <= 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Please enter a valid quantity',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  restocking.value = true
  try {
    const currentStock = parseInt(restockProduct.value.stock) || 0
    const newStock = currentStock + parseInt(restockQuantity.value)
    
    await api.put(`/products.php?id=${restockProduct.value.id}`, {
      stock: newStock
    })
    
    showRestockModal.value = false
    await refreshData()
    
    await Swal.fire({
      icon: 'success',
      title: 'Restock Complete!',
      text: `Added ${restockQuantity.value} units to ${restockProduct.value.name}`,
      confirmButtonColor: '#4F46E5',
      timer: 1500,
      showConfirmButton: false
    })
  } catch (error) {
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to restock product',
      confirmButtonColor: '#4F46E5'
    })
  } finally {
    restocking.value = false
  }
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.inventory-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Reuse styles from Suppliers.vue */
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

.text-danger {
  color: #ef4444 !important;
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

.table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow-x: auto;
}

body.dark-mode .table-wrapper {
  background: #1e293b;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.table th {
  padding: 0.6rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

.stock-ok {
  color: #10b981;
  font-weight: 600;
}

.stock-low {
  color: #f59e0b;
  font-weight: 600;
}

.stock-out {
  color: #ef4444;
  font-weight: 600;
}

.status-success {
  background: #d1fae5;
  color: #065f46;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-success {
  background: #064e3b;
  color: #6ee7b7;
}

.status-warning {
  background: #fef3c7;
  color: #92400e;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-warning {
  background: #78350f;
  color: #fcd34d;
}

.status-danger {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-danger {
  background: #7f1d1d;
  color: #fca5a5;
}

.btn-restock {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  transition: all 0.2s;
}

.btn-restock:hover {
  background: #4338CA;
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

/* Modal styles - reuse from Suppliers.vue */
.modal-overlay {
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
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 450px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideDown 0.3s ease;
}

body.dark-mode .modal-content {
  background: #1e293b;
}

@keyframes slideDown {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .modal-header {
  border-bottom-color: #2d3748;
}

.modal-header h5 {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .modal-header h5 {
  color: #e2e8f0;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
}

body.dark-mode .btn-close {
  color: #9ca3af;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  font-size: 0.85rem;
  color: #1f2937;
  margin-bottom: 0.25rem;
}

body.dark-mode .form-group label {
  color: #e2e8f0;
}

.required {
  color: #ef4444;
}

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  color: #1f2937;
  transition: border-color 0.2s;
}

body.dark-mode .form-control {
  background: #2d3748;
  border-color: #374151;
  color: #e2e8f0;
}

.form-control:focus {
  outline: none;
  border-color: #4F46E5;
}

textarea.form-control {
  resize: vertical;
  min-height: 60px;
  font-family: inherit;
}

.modal-footer {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}

body.dark-mode .modal-footer {
  border-top-color: #2d3748;
}

.btn {
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f3f4f6;
  color: #1f2937;
}

body.dark-mode .btn-secondary {
  background: #2d3748;
  color: #e2e8f0;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

body.dark-mode .btn-secondary:hover {
  background: #374151;
}

.btn-primary {
  background: #4F46E5;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4338CA;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .inventory-container {
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
}
</style>