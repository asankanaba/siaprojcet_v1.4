<template>
  <div class="suppliers-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h2><i class="fas fa-building"></i> Suppliers</h2>
        <p>Manage your supplier network</p>
      </div>
      <div class="header-actions">
        <button @click="openAddModal" class="btn-primary">
          <i class="fas fa-plus"></i> Add Supplier
        </button>
        <button @click="refreshData" class="btn-secondary">
          <i class="fas fa-sync" :class="{ spinning: loading }"></i>
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-item">
        <span>Total Suppliers</span>
        <strong>{{ suppliers.length }}</strong>
      </div>
      <div class="stat-item">
        <span>Active</span>
        <strong>{{ activeSuppliers }}</strong>
      </div>
      <div class="stat-item">
        <span>Inactive</span>
        <strong>{{ suppliers.length - activeSuppliers }}</strong>
      </div>
      <div class="stat-item">
        <span>Products Supplied</span>
        <strong>{{ uniqueProducts }}</strong>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="filters-row">
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input v-model="searchQuery" placeholder="Search suppliers..." @input="filterSuppliers" />
      </div>
      <select v-model="statusFilter" class="filter-select" @change="filterSuppliers">
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>

    <!-- Suppliers Table -->
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Phone</th>
            <th>Product</th>
            <th>Stock</th>
            <th>Price</th>
            <th>Lead Time</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="text-center">Loading...</td>
          </tr>
          <tr v-else-if="filteredSuppliers.length === 0">
            <td colspan="9" class="text-center">No suppliers found</td>
          </tr>
          <tr v-for="supplier in filteredSuppliers" :key="supplier.id">
            <td><strong>{{ supplier.name }}</strong></td>
            <td>{{ supplier.contact_person || 'N/A' }}</td>
            <td>{{ supplier.phone || 'N/A' }}</td>
            <td>{{ supplier.product_name || 'N/A' }}</td>
            <td>{{ supplier.stock_available }}</td>
            <td>₱{{ formatPrice(supplier.price_per_unit) }}</td>
            <td>{{ supplier.lead_time_days || 3 }} days</td>
            <td>
              <span :class="supplier.status === 'active' ? 'status-active' : 'status-inactive'">
                {{ supplier.status || 'active' }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button @click="editSupplier(supplier)" class="btn-edit" title="Edit">
                  <i class="fas fa-edit"></i>
                </button>
                <button @click="confirmDelete(supplier.id)" class="btn-delete" title="Delete">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h5>{{ isEditing ? 'Edit Supplier' : 'Add Supplier' }}</h5>
          <button @click="closeModal" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Supplier Name <span class="required">*</span></label>
            <input v-model="form.name" type="text" class="form-control" placeholder="Enter supplier name" />
          </div>
          <div class="form-group">
            <label>Contact Person</label>
            <input v-model="form.contact_person" type="text" class="form-control" placeholder="Enter contact person" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Phone</label>
              <input v-model="form.phone" type="text" class="form-control" placeholder="Enter phone number" />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="form.email" type="email" class="form-control" placeholder="Enter email address" />
            </div>
          </div>
          <div class="form-group">
            <label>Address</label>
            <textarea v-model="form.address" class="form-control" rows="2" placeholder="Enter address"></textarea>
          </div>
          <div class="form-group">
            <label>Product</label>
            <select v-model="form.product_id" class="form-control">
              <option value="">Select Product</option>
              <option v-for="product in products" :key="product.id" :value="product.id">
                {{ product.name }}
              </option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Stock Available</label>
              <input v-model="form.stock_available" type="number" class="form-control" placeholder="0" />
            </div>
            <div class="form-group">
              <label>Price Per Unit</label>
              <input v-model="form.price_per_unit" type="number" class="form-control" step="0.01" placeholder="0.00" />
            </div>
          </div>
          <div class="form-group">
            <label>Lead Time (days)</label>
            <input v-model="form.lead_time_days" type="number" class="form-control" placeholder="3" />
          </div>
          <div class="form-group">
            <label>Status</label>
            <select v-model="form.status" class="form-control">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeModal" class="btn btn-secondary">Cancel</button>
          <button @click="saveSupplier" class="btn btn-primary" :disabled="saving">
            {{ saving ? 'Saving...' : (isEditing ? 'Update' : 'Add') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
//import api from '@/api/index.js';
import { ref, computed, onMounted } from 'vue'
import { useSupplyChainStore } from '@/stores/supplyChain'
import { useProductStore } from '@/stores/products'
import Swal from 'sweetalert2'

const supplyChainStore = useSupplyChainStore()
const productStore = useProductStore()
//const router 

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const isEditing = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')

const form = ref({
  id: null,
  name: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  product_id: '',
  stock_available: 0,
  price_per_unit: 0,
  lead_time_days: 3,
  status: 'active'
})

// Computed
const suppliers = computed(() => supplyChainStore.suppliers)
const products = computed(() => productStore.products)

const activeSuppliers = computed(() => {
  return suppliers.value.filter(s => s.status === 'active').length
})

const uniqueProducts = computed(() => {
  const productIds = new Set(suppliers.value.map(s => s.product_id).filter(id => id))
  return productIds.size
})

const filteredSuppliers = computed(() => {
  let result = suppliers.value
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s => 
      s.name.toLowerCase().includes(query) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query))
    )
  }
  
  if (statusFilter.value) {
    result = result.filter(s => s.status === statusFilter.value)
  }
  
  return result
})

