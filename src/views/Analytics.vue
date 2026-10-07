<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="analytics-container">
          <!-- Header -->
          <div class="analytics-header">
            <div class="header-left">
              <h2><i class="fas fa-chart-line"></i> Analytics Dashboard</h2>
              <p>Real-time business analytics and insights</p>
            </div>
            <div class="header-right">
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
              <span class="last-updated">Last updated: {{ lastUpdated }}</span>
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
                <span v-if="stat.trend" class="stat-trend" :class="{ up: stat.trend > 0, down: stat.trend < 0 }">
                  <i :class="stat.trend > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(stat.trend) }}%
                </span>
              </div>
            </div>
          </div>

          <!-- Revenue Chart -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Revenue Overview</h3>
              <span class="period-badge">Last 12 Months</span>
            </div>
            <div class="chart-placeholder" v-if="!loading">
              <div 
                v-for="(value, index) in revenueData" 
                :key="index"
                class="chart-bar-wrapper"
              >
                <div class="chart-bar" 
                     :style="{ height: Math.max(10, (value / maxRevenue) * 100) + '%' }"
                     :class="{ 'bar-positive': value > 0, 'bar-zero': value === 0 }"
                >
                  <span class="chart-value">₱{{ formatNumber(value) }}</span>
                </div>
                <span class="chart-label">{{ revenueLabels[index] }}</span>
              </div>
            </div>
            <div v-else class="loading-chart">
              <i class="fas fa-spinner spin"></i> Loading...
            </div>
          </div>

          <!-- Daily Revenue -->
          <div class="chart-card">
            <div class="chart-header">
              <h3>Daily Revenue</h3>
              <span class="period-badge">Last 7 Days</span>
            </div>
            <div class="chart-placeholder small" v-if="!loading">
              <div 
                v-for="(value, index) in dailyData" 
                :key="index"
                class="chart-bar-wrapper"
              >
                <div class="chart-bar daily" 
                     :style="{ height: Math.max(10, (value / maxDaily) * 100) + '%' }"
                     :class="{ 'bar-positive': value > 0, 'bar-zero': value === 0 }"
                >
                  <span class="chart-value">₱{{ formatNumber(value) }}</span>
                </div>
                <span class="chart-label">{{ dailyLabels[index] }}</span>
              </div>
            </div>
            <div v-else class="loading-chart">
              <i class="fas fa-spinner spin"></i> Loading...
            </div>
          </div>

          <!-- Top Products & Payment Methods -->
          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-header">
                <h3>Top Products</h3>
                <button class="btn-view-all" @click="viewAllProducts">View All</button>
              </div>
              <div class="top-products" v-if="!loading">
                <div v-if="topProducts.length === 0" class="empty-state">
                  <i class="fas fa-box-open"></i>
                  <p>No products data</p>
                </div>
                <div v-for="(product, index) in topProducts" :key="index" class="product-item">
                  <div class="product-rank">{{ index + 1 }}</div>
                  <div class="product-info">
                    <span class="product-name">{{ product.name || 'Unknown' }}</span>
                    <span class="product-sales">{{ product.total_sold || 0 }} sold</span>
                  </div>
                  <div class="product-badge">{{ product.total_sold || 0 }} units</div>
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
                <div v-if="Object.keys(paymentData).length === 0" class="empty-state">
                  <i class="fas fa-credit-card"></i>
                  <p>No payment data</p>
                </div>
              </div>
              <div v-else class="loading-chart">
                <i class="fas fa-spinner spin"></i> Loading...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
import api from '@/api/index.js';

const router = useRouter();
const authStore = useAuthStore();

// State
const loading = ref(false);
const isRefreshing = ref(false);
const lastUpdated = ref('');

// Stats
const stats = ref([
  { label: 'Total Revenue', value: '₱0.00', icon: 'fas fa-money-bill-wave', color: '#10B981', trend: 0 },
  { label: 'Total Orders', value: '0', icon: 'fas fa-shopping-bag', color: '#4F46E5', trend: 0 },
  { label: 'Active Customers', value: '0', icon: 'fas fa-users', color: '#EC4899', trend: 0 },
  { label: 'Items Sold', value: '0', icon: 'fas fa-boxes', color: '#F59E0B', trend: 0 }
]);

// Chart Data
const revenueLabels = ref([]);
const revenueData = ref([]);
const dailyLabels = ref([]);
const dailyData = ref([]);
const topProducts = ref([]);
const paymentData = ref({});
const maxRevenue = ref(100);
const maxDaily = ref(100);

