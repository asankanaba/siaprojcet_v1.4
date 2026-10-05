<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="finance-dashboard">
          <!-- Header -->
          <div class="dashboard-header">
            <div class="header-left">
              <h1>Finance Dashboard</h1>
              <p>Financial overview, tax controls, and analytics</p>
            </div>
            <div class="header-right">
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="stats-grid">
            <div class="stat-card" v-for="stat in stats" :key="stat.label">
              <div class="stat-icon" :style="{ background: stat.color + '20', color: stat.color }">
                <i :class="stat.icon"></i>
              </div>
              <div class="stat-info">
                <p class="stat-value">{{ stat.value }}</p>
                <p class="stat-label">{{ stat.label }}</p>
              </div>
            </div>
          </div>

          <!-- Charts Row -->
          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-header">
                <h3>Revenue Overview</h3>
                <span class="period-badge">Last 6 Months</span>
              </div>
              <div class="chart-placeholder" v-if="!loading">
                <div 
                  v-for="(value, index) in chartData" 
                  :key="index"
                  class="chart-bar-wrapper"
                >
                  <div class="chart-bar" 
                       :style="{ height: Math.max(10, (value / maxChartValue) * 100) + '%' }"
                       :class="{ 'bar-positive': value > 0, 'bar-zero': value === 0 }"
                  >
                    <span class="chart-value">₱{{ formatNumber(value) }}</span>
                  </div>
                  <span class="chart-label">{{ chartLabels[index] }}</span>
                </div>
              </div>
              <div v-else class="loading-chart">
                <i class="fas fa-spinner spin"></i> Loading...
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-header">
                <h3>Payment Methods</h3>
              </div>
              <div class="payment-methods" v-if="!loading">
                <div v-for="(count, method) in paymentData" :key="method" class="payment-item">
                  <div class="payment-icon" :class="method">
                    <i :class="getPaymentIcon(method)"></i>
                  </div>
                  <div class="payment-info">
                    <span class="payment-name">{{ method.toUpperCase() }}</span>
                    <span class="payment-count">{{ count }} transactions</span>
                  </div>
                  <div class="payment-bar">
                    <div class="payment-fill" :style="{ width: getPaymentPercentage(count) + '%' }"></div>
                  </div>
                </div>
              </div>
              <div v-else class="loading-chart">
                <i class="fas fa-spinner spin"></i> Loading...
              </div>
            </div>
          </div>

          <!-- Tax Controls Card -->
          <div class="tax-controls-card">
            <div class="tax-controls-header">
              <h3><i class="fas fa-percent" style="color: #F59E0B;"></i> POS Tax Controls</h3>
              <span class="info-badge">Finance Manager Access</span>
            </div>
            <div class="tax-controls-body">
              <div class="tax-control-group">
                <label>Tax Rate (%)</label>
                <div class="input-with-suffix">
                  <input 
                    v-model.number="taxForm.rate" 
                    type="number" 
                    min="0" 
                    max="100" 
                    step="0.5"
                    placeholder="12"
                  />
                  <span>%</span>
                </div>
                <small>Current store tax rate</small>
              </div>

              <div class="tax-control-group">
                <label>Tax Type</label>
                <select v-model="taxForm.type" class="form-control">
                  <option value="inclusive">Inclusive (Tax hidden in price)</option>
                  <option value="exclusive">Exclusive (Tax added on top)</option>
                </select>
                <small :class="taxForm.type === 'inclusive' ? 'text-success' : 'text-danger'">
                  <i v-if="taxForm.type === 'inclusive'" class="fas fa-check-circle"></i>
                  <i v-else class="fas fa-exclamation-triangle"></i>
                  {{ taxForm.type === 'inclusive' ? 'Customer pays the exact shelf price.' : 'Customer pays shelf price + tax.' }}
                </small>
              </div>

              <div class="tax-control-actions">
                <button @click="saveTaxSettings" class="btn-save-tax" :disabled="isSavingTax">
                  <i v-if="isSavingTax" class="fas fa-spinner spin"></i>
                  <i v-else class="fas fa-save"></i>
                  {{ isSavingTax ? 'Updating POS...' : 'Update POS Tax Settings' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Recent Transactions -->
          <div class="transactions-section">
            <div class="section-header">
              <h3>Recent Transactions</h3>
              <button @click="viewAllTransactions" class="btn-view-all">
                View All <i class="fas fa-arrow-right"></i>
              </button>
            </div>
            <div class="transactions-table-wrapper">
              <table class="transactions-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>DESCRIPTION</th>
                    <th>CATEGORY</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loading">
                    <td colspan="5" class="text-center">
                      <i class="fas fa-spinner spin"></i> Loading...
                    </td>
                  </tr>
                  <tr v-else-if="transactions.length === 0">
                    <td colspan="5" class="text-center">No transactions found</td>
                  </tr>
                  <tr v-for="transaction in transactions" :key="transaction.id">
                    <td>{{ formatDate(transaction.created_at || transaction.date) }}</td>
                    <td>{{ transaction.description }}</td>
                    <td>{{ transaction.category || 'General' }}</td>
                    <td :class="transaction.type === 'income' ? 'text-success' : 'text-danger'">
                      {{ transaction.type === 'income' ? '+' : '-' }}{{ formatCurrency(transaction.amount) }}
                    </td>
                    <td>
                      <span :class="getStatusClass(transaction.status)">
                        {{ (transaction.status || 'COMPLETED').toUpperCase() }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCartStore } from '@/stores/cart';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
import api from '@/api/index.js';
import Swal from 'sweetalert2';

const router = useRouter();
const authStore = useAuthStore();
const cartStore = useCartStore();

// State
const loading = ref(false);
const isRefreshing = ref(false);
const isSavingTax = ref(false);

// Stats
const stats = ref([
  { label: 'Total Revenue', value: '₱0.00', icon: 'fas fa-money-bill-wave', color: '#10B981' },
  { label: 'Total Expenses', value: '₱0.00', icon: 'fas fa-arrow-up', color: '#EF4444' },
  { label: 'Net Profit', value: '₱0.00', icon: 'fas fa-chart-line', color: '#4F46E5' },
  { label: 'Pending Invoices', value: '0', icon: 'fas fa-clock', color: '#F59E0B' }
]);

// Chart Data
const chartLabels = ref(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
const chartData = ref([0, 0, 0, 0, 0, 0]);
const maxChartValue = ref(100);

// Payment Data
const paymentData = ref({});

// Transactions
const transactions = ref([]);

// Tax Control Form
const taxForm = reactive({
  rate: 12,
  type: 'inclusive'
});

// ============================================
// HELPERS
// ============================================
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '') return '₱0.00';
  const numAmount = Number(amount);
  if (isNaN(numAmount)) return '₱0.00';
  return '₱' + numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatNumber = (amount) => {
  if (!amount) return '0';
  return Number(amount).toFixed(0);
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
};

const getStatusClass = (status) => {
  if (status === 'completed' || status === 'paid') return 'status-completed';
  if (status === 'pending') return 'status-pending';
  if (status === 'failed' || status === 'rejected') return 'status-failed';
  return 'status-pending';
};

const getPaymentIcon = (method) => {
  const icons = {
    cash: 'fas fa-money-bill-wave',
    gcash: 'fas fa-mobile-alt',
    maya: 'fas fa-mobile-alt',
    card: 'fas fa-credit-card'
  };
  return icons[method] || 'fas fa-circle';
};

const getPaymentPercentage = (count) => {
  const total = Object.values(paymentData.value).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return (count / total) * 100;
};

// ============================================
// LOAD DASHBOARD DATA
// ============================================
const loadDashboardData = async () => {
  loading.value = true;
  try {
    console.log('📊 Loading finance dashboard data...');
    
    const response = await api.get('/analytics.php');
    console.log('📊 Analytics response:', response.data);
    
    if (response.data && response.data.success) {
      const data = response.data.data;
      
      const revenue = data.stats.total_revenue || 0;
      const expenses = data.stats.total_expenses || 0;
      
      stats.value[0].value = formatCurrency(revenue);
      stats.value[1].value = formatCurrency(expenses);
      stats.value[2].value = formatCurrency(revenue - expenses);
      stats.value[3].value = String(data.stats.total_orders || 0);
      
      if (data.revenue_labels && data.revenue_data) {
        chartLabels.value = data.revenue_labels;
        chartData.value = data.revenue_data;
        maxChartValue.value = Math.max(...data.revenue_data, 100);
      }

      if (data.payment_data && Object.keys(data.payment_data).length > 0) {
        paymentData.value = data.payment_data;
      } else {
        paymentData.value = { cash: 10, gcash: 8, card: 10 };
      }
    }

    await loadTaxSettings();

    try {
      const txResponse = await api.get('/transactions.php?limit=8');
      if (Array.isArray(txResponse.data) && txResponse.data.length > 0) {
        transactions.value = txResponse.data.slice(0, 8);
      } else {
        transactions.value = [];
      }
    } catch (e) {
      console.warn('Could not load transactions');
      transactions.value = [];
    }
    
    console.log('✅ Finance dashboard data loaded!');
    
  } catch (error) {
    console.error('❌ Error loading finance dashboard:', error);
    stats.value[0].value = '₱0.00';
    stats.value[1].value = '₱0.00';
    stats.value[2].value = '₱0.00';
    stats.value[3].value = '0';
    paymentData.value = { cash: 10, gcash: 8, card: 10 };
    chartLabels.value = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    chartData.value = [0, 0, 0, 0, 0, 0];
  } finally {
    loading.value = false;
  }
};

// ============================================
// TAX FUNCTIONS
// ============================================
const loadTaxSettings = async () => {
  try {
    const response = await api.get('/settings.php');
    const data = response.data || {};
    taxForm.rate = parseFloat(data.tax_rate) || 12;
    taxForm.type = data.tax_type || 'inclusive';
  } catch (error) {
    console.error('Error loading tax settings:', error);
  }
};

const saveTaxSettings = async () => {
  isSavingTax.value = true;
  try {
    const response = await api.post('/settings.php', {
      tax_rate: taxForm.rate,
      tax_type: taxForm.type
    });

    if (response.data.success) {
      localStorage.setItem('tax_rate', taxForm.rate);
      localStorage.setItem('tax_type', taxForm.type);
      
      if (cartStore) {
        cartStore.updateTaxRate(taxForm.rate);
        cartStore.updateTaxType(taxForm.type);
      }

      await Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: 'POS Tax settings updated successfully!',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false
      });
    } else {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: response.data.message || 'Failed to save tax settings',
        confirmButtonColor: '#4F46E5'
      });
    }
  } catch (error) {
    console.error('Error saving tax settings:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to save tax settings',
      confirmButtonColor: '#4F46E5'
    });
  } finally {
    isSavingTax.value = false;
  }
};

