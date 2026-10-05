<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="dashboard-container">
          <!-- Welcome Section -->
          <div class="welcome-section">
            <div class="welcome-text">
              <h1>Welcome back, {{ user?.name || 'User' }}! 👋</h1>
              <p>Here's what's happening with your store today.</p>
            </div>
            <div class="welcome-date">
              <span>{{ currentDate }}</span>
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

          <!-- Charts Section -->
          <div class="charts-row">
            <div class="chart-card">
              <div class="chart-header">
                <h3>Revenue Overview</h3>
                <select class="chart-select">
                  <option>This Week</option>
                  <option>This Month</option>
                  <option>This Year</option>
                </select>
              </div>
              <div class="chart-placeholder">
                <div 
                  v-for="(value, index) in chartData" 
                  :key="index"
                  class="chart-bar"
                  :style="{ height: value + '%' }"
                >
                  <span class="chart-label">{{ chartLabels[index] }}</span>
                </div>
              </div>
            </div>

            <div class="chart-card">
              <div class="chart-header">
                <h3>Recent Orders</h3>
                <button class="btn-view-all" @click="viewAllOrders">View All</button>
              </div>
              <div class="recent-orders">
                <div v-if="recentOrders.length === 0" class="empty-orders">
                  <i class="fas fa-shopping-bag"></i>
                  <p>No recent orders</p>
                </div>
                <div v-for="order in recentOrders" :key="order.id" class="order-item">
                  <div class="order-info">
                    <span class="order-id">#{{ order.invoice_number || order.id }}</span>
                    <span class="order-customer">{{ order.customer_name || 'Walk-in' }}</span>
                  </div>
                  <div class="order-meta">
                    <span class="order-amount">₱{{ formatPrice(order.total) }}</span>
                    <span :class="['order-status', order.status || 'pending']">{{ order.status || 'pending' }}</span>
                  </div>
                </div>
              </div>
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

const user = computed(() => authStore.user);
const currentDate = ref('');

const stats = ref([
  { label: 'Total Revenue', value: '₱0.00', icon: 'fas fa-money-bill-wave', color: '#10B981', trend: 12 },
  { label: 'Total Orders', value: '0', icon: 'fas fa-shopping-bag', color: '#4F46E5', trend: 8 },
  { label: 'Total Products', value: '0', icon: 'fas fa-boxes', color: '#F59E0B', trend: 5 },
  { label: 'Total Customers', value: '0', icon: 'fas fa-users', color: '#EC4899', trend: -3 }
]);

