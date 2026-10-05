<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="transactions-container">
          <!-- Header -->
          <div class="transactions-header">
            <div>
              <h2><i class="fas fa-exchange-alt"></i> Transactions</h2>
              <p>View and manage all financial transactions</p>
            </div>
            <div class="header-actions">
              <button @click="openAddModal" class="btn-add">
                <i class="fas fa-plus"></i> Add Transaction
              </button>
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Filters -->
          <div class="filters-section">
            <div class="filter-group">
              <label>Type</label>
              <select v-model="filterType" class="form-control" @change="loadTransactions">
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Status</label>
              <select v-model="filterStatus" class="form-control" @change="loadTransactions">
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Search</label>
              <input v-model="searchQuery" class="form-control" placeholder="Search..." @input="loadTransactions" />
            </div>
            <div class="filter-group">
              <button @click="loadTransactions" class="btn-filter">
                <i class="fas fa-search"></i> Apply
              </button>
            </div>
          </div>

          <!-- Summary -->
          <div class="summary-cards">
            <div class="summary-card">
              <span class="summary-label">Total Income</span>
              <span class="summary-value income">{{ formatCurrency(totalIncome) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Total Expenses</span>
              <span class="summary-value expense">{{ formatCurrency(totalExpense) }}</span>
            </div>
            <div class="summary-card">
              <span class="summary-label">Net Balance</span>
              <span class="summary-value" :class="netBalance >= 0 ? 'income' : 'expense'">
                {{ formatCurrency(netBalance) }}
              </span>
            </div>
          </div>

          <!-- Transactions Table -->
          <div class="transactions-table-wrapper">
            <table class="transactions-table">
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>DESCRIPTION</th>
                  <th>CATEGORY</th>
                  <th>TYPE</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="text-center">
                    <i class="fas fa-spinner spin"></i> Loading...
                  </td>
                </tr>
                <tr v-else-if="filteredTransactions.length === 0">
                  <td colspan="7" class="text-center">No transactions found</td>
                </tr>
                <tr v-for="transaction in filteredTransactions" :key="transaction.id">
                  <td>{{ formatDate(transaction.created_at || transaction.date) }}</td>
                  <td>{{ transaction.description }}</td>
                  <td>{{ transaction.category || 'General' }}</td>
                  <td>
                    <span :class="transaction.type === 'income' ? 'type-income' : 'type-expense'">
                      {{ (transaction.type || 'EXPENSE').toUpperCase() }}
                    </span>
                  </td>
                  <td :class="transaction.type === 'income' ? 'text-success' : 'text-danger'">
                    {{ transaction.type === 'income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                  </td>
                  <td>
                    <span :class="getStatusClass(transaction.status)">
                      {{ (transaction.status || 'COMPLETED').toUpperCase() }}
                    </span>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button @click="editTransaction(transaction)" class="btn-edit" title="Edit">
                        <i class="fas fa-edit"></i>
                      </button>
                      <button @click="deleteTransaction(transaction.id)" class="btn-delete" title="Delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="transactions-footer">
            <span>Showing <strong>{{ filteredTransactions.length }}</strong> transactions</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add/Edit Transaction Modal -->
  <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5>{{ isEditing ? 'Edit Transaction' : 'Add Transaction' }}</h5>
        <button @click="closeModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Description <span class="required">*</span></label>
          <input v-model="form.description" type="text" class="form-control" placeholder="Enter description" />
        </div>
        <div class="form-group">
          <label>Amount <span class="required">*</span></label>
          <input v-model="form.amount" type="number" class="form-control" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Type</label>
          <select v-model="form.type" class="form-control">
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <div class="form-group">
          <label>Category</label>
          <input v-model="form.category" type="text" class="form-control" placeholder="Category" />
        </div>
        <div class="form-group">
          <label>Status</label>
          <select v-model="form.status" class="form-control">
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div class="form-group">
          <label>Date</label>
          <input v-model="form.date" type="date" class="form-control" />
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeModal" class="btn btn-secondary">Cancel</button>
        <button @click="saveTransaction" class="btn btn-primary" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Add') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
import api from '@/api/index.js';
import Swal from 'sweetalert2';

const router = useRouter();
const authStore = useAuthStore();

// State
const transactions = ref([]);
const loading = ref(false);
const isRefreshing = ref(false);
const isSaving = ref(false);
const showModal = ref(false);
const isEditing = ref(false);
const searchQuery = ref('');
const filterType = ref('');
const filterStatus = ref('');

// Form
const form = ref({
  id: null,
  description: '',
  amount: '',
  type: 'expense',
  category: '',
  status: 'completed',
  date: ''
});

// ============================================
// COMPUTED
// ============================================
const filteredTransactions = computed(() => {
  let result = transactions.value;
  
  if (filterType.value) {
    result = result.filter(t => t.type === filterType.value);
  }
  if (filterStatus.value) {
    result = result.filter(t => t.status === filterStatus.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(t => 
      t.description.toLowerCase().includes(query) ||
      (t.category && t.category.toLowerCase().includes(query))
    );
  }
  return result;
});

const totalIncome = computed(() => {
  return transactions.value
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
});

const totalExpense = computed(() => {
  return transactions.value
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
});

const netBalance = computed(() => {
  return totalIncome.value - totalExpense.value;
});

// ============================================
// HELPERS
// ============================================
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') {
    return '₱0.00';
  }
  const numAmount = Number(amount);
  if (isNaN(numAmount)) {
    return '₱0.00';
  }
  return '₱' + numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getStatusClass = (status) => {
  if (status === 'completed' || status === 'paid') return 'status-completed';
  if (status === 'pending') return 'status-pending';
  if (status === 'failed' || status === 'rejected') return 'status-failed';
  return 'status-pending';
};

// ============================================
// LOAD TRANSACTIONS
// ============================================
const loadTransactions = async () => {
  loading.value = true;
  try {
    let url = '/transactions.php';
    const params = new URLSearchParams();
    if (filterType.value) params.append('type', filterType.value);
    if (filterStatus.value) params.append('status', filterStatus.value);
    if (searchQuery.value) params.append('search', searchQuery.value);
    if (params.toString()) url += '?' + params.toString();
    
    const response = await api.get(url);
    console.log('📊 Transactions response:', response.data);
    
    if (Array.isArray(response.data)) {
      transactions.value = response.data;
    } else {
      transactions.value = [];
    }
  } catch (error) {
    console.error('Error loading transactions:', error);
    transactions.value = [];
  } finally {
    loading.value = false;
  }
};

// ============================================
// CRUD OPERATIONS
// ============================================
const openAddModal = () => {
  isEditing.value = false;
  form.value = {
    id: null,
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    status: 'completed',
    date: new Date().toISOString().split('T')[0]
  };
  showModal.value = true;
};

const editTransaction = (transaction) => {
  isEditing.value = true;
  form.value = {
    id: transaction.id,
    description: transaction.description,
    amount: transaction.amount,
    type: transaction.type || 'expense',
    category: transaction.category || '',
    status: transaction.status || 'completed',
    date: transaction.date || transaction.created_at?.split('T')[0] || new Date().toISOString().split('T')[0]
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveTransaction = async () => {
  if (!form.value.description.trim()) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Description is required',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  if (!form.value.amount || parseFloat(form.value.amount) <= 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'Validation Error',
      text: 'Amount must be greater than 0',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }
  
  isSaving.value = true;
  
  try {
    const payload = {
      description: form.value.description,
      amount: parseFloat(form.value.amount),
      type: form.value.type,
      category: form.value.category || 'General',
      status: form.value.status,
      date: form.value.date || new Date().toISOString().split('T')[0],
      user_id: authStore.user?.id || 1
    };
    
    let response;
    if (isEditing.value) {
      response = await api.put(`/transactions.php?id=${form.value.id}`, payload);
    } else {
      response = await api.post('/transactions.php', payload);
    }
    
    if (response.data.success) {
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: response.data.message || 'Transaction saved successfully',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
      closeModal();
      await loadTransactions();
    }
  } catch (error) {
    console.error('Error saving transaction:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to save transaction. Please try again.',
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    isSaving.value = false;
  }
};

const deleteTransaction = async (id) => {
  const result = await Swal.fire({
    title: 'Delete Transaction?',
    text: 'Are you sure you want to delete this transaction?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel'
  });
  
  if (result.isConfirmed) {
    try {
      await api.delete(`/transactions.php?id=${id}`);
      await loadTransactions();
      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Transaction deleted successfully.',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete transaction.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

const refreshData = async () => {
  isRefreshing.value = true;
  await loadTransactions();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadTransactions();
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

.transactions-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.transactions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.transactions-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .transactions-header h2 {
  color: #e2e8f0;
}

.transactions-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .transactions-header p {
  color: #9ca3af;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
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
}

.btn-add:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}

.btn-refresh {
  background: white;
  border: 1px solid #e5e7eb;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #1f2937;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

body.dark-mode .btn-refresh {
  background: #1e293b;
  border-color: #374151;
  color: #e2e8f0;
}

.btn-refresh:hover {
  background: #f9fafb;
  border-color: #4F46E5;
}

body.dark-mode .btn-refresh:hover {
  background: #2d3748;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.filters-section {
  background: white;
  border-radius: 12px;
  padding: 1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1rem;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

body.dark-mode .filters-section {
  background: #1e293b;
}

.filter-group {
  flex: 1;
  min-width: 120px;
}

.filter-group label {
  display: block;
  font-size: 0.7rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

body.dark-mode .filter-group label {
  color: #9ca3af;
}

.form-control {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.85rem;
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

.btn-filter {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.4rem 1.2rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  height: 40px;
}

.btn-filter:hover {
  background: #4338CA;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-card {
  background: white;
  border-radius: 10px;
  padding: 0.75rem 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  text-align: center;
}

body.dark-mode .summary-card {
  background: #1e293b;
}

.summary-label {
  display: block;
  font-size: 0.7rem;
  color: #6b7280;
  margin-bottom: 0.2rem;
}

body.dark-mode .summary-label {
  color: #9ca3af;
}

.summary-value {
  font-size: 1.2rem;
  font-weight: 700;
}

.summary-value.income {
  color: #10b981;
}

.summary-value.expense {
  color: #ef4444;
}

.transactions-table-wrapper {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .transactions-table-wrapper {
  background: #1e293b;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
}

.transactions-table th {
  padding: 0.5rem 0.75rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .transactions-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.transactions-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}

body.dark-mode .transactions-table td {
  border-bottom-color: #2d3748;
  color: #e2e8f0;
}

.transactions-table tr:last-child td {
  border-bottom: none;
}

.transactions-table tr:hover td {
  background: #f9fafb;
}

body.dark-mode .transactions-table tr:hover td {
  background: #2d3748;
}

.text-center {
  text-align: center;
  padding: 1.5rem;
  color: #6b7280;
}

.text-success {
  color: #10b981;
  font-weight: 600;
}

.text-danger {
  color: #ef4444;
  font-weight: 600;
}

.type-income {
  color: #10b981;
  font-weight: 600;
  font-size: 0.75rem;
}

.type-expense {
  color: #ef4444;
  font-weight: 600;
  font-size: 0.75rem;
}

.status-completed {
  background: #d1fae5;
  color: #065f46;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-completed {
  background: #064e3b;
  color: #6ee7b7;
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-pending {
  background: #78350f;
  color: #fcd34d;
}

.status-failed {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-block;
}

body.dark-mode .status-failed {
  background: #7f1d1d;
  color: #fca5a5;
}

.action-buttons {
  display: flex;
  gap: 0.25rem;
}

.btn-edit {
  background: none;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-edit:hover {
  background: #eef2ff;
}

body.dark-mode .btn-edit:hover {
  background: #312e81;
}

.btn-delete {
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-delete:hover {
  background: #fee2e2;
}

body.dark-mode .btn-delete:hover {
  background: #7f1d1d;
}

.transactions-footer {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: white;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .transactions-footer {
  background: #1e293b;
  color: #9ca3af;
}

.transactions-footer strong {
  color: #1a1a2e;
}

body.dark-mode .transactions-footer strong {
  color: #e2e8f0;
}

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
  max-width: 450px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideDown 0.3s ease;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

body.dark-mode .modal-content {
  background: #1e293b;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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
  .transactions-container {
    padding: 1rem;
  }

  .transactions-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .filters-section {
    flex-direction: column;
  }

  .filter-group {
    min-width: 100%;
  }

  .summary-cards {
    grid-template-columns: 1fr 1fr;
  }

  .transactions-table-wrapper {
    overflow-x: auto;
  }

  .transactions-table {
    font-size: 0.8rem;
    min-width: 600px;
  }

  .modal-content {
    margin: 1rem;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
}
</style>