const refreshData = async () => {
  isRefreshing.value = true;
  await loadDashboardData();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

const viewAllTransactions = () => {
  router.push('/finance/transactions');
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadDashboardData();
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

.finance-dashboard {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .header-left h1 {
  color: #e2e8f0;
}

.header-left p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .header-left p {
  color: #9ca3af;
}

.btn-refresh {
  background: white;
  border: 1px solid #e5e7eb;
  padding: 0.4rem 0.8rem;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

body.dark-mode .stat-card {
  background: #1e293b;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-icon {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .stat-value {
  color: #e2e8f0;
}

.stat-label {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0.1rem 0 0 0;
}

body.dark-mode .stat-label {
  color: #9ca3af;
}

.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .chart-card {
  background: #1e293b;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.chart-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .chart-header h3 {
  color: #e2e8f0;
}

.period-badge {
  font-size: 0.7rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
}

body.dark-mode .period-badge {
  background: #2d3748;
  color: #9ca3af;
}

.chart-placeholder {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 160px;
  padding: 0.5rem 0;
  gap: 0.3rem;
}

.chart-bar-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
  justify-content: flex-end;
}

.chart-bar {
  width: 100%;
  max-width: 40px;
  min-height: 5px;
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
  position: relative;
  background: linear-gradient(180deg, #4F46E5, #7C3AED);
}

.chart-bar.bar-positive {
  background: linear-gradient(180deg, #10B981, #34D399);
}

.chart-bar.bar-zero {
  background: linear-gradient(180deg, #9CA3AF, #D1D5DB);
}

.chart-value {
  position: absolute;
  top: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.5rem;
  color: #6b7280;
  white-space: nowrap;
  font-weight: 600;
}

body.dark-mode .chart-value {
  color: #9ca3af;
}

.chart-label {
  font-size: 0.6rem;
  color: #6b7280;
  text-align: center;
  margin-top: 0.3rem;
}

body.dark-mode .chart-label {
  color: #9ca3af;
}

.loading-chart {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 140px;
  color: #6b7280;
}

.loading-chart .spin {
  animation: spin 1s linear infinite;
  margin-right: 0.5rem;
}

.payment-methods {
  padding: 0.25rem 0;
}

.payment-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f3f4f6;
}

body.dark-mode .payment-item {
  border-bottom-color: #2d3748;
}

.payment-item:last-child {
  border-bottom: none;
}

.payment-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.payment-icon.cash {
  background: #d1fae5;
  color: #10b981;
}

body.dark-mode .payment-icon.cash {
  background: #064e3b;
}

.payment-icon.gcash {
  background: #e0e7ff;
  color: #4F46E5;
}

body.dark-mode .payment-icon.gcash {
  background: #312e81;
}

.payment-icon.maya {
  background: #fef3c7;
  color: #f59e0b;
}

body.dark-mode .payment-icon.maya {
  background: #78350f;
}

.payment-icon.card {
  background: #fce7f3;
  color: #ec4899;
}

body.dark-mode .payment-icon.card {
  background: #831843;
}

.payment-info {
  flex: 1;
}

.payment-name {
  display: block;
  font-weight: 500;
  font-size: 0.85rem;
  color: #1a1a2e;
}

body.dark-mode .payment-name {
  color: #e2e8f0;
}

.payment-count {
  font-size: 0.7rem;
  color: #6b7280;
}

body.dark-mode .payment-count {
  color: #9ca3af;
}

.payment-bar {
  flex: 1;
  max-width: 80px;
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
}

body.dark-mode .payment-bar {
  background: #2d3748;
}

.payment-fill {
  height: 100%;
  background: linear-gradient(90deg, #4F46E5, #7C3AED);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.tax-controls-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

body.dark-mode .tax-controls-card {
  background: #1e293b;
}

.tax-controls-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.tax-controls-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .tax-controls-header h3 {
  color: #e2e8f0;
}

.info-badge {
  font-size: 0.65rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.2rem 0.6rem;
  border-radius: 50px;
}

body.dark-mode .info-badge {
  background: #2d3748;
  color: #9ca3af;
}

.tax-controls-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: end;
}

.tax-control-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tax-control-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1f2937;
}

body.dark-mode .tax-control-group label {
  color: #e2e8f0;
}

.tax-control-group small {
  font-size: 0.7rem;
  color: #6b7280;
}

body.dark-mode .tax-control-group small {
  color: #9ca3af;
}

.tax-control-group small.text-success {
  color: #10b981;
}

.tax-control-group small.text-danger {
  color: #ef4444;
}

.input-with-suffix {
  display: flex;
  align-items: center;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

body.dark-mode .input-with-suffix {
  border-color: #374151;
  background: #1e293b;
}

.input-with-suffix input {
  flex: 1;
  border: none;
  padding: 0.4rem 0.6rem;
  font-size: 0.9rem;
  background: transparent;
  color: #1f2937;
  outline: none;
}

body.dark-mode .input-with-suffix input {
  color: #e2e8f0;
}

.input-with-suffix span {
  padding: 0.4rem 0.8rem;
  background: #f9fafb;
  color: #6b7280;
  font-weight: 600;
  font-size: 0.85rem;
  border-left: 2px solid #e5e7eb;
}

body.dark-mode .input-with-suffix span {
  background: #2d3748;
  border-left-color: #374151;
  color: #9ca3af;
}

.form-control {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  color: #1f2937;
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

.tax-control-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-save-tax {
  background: #10B981;
  color: white;
  border: none;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-save-tax:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
}

.btn-save-tax:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.transactions-section {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

body.dark-mode .transactions-section {
  background: #1e293b;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .section-header h3 {
  color: #e2e8f0;
}

.btn-view-all {
  background: none;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: color 0.2s;
}

.btn-view-all:hover {
  color: #4338CA;
}

.transactions-table-wrapper {
  overflow-x: auto;
}

.transactions-table {
  width: 100%;
  border-collapse: collapse;
}

.transactions-table th {
  padding: 0.4rem 0.6rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

body.dark-mode .transactions-table th {
  background: #0f172a;
  color: #9ca3af;
  border-bottom-color: #374151;
}

.transactions-table td {
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
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

.text-success {
  color: #10b981 !important;
  font-weight: 600;
}

.text-danger {
  color: #ef4444 !important;
  font-weight: 600;
}

.text-center {
  text-align: center;
  padding: 1rem;
  color: #6b7280;
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

@media (max-width: 992px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .finance-dashboard {
    padding: 1rem;
  }

  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .payment-bar {
    max-width: 60px;
  }

  .transactions-table-wrapper {
    overflow-x: auto;
  }

  .transactions-table {
    font-size: 0.8rem;
    min-width: 500px;
  }

  .chart-placeholder {
    height: 120px;
  }

  .tax-controls-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>