// ============================================
// HELPERS
// ============================================
const formatCurrency = (amount) => {
  if (!amount) return '₱0.00';
  return '₱' + Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const formatNumber = (amount) => {
  if (!amount) return '0';
  return Number(amount).toFixed(0);
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
// LOAD ANALYTICS
// ============================================
const loadAnalytics = async () => {
  loading.value = true;
  try {
    const response = await api.get('/api/analytics.php');
    
    console.log('📊 Analytics response:', response.data);
    
    if (response.data && response.data.success) {
      const data = response.data.data;
      
      // Update stats
      if (data.stats) {
        stats.value[0].value = formatCurrency(data.stats.total_revenue || 0);
        stats.value[1].value = data.stats.total_orders || 0;
        stats.value[2].value = data.stats.active_customers || 0;
        stats.value[3].value = data.stats.items_sold || 0;
        
        stats.value[0].trend = data.stats.revenue_growth || 0;
        stats.value[1].trend = data.stats.orders_growth || 0;
        stats.value[2].trend = data.stats.customers_growth || 0;
        stats.value[3].trend = data.stats.products_growth || 0;
      }
      
      // Update revenue chart
      if (data.revenue_labels && data.revenue_data) {
        revenueLabels.value = data.revenue_labels;
        revenueData.value = data.revenue_data;
        maxRevenue.value = Math.max(...data.revenue_data, 100);
      }
      
      // Update daily chart
      if (data.daily_labels && data.daily_data) {
        dailyLabels.value = data.daily_labels;
        dailyData.value = data.daily_data;
        maxDaily.value = Math.max(...data.daily_data, 100);
      }
      
      // Update top products
      if (data.top_products) {
        topProducts.value = data.top_products;
      }
      
      // Update payment data
      if (data.payment_data) {
        paymentData.value = data.payment_data;
      }
      
      // Update last updated
      const now = new Date();
      lastUpdated.value = now.toLocaleString();
      
      console.log('✅ Analytics data loaded successfully');
    } else {
      console.warn('No analytics data available');
      loadSampleData();
    }
  } catch (error) {
    console.error('Error loading analytics:', error);
    loadSampleData();
  } finally {
    loading.value = false;
  }
};

// ============================================
// SAMPLE DATA FALLBACK
// ============================================
const loadSampleData = () => {
  stats.value = [
    { label: 'Total Revenue', value: '₱1,424.25', icon: 'fas fa-money-bill-wave', color: '#10B981', trend: 12.5 },
    { label: 'Total Orders', value: '28', icon: 'fas fa-shopping-bag', color: '#4F46E5', trend: 8.3 },
    { label: 'Active Customers', value: '2', icon: 'fas fa-users', color: '#EC4899', trend: 15.2 },
    { label: 'Items Sold', value: '99', icon: 'fas fa-boxes', color: '#F59E0B', trend: 5.1 }
  ];
  
  revenueLabels.value = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  revenueData.value = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  maxRevenue.value = 100;
  
  dailyLabels.value = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  dailyData.value = [0, 0, 0, 0, 0, 0, 0];
  maxDaily.value = 100;
  
  topProducts.value = [
    { name: 'Designer Bangles', total_sold: 37 },
    { name: 'Reading Books', total_sold: 19 },
    { name: 'Leather Shoe', total_sold: 18 },
    { name: 'Leather Purse', total_sold: 9 }
  ];
  
  paymentData.value = {
    cash: 10,
    gcash: 8,
    card: 10
  };
  
  const now = new Date();
  lastUpdated.value = now.toLocaleString();
};

// ============================================
// REFRESH & NAVIGATION
// ============================================
const refreshData = async () => {
  isRefreshing.value = true;
  await loadAnalytics();
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

const viewAllProducts = () => {
  router.push('/products');
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadAnalytics();
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

.analytics-container {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* ============================================
   HEADER
   ============================================ */
.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .header-left h2 {
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

.last-updated {
  font-size: 0.75rem;
  color: #6b7280;
}

body.dark-mode .last-updated {
  color: #9ca3af;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============================================
   STATS GRID
   ============================================ */
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
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
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
  margin: 0.1rem 0 0.2rem 0;
}

body.dark-mode .stat-label {
  color: #9ca3af;
}

.stat-trend {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.stat-trend.up {
  color: #10b981;
  background: #d1fae5;
}

body.dark-mode .stat-trend.up {
  background: #064e3b;
}

.stat-trend.down {
  color: #ef4444;
  background: #fee2e2;
}

body.dark-mode .stat-trend.down {
  background: #7f1d1d;
}

/* ============================================
   CHARTS
   ============================================ */
.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1rem;
}

body.dark-mode .chart-card {
  background: #1e293b;
}

.charts-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
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

/* ============================================
   CHART BARS
   ============================================ */
.chart-placeholder {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  height: 180px;
  padding: 0.5rem 0;
  gap: 0.3rem;
}

.chart-placeholder.small {
  height: 140px;
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

.chart-bar.daily {
  background: linear-gradient(180deg, #10B981, #34D399);
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
  min-width: 20px;
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

/* ============================================
   TOP PRODUCTS
   ============================================ */
.top-products {
  max-height: 200px;
  overflow-y: auto;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid #f3f4f6;
}

body.dark-mode .product-item {
  border-bottom-color: #2d3748;
}

.product-item:last-child {
  border-bottom: none;
}

.product-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  color: #6b7280;
  flex-shrink: 0;
}

body.dark-mode .product-rank {
  background: #2d3748;
  color: #9ca3af;
}

.product-info {
  flex: 1;
}

.product-name {
  display: block;
  font-weight: 500;
  font-size: 0.85rem;
  color: #1a1a2e;
}

body.dark-mode .product-name {
  color: #e2e8f0;
}

.product-sales {
  font-size: 0.7rem;
  color: #6b7280;
}

body.dark-mode .product-sales {
  color: #9ca3af;
}

.product-badge {
  background: #eef2ff;
  color: #4F46E5;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
}

body.dark-mode .product-badge {
  background: #312e81;
  color: #818cf8;
}

/* ============================================
   PAYMENT METHODS
   ============================================ */
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

/* ============================================
   EMPTY STATE
   ============================================ */
.empty-state {
  text-align: center;
  padding: 1rem 0;
  color: #6b7280;
}

.empty-state i {
  font-size: 1.5rem;
  display: block;
  margin-bottom: 0.25rem;
}

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 992px) {
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .analytics-container {
    padding: 1rem;
  }
  
  .analytics-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .chart-placeholder {
    height: 120px;
  }
  
  .chart-placeholder.small {
    height: 100px;
  }
  
  .chart-bar {
    max-width: 30px;
  }
  
  .payment-bar {
    max-width: 60px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>