const chartData = ref([65, 45, 80, 55, 70, 90, 60]);
const chartLabels = ref(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const recentOrders = ref([]);

const formatPrice = (price) => {
  if (!price) return '0.00';
  return Number(price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const loadDashboardData = async () => {
  try {
    console.log('📊 Loading dashboard data...');
    
    // ✅ FIXED: Removed /api/ prefix
    const statsResponse = await api.get('/dashboard.php');
    if (statsResponse.data) {
      if (statsResponse.data.revenue) {
        stats.value[0].value = '₱' + formatPrice(statsResponse.data.revenue);
      }
      if (statsResponse.data.orders) {
        stats.value[1].value = statsResponse.data.orders;
      }
      if (statsResponse.data.products) {
        stats.value[2].value = statsResponse.data.products;
      }
      if (statsResponse.data.customers) {
        stats.value[3].value = statsResponse.data.customers;
      }
    }
    
    // ✅ FIXED: Removed /api/ prefix
    const ordersResponse = await api.get('/sales.php?limit=5');
    if (ordersResponse.data && Array.isArray(ordersResponse.data)) {
      recentOrders.value = ordersResponse.data;
    } else {
      recentOrders.value = [
        { id: 1, invoice_number: 'INV-001', customer_name: 'John Doe', total: 1250.00, status: 'completed' },
        { id: 2, invoice_number: 'INV-002', customer_name: 'Jane Smith', total: 850.00, status: 'pending' },
        { id: 3, invoice_number: 'INV-003', customer_name: 'Mike Johnson', total: 2100.00, status: 'completed' }
      ];
    }
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
};

const viewAllOrders = () => {
  router.push('/sales');
};

onMounted(() => {
  const now = new Date();
  currentDate.value = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
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

.dashboard-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* ============================================
   WELCOME SECTION
   ============================================ */
.welcome-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.welcome-text h1 {
  font-size: 1.8rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.25rem 0;
}

body.dark-mode .welcome-text h1 {
  color: #e2e8f0;
}

.welcome-text p {
  color: #6b7280;
  margin: 0;
}

body.dark-mode .welcome-text p {
  color: #9ca3af;
}

.welcome-date {
  background: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #6b7280;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .welcome-date {
  background: #1e293b;
  color: #9ca3af;
}

/* ============================================
   STATS GRID
   ============================================ */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

body.dark-mode .stat-card {
  background: #1e293b;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex-shrink: 0;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .stat-value {
  color: #e2e8f0;
}

.stat-label {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0.1rem 0 0.25rem 0;
}

body.dark-mode .stat-label {
  color: #9ca3af;
}

.stat-trend {
  font-size: 0.75rem;
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
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .chart-card {
  background: #1e293b;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .chart-header h3 {
  color: #e2e8f0;
}

.chart-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 0.8rem;
  color: #1f2937;
}

body.dark-mode .chart-select {
  background: #2d3748;
  border-color: #374151;
  color: #e2e8f0;
}

.chart-placeholder {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  height: 180px;
  padding-top: 1rem;
}

.chart-bar {
  flex: 1;
  background: linear-gradient(180deg, #4F46E5, #7C3AED);
  border-radius: 4px 4px 0 0;
  min-height: 20px;
  position: relative;
  transition: height 0.3s ease;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
}

.chart-label {
  font-size: 0.7rem;
  color: #6b7280;
  margin-top: 0.4rem;
  position: absolute;
  bottom: -20px;
}

body.dark-mode .chart-label {
  color: #9ca3af;
}

.btn-view-all {
  background: none;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: color 0.2s;
}

.btn-view-all:hover {
  color: #4338CA;
}

/* ============================================
   RECENT ORDERS
   ============================================ */
.recent-orders {
  max-height: 300px;
  overflow-y: auto;
}

.empty-orders {
  text-align: center;
  padding: 2rem 0;
  color: #6b7280;
}

.empty-orders i {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
}

.order-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid #f3f4f6;
}

body.dark-mode .order-item {
  border-bottom-color: #2d3748;
}

.order-item:last-child {
  border-bottom: none;
}

.order-info {
  display: flex;
  flex-direction: column;
}

.order-id {
  font-weight: 600;
  font-size: 0.9rem;
  color: #1a1a2e;
}

body.dark-mode .order-id {
  color: #e2e8f0;
}

.order-customer {
  font-size: 0.8rem;
  color: #6b7280;
}

body.dark-mode .order-customer {
  color: #9ca3af;
}

.order-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.order-amount {
  font-weight: 600;
  color: #1a1a2e;
}

body.dark-mode .order-amount {
  color: #e2e8f0;
}

.order-status {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  text-transform: uppercase;
}

.order-status.completed {
  background: #d1fae5;
  color: #065f46;
}

body.dark-mode .order-status.completed {
  background: #064e3b;
  color: #6ee7b7;
}

.order-status.pending {
  background: #fef3c7;
  color: #92400e;
}

body.dark-mode .order-status.pending {
  background: #78350f;
  color: #fcd34d;
}

.order-status.cancelled {
  background: #fee2e2;
  color: #991b1b;
}

body.dark-mode .order-status.cancelled {
  background: #7f1d1d;
  color: #fca5a5;
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
  .dashboard-container {
    padding: 1rem;
  }
  
  .welcome-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
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