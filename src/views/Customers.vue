<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="customers-container">
          <!-- Header -->
          <div class="customers-header">
            <div class="header-left">
              <h2><i class="fas fa-users"></i> Customers Management</h2>
              <span class="customer-count">{{ filteredCustomers.length }} customers</span>
            </div>
            <div class="header-right">
              <button class="btn-add" @click="openAddModal">
                <i class="fas fa-plus"></i> Add Customer
              </button>
            </div>
          </div>

          <!-- Toolbar -->
          <div class="customers-toolbar">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input
                type="text"
                v-model="searchQuery"
                placeholder="Search customers..."
                @input="searchCustomers"
              />
            </div>
            <div class="filters">
              <select v-model="filterStatus" class="form-select" @change="loadCustomers">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <button @click="loadCustomers" class="btn-filter">
                <i class="fas fa-sync"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Customers Table -->
          <div class="customers-table-wrapper">
            <table class="customers-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>PHONE</th>
                  <th>ADDRESS</th>
                  <th>STATUS</th>
                  <th style="width: 140px;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="text-center">
                    <div class="loading-spinner">
                      <i class="fas fa-spinner spin"></i> Loading customers...
                    </div>
                  </td>
                </tr>
                <tr v-else-if="filteredCustomers.length === 0">
                  <td colspan="7" class="text-center">
                    <div class="empty-state">
                      <i class="fas fa-user-plus"></i>
                      <p>No customers found</p>
                      <button class="btn-add-small" @click="openAddModal">Add your first customer</button>
                    </div>
                  </td>
                </tr>
                <tr v-for="(customer, index) in filteredCustomers" :key="customer.id">
                  <td>{{ index + 1 }}</td>
                  <td>
                    <div class="customer-info">
                      <span class="customer-name">{{ customer.name || 'Unnamed' }}</span>
                    </div>
                  </td>
                  <td>{{ customer.email || '—' }}</td>
                  <td>{{ customer.phone || '—' }}</td>
                  <td class="address-cell">{{ customer.address || '—' }}</td>
                  <td>
                    <span :class="getStatusClass(customer.status)">
                      {{ getStatusLabel(customer.status) }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button @click="editCustomer(customer)" class="btn-edit" title="Edit Customer">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button 
                        v-if="customer.status !== 'archived'" 
                        @click="archiveCustomer(customer.id)" 
                        class="btn-archive" 
                        title="Archive Customer"
                      >
                        <i class="fas fa-archive"></i>
                      </button>
                      <button 
                        v-else
                        @click="restoreCustomer(customer.id)" 
                        class="btn-restore" 
                        title="Restore Customer"
                      >
                        <i class="fas fa-undo"></i>
                      </button>
                      <button @click="deleteCustomer(customer.id)" class="btn-delete" title="Delete Customer">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="customers-footer">
            <span>Showing <strong>{{ filteredCustomers.length }}</strong> customers</span>
            <span class="footer-info">
              <i class="fas fa-circle" style="color: #10b981; font-size: 0.5rem;"></i> Active
              <i class="fas fa-circle" style="color: #F59E0B; font-size: 0.5rem; margin-left: 1rem;"></i> Archived
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add Customer Modal -->
  <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-user-plus"></i> Add New Customer</h5>
        <button @click="closeAddModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Customer Name <span class="required">*</span></label>
          <input v-model="form.name" type="text" class="form-control" placeholder="Enter customer name" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" class="form-control" placeholder="Enter email address" />
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input v-model="form.phone" type="text" class="form-control" placeholder="Enter phone number" />
        </div>
        <div class="form-group">
          <label>Address</label>
          <textarea v-model="form.address" class="form-control" placeholder="Enter address" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeAddModal" class="btn btn-secondary">Cancel</button>
        <button @click="saveCustomer" class="btn btn-primary" :disabled="isSaving">
          {{ isSaving ? 'Adding...' : 'Add Customer' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Edit Customer Modal -->
  <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-user-edit"></i> Edit Customer</h5>
        <button @click="closeEditModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Customer Name <span class="required">*</span></label>
          <input v-model="editForm.name" type="text" class="form-control" placeholder="Enter customer name" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="editForm.email" type="email" class="form-control" placeholder="Enter email address" />
        </div>
        <div class="form-group">
          <label>Phone</label>
          <input v-model="editForm.phone" type="text" class="form-control" placeholder="Enter phone number" />
        </div>
        <div class="form-group">
          <label>Address</label>
          <textarea v-model="editForm.address" class="form-control" placeholder="Enter address" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeEditModal" class="btn btn-secondary">Cancel</button>
        <button @click="updateCustomer" class="btn btn-primary" :disabled="isSavingEdit">
          {{ isSavingEdit ? 'Updating...' : 'Update Customer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import Sidebar from '../components/common/Sidebar.vue';
import Navbar from '../components/common/Navbar.vue';
import api from '@/api/index.js';
import Swal from 'sweetalert2';

const router = useRouter();
const authStore = useAuthStore();

// State
const customers = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const filterStatus = ref('');
const showAddModal = ref(false);
const showEditModal = ref(false);
const isSaving = ref(false);
const isSavingEdit = ref(false);

// Form
const form = ref({
  name: '',
  email: '',
  phone: '',
  address: ''
});

const editForm = ref({
  id: null,
  name: '',
  email: '',
  phone: '',
  address: ''
});

// ============================================
// HELPERS
// ============================================
const getStatusClass = (status) => {
  if (status === 'archived') return 'status-archived';
  return 'status-active';
};

const getStatusLabel = (status) => {
  if (status === 'archived') return 'ARCHIVED';
  return 'ACTIVE';
};

// ============================================
// LOAD CUSTOMERS - ✅ FIXED: Removed /api/ prefix
// ============================================
const loadCustomers = async () => {
  loading.value = true;
  try {
    let url = '/customers.php';
    const params = new URLSearchParams();
    if (filterStatus.value) params.append('status', filterStatus.value);
    if (searchQuery.value) params.append('search', searchQuery.value);
    
    if (params.toString()) url += '?' + params.toString();
    
    const response = await api.get(url);
    console.log('📦 Customers response:', response.data);
    
    if (Array.isArray(response.data)) {
      customers.value = response.data;
      console.log('✅ Loaded:', customers.value.length, 'customers');
    } else {
      customers.value = [];
    }
  } catch (error) {
    console.error('❌ Error loading customers:', error);
    customers.value = [];
  } finally {
    loading.value = false;
  }
};

// ============================================
// SEARCH & FILTER
// ============================================
const searchCustomers = () => {
  loadCustomers();
};

const filteredCustomers = computed(() => {
  let result = customers.value;
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(c => 
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone && c.phone.includes(query))
    );
  }
  
  return result;
});

// ============================================
// ADD CUSTOMER
// ============================================
const openAddModal = () => {
  form.value = {
    name: '',
    email: '',
    phone: '',
    address: ''
  };
  showAddModal.value = true;
};

const closeAddModal = () => {
  showAddModal.value = false;
};

const saveCustomer = async () => {
  if (!form.value.name.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Customer name is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  isSaving.value = true;
  
  try {
    const response = await api.post('/customers.php', {
      name: form.value.name,
      email: form.value.email || '',
      phone: form.value.phone || '',
      address: form.value.address || ''
    });
    
    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Customer Added',
        text: 'Customer has been added successfully!',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
      closeAddModal();
      await loadCustomers();
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.data.message || 'Failed to add customer',
        confirmButtonColor: '#4F46E5'
      });
    }
  } catch (error) {
    console.error('Error adding customer:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to add customer. Please try again.',
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    isSaving.value = false;
  }
};

// ============================================
// EDIT CUSTOMER
// ============================================
const editCustomer = (customer) => {
  editForm.value = {
    id: customer.id,
    name: customer.name || '',
    email: customer.email || '',
    phone: customer.phone || '',
    address: customer.address || ''
  };
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
};

const updateCustomer = async () => {
  if (!editForm.value.name.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Customer name is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  isSavingEdit.value = true;
  
  try {
    const response = await api.put(`/customers.php?id=${editForm.value.id}`, {
      name: editForm.value.name,
      email: editForm.value.email || '',
      phone: editForm.value.phone || '',
      address: editForm.value.address || ''
    });
    
    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Customer Updated',
        text: 'Customer has been updated successfully!',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
      closeEditModal();
      await loadCustomers();
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.data.message || 'Failed to update customer',
        confirmButtonColor: '#4F46E5'
      });
    }
  } catch (error) {
    console.error('Error updating customer:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to update customer. Please try again.',
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    isSavingEdit.value = false;
  }
};

// ============================================
// ARCHIVE CUSTOMER
// ============================================
const archiveCustomer = async (id) => {
  const result = await Swal.fire({
    title: 'Archive Customer?',
    text: 'Are you sure you want to archive this customer?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#F59E0B',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Archive',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      const response = await api.put(`/customers.php?id=${id}`, { status: 'archived' });
      console.log('Archive response:', response.data);
      
      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Customer Archived',
          text: 'Customer has been archived successfully!',
          confirmButtonColor: '#4F46E5',
          timer: 1500,
          showConfirmButton: false
        });
        await loadCustomers();
      }
    } catch (error) {
      console.error('Error archiving customer:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to archive customer. Please try again.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

// ============================================
// RESTORE CUSTOMER
// ============================================
const restoreCustomer = async (id) => {
  const result = await Swal.fire({
    title: 'Restore Customer?',
    text: 'Are you sure you want to restore this customer?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Restore',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      const response = await api.put(`/customers.php?id=${id}`, { status: 'active' });
      console.log('Restore response:', response.data);
      
      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Customer Restored',
          text: 'Customer has been restored successfully!',
          confirmButtonColor: '#4F46E5',
          timer: 1500,
          showConfirmButton: false
        });
        await loadCustomers();
      }
    } catch (error) {
      console.error('Error restoring customer:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to restore customer. Please try again.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

// ============================================
// DELETE CUSTOMER
// ============================================
const deleteCustomer = async (id) => {
  const result = await Swal.fire({
    title: 'Delete Customer?',
    html: `
      <div style="text-align: left;">
        <p style="color: #ef4444; font-weight: 600;">⚠️ Warning: This action cannot be undone!</p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      const response = await api.delete(`/customers.php?id=${id}`);
      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Customer Deleted',
          text: 'Customer has been deleted permanently!',
          confirmButtonColor: '#4F46E5',
          timer: 1500,
          showConfirmButton: false
        });
        await loadCustomers();
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete customer. Please try again.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadCustomers();
});
</script>



<style scoped>
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

.customers-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* ============================================
   HEADER
   ============================================ */
.customers-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-left h2 {
  font-size: 1.3rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .header-left h2 {
  color: #e2e8f0;
}

.customer-count {
  font-size: 0.8rem;
  color: #6b7280;
  background: #e5e7eb;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
}

body.dark-mode .customer-count {
  background: #374151;
  color: #9ca3af;
}

.header-right {
  display: flex;
  gap: 0.5rem;
}

.btn-add {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-add:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}

/* ============================================
   TOOLBAR
   ============================================ */
.customers-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
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

.filters {
  display: flex;
  gap: 0.5rem;
}

.form-select {
  padding: 0.4rem 0.8rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  font-size: 0.9rem;
  color: #1f2937;
  cursor: pointer;
  transition: border-color 0.2s;
  min-width: 130px;
}

body.dark-mode .form-select {
  background: #1e293b;
  border-color: #374151;
  color: #e2e8f0;
}

.form-select:focus {
  outline: none;
  border-color: #4F46E5;
}

.btn-filter {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}

.btn-filter:hover {
  background: #4338CA;
}

/* ============================================
   TABLE
   ============================================ */
.customers-table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .customers-table-wrapper {
  background: #1e293b;
}

.customers-table {
  width: 100%;
  border-collapse: collapse;
}

.customers-table th {
  padding: 0.6rem 0.8rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .customers-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.customers-table td {
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
  font-size: 0.85rem;
  color: #1f2937;
}

body.dark-mode .customers-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.customers-table tr:last-child td {
  border-bottom: none;
}

.customers-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .customers-table tr:hover td {
  background: #2d3748;
}

/* ============================================
   CUSTOMER INFO
   ============================================ */
.customer-info {
  display: flex;
  flex-direction: column;
}

.customer-name {
  font-weight: 600;
  color: #1a1a2e;
}

body.dark-mode .customer-name {
  color: #e2e8f0;
}

.address-cell {
  max-width: 150px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ============================================
   STATUS
   ============================================ */
.status-active {
  background: #d1fae5;
  color: #065f46;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-active {
  background: #064e3b;
  color: #6ee7b7;
}

.status-archived {
  background: #fef3c7;
  color: #92400e;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-archived {
  background: #78350f;
  color: #fcd34d;
}

/* ============================================
   ACTIONS
   ============================================ */
.action-buttons {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.btn-edit {
  background: none;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  transition: background 0.2s;
  font-size: 0.9rem;
}

.btn-edit:hover {
  background: #eef2ff;
}

body.dark-mode .btn-edit:hover {
  background: #312e81;
}

.btn-archive {
  background: none;
  border: none;
  color: #F59E0B;
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  transition: background 0.2s;
  font-size: 0.9rem;
}

.btn-archive:hover {
  background: #fef3c7;
}

body.dark-mode .btn-archive:hover {
  background: #78350f;
}

.btn-restore {
  background: none;
  border: none;
  color: #10B981;
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  transition: background 0.2s;
  font-size: 0.9rem;
}

.btn-restore:hover {
  background: #d1fae5;
}

body.dark-mode .btn-restore:hover {
  background: #064e3b;
}

.btn-delete {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 4px;
  transition: background 0.2s;
  font-size: 0.9rem;
}

.btn-delete:hover {
  background: #fee2e2;
}

body.dark-mode .btn-delete:hover {
  background: #7f1d1d;
}

/* ============================================
   FOOTER
   ============================================ */
.customers-footer {
  margin-top: 1rem;
  padding: 0.6rem 1rem;
  background: white;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .customers-footer {
  background: #1e293b;
  color: #9ca3af;
}

.customers-footer strong {
  color: #1a1a2e;
}

body.dark-mode .customers-footer strong {
  color: #e2e8f0;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ============================================
   MODAL
   ============================================ */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideDown 0.3s ease;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

body.dark-mode .modal-content {
  background: #1e293b;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
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
  transition: color 0.2s;
}

body.dark-mode .btn-close {
  color: #9ca3af;
}

.btn-close:hover {
  color: #1f2937;
}

body.dark-mode .btn-close:hover {
  color: #e2e8f0;
}

.modal-body {
  padding: 1.5rem;
}

.modal-body .form-group {
  margin-bottom: 1rem;
}

.required {
  color: #ef4444;
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

/* ============================================
   EMPTY & LOADING STATES
   ============================================ */
.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

.loading-spinner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #6b7280;
}

.loading-spinner .spin {
  animation: spin 1s linear infinite;
}

.empty-state {
  padding: 2rem;
  text-align: center;
}

.empty-state i {
  font-size: 2.5rem;
  color: #d1d5db;
  display: block;
  margin-bottom: 0.5rem;
}

body.dark-mode .empty-state i {
  color: #374151;
}

.empty-state p {
  font-size: 1rem;
  color: #6b7280;
  margin-bottom: 1rem;
}

.btn-add-small {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.4rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-add-small:hover {
  background: #4338CA;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 768px) {
  .customers-container {
    padding: 1rem;
  }
  
  .customers-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .customers-toolbar {
    flex-direction: column;
  }
  
  .search-box {
    max-width: 100%;
    width: 100%;
  }
  
  .filters {
    width: 100%;
  }
  
  .form-select {
    flex: 1;
    min-width: auto;
  }
  
  .customers-table-wrapper {
    overflow-x: auto;
  }
  
  .customers-table {
    font-size: 0.8rem;
    min-width: 700px;
  }
  
  .customers-footer {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
  
  .modal-content {
    margin: 1rem;
    max-width: 100%;
  }
}

/* ============================================
   SCROLLBAR
   ============================================ */
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
</style>