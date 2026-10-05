<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="ceo-dashboard">
          <!-- Header -->
          <div class="dashboard-header">
            <div class="header-left">
              <h1>CEO Dashboard</h1>
              <p>Full system analytics and monitoring</p>
            </div>
            <div class="header-right">
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
              <span class="role-badge">CEO</span>
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

          <!-- Charts Row -->
          <div class="charts-row">
            <!-- Revenue Chart -->
            <div class="chart-card">
              <div class="chart-header">
                <h3>Revenue Overview</h3>
                <span class="period-badge">Last 6 Months</span>
              </div>
              <div class="chart-placeholder" v-if="!loading">
                <div 
                  v-for="(value, index) in chartValues" 
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

            <!-- Top Products -->
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
          </div>

          <!-- Recent Activity -->
          <div class="activity-section">
            <h3>Recent Activity</h3>
            <div class="activity-list" v-if="!loading">
              <div v-if="activities.length === 0" class="empty-state">
                <i class="fas fa-clock"></i>
                <p>No recent activity</p>
              </div>
              <div v-for="(activity, index) in activities" :key="index" class="activity-item">
                <div class="activity-icon" :class="activity.type">
                  <i :class="getActivityIcon(activity.type)"></i>
                </div>
                <div class="activity-content">
                  <p class="activity-text">{{ activity.message }}</p>
                  <span class="activity-time">{{ formatTime(activity.time) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="loading-chart">
              <i class="fas fa-spinner spin"></i> Loading...
            </div>
          </div>

          <!-- User Info -->
          <div class="user-info">
            <div class="user-avatar">
              <i class="fas fa-user-circle"></i>
            </div>
            <div class="user-details">
              <span class="user-name">{{ user?.name || 'Admin' }}</span>
              <span class="user-role">CEO</span>
              <span class="user-email">{{ user?.email || 'admin@smartpos.com' }}</span>
            </div>
          </div>
        </div>
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

const router = useRouter();
const authStore = useAuthStore();

// User
const user = computed(() => authStore.user);
const isRefreshing = ref(false);
const loading = ref(false);

// Stats
const stats = ref([
  { label: 'Total Revenue', value: '₱0.00', icon: 'fas fa-money-bill-wave', color: '#10B981', trend: 0 },
  { label: 'Total Orders', value: '0', icon: 'fas fa-shopping-bag', color: '#4F46E5', trend: 0 },
  { label: 'Total Products', value: '0', icon: 'fas fa-boxes', color: '#F59E0B', trend: 0 },
  { label: 'Total Customers', value: '0', icon: 'fas fa-users', color: '#EC4899', trend: 0 }
]);

// Chart Data
const chartLabels = ref(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
const chartValues = ref([0, 0, 0, 0, 0, 0]);
const maxChartValue = ref(100);
const topProducts = ref([]);
const activities = ref([]);

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

const formatNumber = (amount) => {
  if (!amount) return '0';
  return Number(amount).toFixed(0);
};

const formatTime = (date) => {
  if (!date) return 'Just now';
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000);
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + ' minutes ago';
  if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
  return Math.floor(diff / 86400) + ' days ago';
};

const getActivityIcon = (type) => {
  const icons = {
    sale: 'fas fa-shopping-cart',
    product: 'fas fa-box',
    user: 'fas fa-user',
    order: 'fas fa-receipt',
    payment: 'fas fa-credit-card'
  };
  return icons[type] || 'fas fa-circle';
};

// ============================================
// LOAD DATA
// ============================================
const loadDashboardData = async () => {
  loading.value = true;
  try {
    console.log('📊 Loading CEO dashboard data...');
    
    const response = await api.get('/api/dashboard.php?type=ceo');
    
    console.log('📊 CEO Dashboard response:', response.data);
    
    if (response.data) {
      // Update stats with real data
      if (response.data.revenue !== undefined) {
        stats.value[0].value = formatCurrency(response.data.revenue);
        stats.value[0].trend = response.data.revenue > 0 ? 12 : 0;
      }
      if (response.data.orders !== undefined) {
        stats.value[1].value = response.data.orders;
        stats.value[1].trend = response.data.orders > 0 ? 8 : 0;
      }
      if (response.data.products !== undefined) {
        stats.value[2].value = response.data.products;
        stats.value[2].trend = response.data.products > 0 ? 5 : 0;
      }
      if (response.data.customers !== undefined) {
        stats.value[3].value = response.data.customers;
        stats.value[3].trend = response.data.customers > 0 ? 15 : 0;
      }
      
      // Update chart data
      if (response.data.chartLabels && response.data.chartValues) {
        chartLabels.value = response.data.chartLabels;
        chartValues.value = response.data.chartValues;
        maxChartValue.value = Math.max(...response.data.chartValues, 100);
      }
      
      // Update top products
      if (response.data.topProducts && Array.isArray(response.data.topProducts)) {
        topProducts.value = response.data.topProducts;
      }
      
      // Update activities
      if (response.data.activities && Array.isArray(response.data.activities)) {
        activities.value = response.data.activities;
      }
      
      console.log('✅ CEO Dashboard data loaded successfully');
    } else {
      console.warn('No data received from API');
      loadSampleData();
    }
    
  } catch (error) {
    console.error('Error loading CEO dashboard data:', error);
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
    { label: 'Total Revenue', value: '₱1,424.25', icon: 'fas fa-money-bill-wave', color: '#10B981', trend: 12 },
    { label: 'Total Orders', value: '28', icon: 'fas fa-shopping-bag', color: '#4F46E5', trend: 8 },
    { label: 'Total Products', value: '14', icon: 'fas fa-boxes', color: '#F59E0B', trend: 5 },
    { label: 'Total Customers', value: '2', icon: 'fas fa-users', color: '#EC4899', trend: 15 }
  ];
  
  chartLabels.value = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  chartValues.value = [0, 0, 0, 0, 0, 0];
  maxChartValue.value = 100;
  
  topProducts.value = [
    { name: 'Designer Bangles', total_sold: 37 },
    { name: 'Reading Books', total_sold: 19 },
    { name: 'Leather Shoe', total_sold: 18 },
    { name: 'Leather Purse', total_sold: 9 },
    { name: 'Digital Camera', total_sold: 9 }
  ];
  
  activities.value = [
    { type: 'sale', message: 'New sale completed - ₱1,200.00', time: new Date(Date.now() - 300000).toISOString() },
    { type: 'product', message: 'Product "iPhone" stock updated to 22', time: new Date(Date.now() - 3600000).toISOString() },
    { type: 'user', message: 'New user "HR Manager" registered', time: new Date(Date.now() - 7200000).toISOString() }
  ];
};

// ============================================
// REFRESH & NAVIGATION
// ============================================
const refreshData = async () => {
  isRefreshing.value = true;
  await loadDashboardData();
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
  console.log('🔄 CEO Dashboard mounted');
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

.ceo-dashboard {
  padding: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* ============================================
   HEADER
   ============================================ */
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

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
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

.btn-refresh .spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.role-badge {
  background: #4F46E5;
  color: white;
  padding: 0.3rem 0.8rem;
  border-radius: 50px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
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
   CHARTS ROW
   ============================================ */
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
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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

/* ============================================
   TOP PRODUCTS
   ============================================ */
.top-products {
  max-height: 250px;
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
   ACTIVITY SECTION
   ============================================ */
.activity-section {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

body.dark-mode .activity-section {
  background: #1e293b;
}

.activity-section h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 0.75rem 0;
}

body.dark-mode .activity-section h3 {
  color: #e2e8f0;
}

.activity-list {
  max-height: 250px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

body.dark-mode .activity-item {
  border-bottom-color: #2d3748;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 0.8rem;
}

.activity-icon.sale {
  background: #d1fae5;
  color: #10b981;
}

body.dark-mode .activity-icon.sale {
  background: #064e3b;
}

.activity-icon.product {
  background: #eef2ff;
  color: #4F46E5;
}

body.dark-mode .activity-icon.product {
  background: #312e81;
}

.activity-icon.user {
  background: #fef3c7;
  color: #f59e0b;
}

body.dark-mode .activity-icon.user {
  background: #78350f;
}

.activity-icon.order {
  background: #e0e7ff;
  color: #6366f1;
}

body.dark-mode .activity-icon.order {
  background: #3730a3;
}

.activity-icon.payment {
  background: #fce7f3;
  color: #ec4899;
}

body.dark-mode .activity-icon.payment {
  background: #831843;
}

.activity-content {
  flex: 1;
}

.activity-text {
  margin: 0;
  font-size: 0.85rem;
  color: #1f2937;
}

body.dark-mode .activity-text {
  color: #e2e8f0;
}

.activity-time {
  font-size: 0.7rem;
  color: #6b7280;
}

body.dark-mode .activity-time {
  color: #9ca3af;
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
   USER INFO
   ============================================ */
.user-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .user-info {
  background: #1e293b;
}

.user-avatar {
  font-size: 2.5rem;
  color: #4F46E5;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 1rem;
  font-weight: 700;
  color: #1a1a2e;
}

body.dark-mode .user-name {
  color: #e2e8f0;
}

.user-role {
  font-size: 0.8rem;
  color: #4F46E5;
  font-weight: 600;
}

.user-email {
  font-size: 0.8rem;
  color: #6b7280;
}

body.dark-mode .user-email {
  color: #9ca3af;
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
  .ceo-dashboard {
    padding: 1rem;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .chart-placeholder {
    height: 120px;
  }
  
  .chart-bar {
    max-width: 30px;
  }
  
  .user-info {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>