// Methods
const formatPrice = (amount) => {
  return Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const refreshData = async () => {
  loading.value = true
  await Promise.all([
    supplyChainStore.loadSuppliers(),
    productStore.loadProducts()
  ])
  loading.value = false
}

const filterSuppliers = () => {
  // Computed handles filtering
}

const openAddModal = () => {
  isEditing.value = false
  form.value = {
    id: null,
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    product_id: '',
    stock_available: 0,
    price_per_unit: 0,
    lead_time_days: 3,
    status: 'active'
  }
  showModal.value = true
}

const editSupplier = (supplier) => {
  isEditing.value = true
  form.value = { ...supplier }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveSupplier = async () => {
  if (!form.value.name.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Supplier name is required',
      confirmButtonColor: '#4F46E5'
    })
    return
  }

  saving.value = true
  try {
    if (isEditing.value) {
      await supplyChainStore.updateSupplier(form.value.id, form.value)
    } else {
      await supplyChainStore.addSupplier(form.value)
    }
    
    closeModal()
    await refreshData()
    
    await Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: `Supplier ${isEditing.value ? 'updated' : 'added'} successfully`,
      confirmButtonColor: '#4F46E5',
      timer: 1500,
      showConfirmButton: false
    })
  } catch (error) {
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.message || 'Failed to save supplier',
      confirmButtonColor: '#4F46E5'
    })
  } finally {
    saving.value = false
  }
}

const confirmDelete = async (id) => {
  const result = await Swal.fire({
    title: 'Delete Supplier?',
    text: 'Are you sure you want to delete this supplier?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel'
  })

  if (result.isConfirmed) {
    try {
      await supplyChainStore.deleteSupplier(id)
      await refreshData()
      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Supplier deleted successfully',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      })
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete supplier',
        confirmButtonColor: '#4F46E5'
      })
    }
  }
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.suppliers-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

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

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
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

/* Status */
.status-active {
  background: #d1fae5;
  color: #065f46;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-active {
  background: #064e3b;
  color: #6ee7b7;
}

.status-inactive {
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-inactive {
  background: #374151;
  color: #9ca3af;
}

/* Actions */
.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-edit {
  background: none;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-edit:hover {
  background: #e0e7ff;
}

body.dark-mode .btn-edit:hover {
  background: #312e81;
}

.btn-delete {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-delete:hover {
  background: #fee2e2;
}

body.dark-mode .btn-delete:hover {
  background: #7f1d1d;
}

/* Modal - reuse styles from other components */
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
  max-width: 500px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

/* Responsive */
@media (max-width: 768px) {
  .suppliers-container {
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
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .stats-row {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>