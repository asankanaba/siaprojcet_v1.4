<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="d-flex justify-content-between align-center mb-4">
          <div>
            <h4 style="font-weight:700;">Super Admin Dashboard</h4>
            <p class="text-muted">Full system analytics and monitoring</p>
          </div>
          <div class="d-flex gap-2">
            <span class="badge" style="background:linear-gradient(135deg,#EF4444,#7C3AED);color:white;padding:0.5rem 1rem;">
              <i class="fas fa-crown"></i> Super Admin
            </span>
            <button @click="refreshData" class="btn btn-secondary">
              <i class="fas fa-sync-alt" :class="{ spin: loading }"></i> Refresh
            </button>
          </div>
        </div>
        
        <!-- Stats Cards -->
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="card stats-card">
              <div class="stats-icon" style="background:rgba(79,70,229,0.1);color:#4F46E5;">
                <i class="fas fa-currency-sign"></i>
              </div>
              <div class="stats-info">
                <span class="stats-label">Total Revenue</span>
                <h3 class="stats-value">{{ formatCurrency(stats.total_revenue) }}</h3>
                <span class="stats-change" :class="stats.revenue_change >= 0 ? 'positive' : 'negative'">
                  <i :class="stats.revenue_change >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(stats.revenue_change) }}%
                </span>
              </div>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="card stats-card">
              <div class="stats-icon" style="background:rgba(16,185,129,0.1);color:#10B981;">
                <i class="fas fa-shopping-cart"></i>
              </div>
              <div class="stats-info">
                <span class="stats-label">Total Orders</span>
                <h3 class="stats-value">{{ stats.total_orders }}</h3>
                <span class="stats-change" :class="stats.orders_change >= 0 ? 'positive' : 'negative'">
                  <i :class="stats.orders_change >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(stats.orders_change) }}%
                </span>
              </div>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="card stats-card">
              <div class="stats-icon" style="background:rgba(245,158,11,0.1);color:#F59E0B;">
                <i class="fas fa-users"></i>
              </div>
              <div class="stats-info">
                <span class="stats-label">Active Customers</span>
                <h3 class="stats-value">{{ stats.active_customers }}</h3>
                <span class="stats-change" :class="stats.customers_change >= 0 ? 'positive' : 'negative'">
                  <i :class="stats.customers_change >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(stats.customers_change) }}%
                </span>
              </div>
            </div>
          </div>
          
          <div class="col-md-3">
            <div class="card stats-card">
              <div class="stats-icon" style="background:rgba(239,68,68,0.1);color:#EF4444;">
                <i class="fas fa-boxes"></i>
              </div>
              <div class="stats-info">
                <span class="stats-label">Items Sold</span>
                <h3 class="stats-value">{{ stats.items_sold }}</h3>
                <span class="stats-change" :class="stats.items_change >= 0 ? 'positive' : 'negative'">
                  <i :class="stats.items_change >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(stats.items_change) }}%
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Charts Section -->
        <div class="row g-3 mb-4">
          <div class="col-md-8">
            <div class="card">
              <h5 style="font-weight:700;margin-bottom:1rem;">
                <i class="fas fa-chart-line"></i> Revenue Overview
              </h5>
              <div class="chart-container">
                <canvas ref="revenueChartRef"></canvas>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card">
              <h5 style="font-weight:700;margin-bottom:1rem;">
                <i class="fas fa-chart-pie"></i> Payment Methods
              </h5>
              <div class="chart-container">
                <canvas ref="paymentChartRef"></canvas>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Additional Charts -->
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="card">
              <h5 style="font-weight:700;margin-bottom:1rem;">
                <i class="fas fa-trophy"></i> Top Selling Products
              </h5>
              <div class="chart-container">
                <canvas ref="topProductsChartRef"></canvas>
              </div>
            </div>
          </div>
          
          <div class="col-md-6">
            <div class="card">
              <h5 style="font-weight:700;margin-bottom:1rem;">
                <i class="fas fa-credit-card"></i> Orders Distribution
              </h5>
              <div class="chart-container">
                <canvas ref="ordersChartRef"></canvas>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Recent Sales Table -->
        <div class="card">
          <h5 style="font-weight:700;margin-bottom:1rem;">
            <i class="fas fa-table"></i> Recent Transactions
          </h5>
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Cashier</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="recentSales.length === 0">
                  <td colspan="7" class="text-center text-muted" style="padding:2rem 0;">
                    <i class="fas fa-receipt" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                    No sales recorded yet
                  </td>
                </tr>
                <tr v-for="sale in recentSales" :key="sale.id">
                  <td><strong>{{ sale.invoice_number }}</strong></td>
                  <td>{{ sale.customer_name || 'Walk-in' }}</td>
                  <td>{{ sale.cashier_name || 'Unknown' }}</td>
                  <td>{{ sale.item_count || 0 }}</td>
                  <td>{{ formatCurrency(sale.total) }}</td>
                  <td><span class="badge badge-info">{{ sale.payment_method }}</span></td>
                  <td>{{ formatDate(sale.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Loading Overlay -->
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner">
            <i class="fas fa-spinner spin"></i>
            <p>Loading analytics...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { Chart, registerables } from 'chart.js'
import Sidebar from '../components/common/Sidebar.vue'
import Navbar from '../components/common/Navbar.vue'
import api from '@/api/index.js'

Chart.register(...registerables)

const loading = ref(false)

const revenueChartRef = ref(null)
const paymentChartRef = ref(null)
const topProductsChartRef = ref(null)
const ordersChartRef = ref(null)

let revenueChart = null
let paymentChart = null
let topProductsChart = null
let ordersChart = null

const stats = ref({
  total_revenue: 0,
  total_orders: 0,
  active_customers: 0,
  items_sold: 0,
  revenue_change: 0,
  orders_change: 0,
  customers_change: 0,
  items_change: 0
})

const recentSales = ref([])

const formatCurrency = (amount) => {
  return '₱' + Number(amount).toFixed(2)
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadAnalytics = async () => {
  loading.value = true
  try {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const response = await api.get('/reports.php', {
      params: {
        start: firstDay.toISOString().split('T')[0] + ' 00:00:00',
        end: now.toISOString().split('T')[0] + ' 23:59:59'
      }
    })
    const data = response.data
    
    stats.value = {
      total_revenue: data.total_revenue || 0,
      total_orders: data.total_orders || 0,
      active_customers: data.active_customers || 0,
      items_sold: data.items_sold || 0,
      revenue_change: data.revenue_change || 0,
      orders_change: data.orders_change || 0,
      customers_change: data.customers_change || 0,
      items_change: data.items_change || 0
    }
    
    recentSales.value = data.recent_sales || []
    
    await nextTick()
    renderCharts(data)
  } catch (error) {
    console.error('Error loading analytics:', error)
  } finally {
    loading.value = false
  }
}

const renderCharts = (data) => {
  // Revenue Chart
  if (revenueChartRef.value) {
    if (revenueChart) revenueChart.destroy()
    revenueChart = new Chart(revenueChartRef.value.getContext('2d'), {
      type: 'line',
      data: {
        labels: data.revenue_chart?.labels || ['No Data'],
        datasets: [{
          label: 'Revenue',
          data: data.revenue_chart?.values || [0],
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79,70,229,0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (v) => '₱' + v }
          }
        }
      }
    })
  }
  
  // Payment Chart
  if (paymentChartRef.value) {
    if (paymentChart) paymentChart.destroy()
    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
    paymentChart = new Chart(paymentChartRef.value.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: data.payment_chart?.labels || ['Cash', 'GCash', 'Maya', 'Card'],
        datasets: [{
          data: data.payment_chart?.values || [0, 0, 0, 0],
          backgroundColor: colors
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    })
  }
  
  // Top Products Chart
  if (topProductsChartRef.value) {
    if (topProductsChart) topProductsChart.destroy()
    topProductsChart = new Chart(topProductsChartRef.value.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.top_products_chart?.labels || ['No Data'],
        datasets: [{
          label: 'Units Sold',
          data: data.top_products_chart?.values || [0],
          backgroundColor: ['#4F46E5', '#7C3AED', '#3B82F6', '#10B981', '#F59E0B']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } }
      }
    })
  }
  
  // Orders Chart
  if (ordersChartRef.value) {
    if (ordersChart) ordersChart.destroy()
    ordersChart = new Chart(ordersChartRef.value.getContext('2d'), {
      type: 'bar',
      data: {
        labels: data.orders_chart?.labels || ['No Data'],
        datasets: [{
          label: 'Orders',
          data: data.orders_chart?.values || [0],
          backgroundColor: 'rgba(16,185,129,0.6)',
          borderColor: '#10B981',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    })
  }
}

const refreshData = () => {
  loadAnalytics()
}

onMounted(() => {
  loadAnalytics()
})
</script>

<style scoped>
.stats-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.stats-info {
  flex: 1;
}

.stats-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: block;
}

.stats-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0.25rem 0;
}

.stats-change {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.stats-change.positive {
  color: #10B981;
  background: rgba(16,185,129,0.1);
}

.stats-change.negative {
  color: #EF4444;
  background: rgba(239,68,68,0.1);
}

.chart-container {
  position: relative;
  height: 280px;
}

.loading-overlay {
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
}

.loading-spinner {
  background: white;
  padding: 2rem 3rem;
  border-radius: 16px;
  text-align: center;
}

body.dark-mode .loading-spinner {
  background: var(--bg-card);
}

.loading-spinner i {
  font-size: 2.5rem;
  color: var(--primary);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
}

body.dark-mode .stats-card {
  background: var(--bg-card);
}

body.dark-mode .stats-change.positive {
  background: rgba(16,185,129,0.2);
}

body.dark-mode .stats-change.negative {
  background: rgba(239,68,68,0.2);
}

@media (max-width: 768px) {
  .stats-card {
    flex-direction: column;
    text-align: center;
  }
  
  .chart-container {
    height: 200px;
  }
}
</style>