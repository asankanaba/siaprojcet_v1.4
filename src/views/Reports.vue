<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="d-flex justify-content-between align-center mb-4">
          <h4 style="font-weight:700;">Reports & Analytics</h4>
          <div class="d-flex gap-2">
            <button @click="exportPDF" class="btn btn-primary">
              <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button @click="exportExcel" class="btn btn-success">
              <i class="fas fa-file-excel"></i> Export Excel
            </button>
            <button @click="loadReportData" class="btn btn-secondary">
              <i class="fas fa-sync-alt" :class="{ spin: loading }"></i> Refresh
            </button>
          </div>
        </div>
        
        <!-- Date Range Filter -->
        <div class="card mb-4">
          <div class="row g-3 align-items-end">
            <div class="col-md-3">
              <label class="form-label">Date Range</label>
              <select v-model="dateRange" class="form-control" @change="loadReportData">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month" selected>This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            <div class="col-md-3" v-if="dateRange === 'custom'">
              <label class="form-label">Start Date</label>
              <input v-model="startDate" type="date" class="form-control" @change="loadReportData" />
            </div>
            <div class="col-md-3" v-if="dateRange === 'custom'">
              <label class="form-label">End Date</label>
              <input v-model="endDate" type="date" class="form-control" @change="loadReportData" />
            </div>
            <div class="col-md-3">
              <label class="form-label">Report Type</label>
              <select v-model="reportType" class="form-control" @change="loadReportData">
                <option value="sales">Sales Report</option>
                <option value="products">Products Report</option>
                <option value="customers">Customers Report</option>
                <option value="inventory">Inventory Report</option>
                <option value="payment">Payment Methods</option>
              </select>
            </div>
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
                <span class="stats-label">Total Sales</span>
                <h3 class="stats-value">{{ formatCurrency(stats.total_sales) }}</h3>
                <span class="stats-change" :class="stats.sales_change >= 0 ? 'positive' : 'negative'">
                  <i :class="stats.sales_change >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(stats.sales_change) }}%
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
                <span class="stats-label">Total Customers</span>
                <h3 class="stats-value">{{ stats.total_customers }}</h3>
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
                <span class="stats-label">Low Stock Items</span>
                <h3 class="stats-value">{{ stats.low_stock }}</h3>
                <span class="stats-change" :class="stats.low_stock_change <= 0 ? 'positive' : 'negative'">
                  <i :class="stats.low_stock_change <= 0 ? 'fas fa-arrow-down' : 'fas fa-arrow-up'"></i>
                  {{ Math.abs(stats.low_stock_change) }}%
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Charts Section -->
        <div class="row g-3 mb-4">
          <!-- Sales Chart -->
          <div class="col-md-8">
            <div class="card">
              <h5 style="font-weight:700;margin-bottom:1rem;">
                <i class="fas fa-chart-line"></i> Sales Overview
              </h5>
              <div class="chart-container">
                <canvas ref="salesChartRef"></canvas>
              </div>
            </div>
          </div>
          
          <!-- Payment Methods Chart -->
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
          <!-- Top Products -->
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
          
          <!-- Customer Growth -->
          <div class="col-md-6">
            <div class="card">
              <h5 style="font-weight:700;margin-bottom:1rem;">
                <i class="fas fa-user-plus"></i> Customer Growth
              </h5>
              <div class="chart-container">
                <canvas ref="customerChartRef"></canvas>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="recentSales.length === 0">
                  <td colspan="8" class="text-center text-muted" style="padding:2rem 0;">
                    <i class="fas fa-receipt" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                    No sales data available
                  </td>
                </tr>
                <tr v-for="sale in paginatedSales" :key="sale.id">
                  <td><strong>{{ sale.invoice_number }}</strong></td>
                  <td>{{ sale.customer_name || 'Walk-in' }}</td>
                  <td>{{ sale.cashier_name || 'Unknown' }}</td>
                  <td>{{ sale.item_count || 0 }}</td>
                  <td>{{ formatCurrency(sale.total) }}</td>
                  <td><span class="badge badge-info">{{ sale.payment_method }}</span></td>
                  <td>{{ formatDate(sale.created_at) }}</td>
                  <td>
                    <span class="badge" :class="sale.status === 'completed' ? 'badge-success' : 'badge-danger'">
                      {{ sale.status || 'Completed' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="text-muted small">
              Showing {{ (currentPage - 1) * itemsPerPage + 1 }} - 
              {{ Math.min(currentPage * itemsPerPage, recentSales.length) }} 
              of {{ recentSales.length }} entries
            </span>
            <div class="d-flex gap-1">
              <button 
                class="btn btn-sm btn-secondary" 
                @click="currentPage--" 
                :disabled="currentPage === 1"
              >
                <i class="fas fa-chevron-left"></i>
              </button>
              <span class="btn btn-sm btn-primary">{{ currentPage }}</span>
              <button 
                class="btn btn-sm btn-secondary" 
                @click="currentPage++" 
                :disabled="currentPage * itemsPerPage >= recentSales.length"
              >
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Loading Overlay -->
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner">
            <i class="fas fa-spinner spin"></i>
            <p>Loading reports...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import api from '@/api/index.js'

Chart.register(...registerables)

const loading = ref(false)
const dateRange = ref('month')
const startDate = ref('')
const endDate = ref('')
const reportType = ref('sales')
const currentPage = ref(1)
const itemsPerPage = 10

const salesChartRef = ref(null)
const paymentChartRef = ref(null)
const topProductsChartRef = ref(null)
const customerChartRef = ref(null)

let salesChart = null
let paymentChart = null
let topProductsChart = null
let customerChart = null

const stats = reactive({
  total_sales: 0,
  total_orders: 0,
  total_customers: 0,
  low_stock: 0,
  sales_change: 0,
  orders_change: 0,
  customers_change: 0,
  low_stock_change: 0
})

const recentSales = ref([])

const paginatedSales = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return recentSales.value.slice(start, end)
})

const chartData = reactive({
  sales: { labels: [], values: [] },
  payment: { labels: [], values: [] },
  topProducts: { labels: [], values: [] },
  customers: { labels: [], values: [] }
})

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

const getDateRange = () => {
  const now = new Date()
  let start = new Date()
  let end = new Date()
  
  switch(dateRange.value) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      break
    case 'yesterday':
      start.setDate(now.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(now.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      break
    case 'week':
      const day = now.getDay() || 7
      start.setDate(now.getDate() - day + 1)
      start.setHours(0, 0, 0, 0)
      break
    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3) * 3
      start.setMonth(quarter, 1)
      start.setHours(0, 0, 0, 0)
      break
    case 'year':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      break
    case 'custom':
      if (startDate.value) {
        start = new Date(startDate.value)
      }
      if (endDate.value) {
        end = new Date(endDate.value)
        end.setHours(23, 59, 59, 999)
      }
      break
  }
  
  return { start, end }
}

const loadReportData = async () => {
  loading.value = true
  
  try {
    const { start, end } = getDateRange()
    
    const startParam = startDate.value || start.toISOString().split('T')[0]
    const endParam = endDate.value || end.toISOString().split('T')[0]
    
    const response = await api.get('/reports.php', {
      params: {
        start: startParam + ' 00:00:00',
        end: endParam + ' 23:59:59',
        type: reportType.value
      }
    })
    
    const data = response.data
    
    stats.total_sales = data.total_sales || 0
    stats.total_orders = data.total_orders || 0
    stats.total_customers = data.total_customers || 0
    stats.low_stock = data.low_stock || 0
    stats.sales_change = data.sales_change || 0
    stats.orders_change = data.orders_change || 0
    stats.customers_change = data.customers_change || 0
    stats.low_stock_change = data.low_stock_change || 0
    
    recentSales.value = data.recent_sales || []
    
    chartData.sales = data.sales_chart || { labels: [], values: [] }
    chartData.payment = data.payment_chart || { labels: [], values: [] }
    chartData.topProducts = data.top_products || { labels: [], values: [] }
    chartData.customers = data.customer_chart || { labels: [], values: [] }
    
    await nextTick()
    renderCharts()
    
  } catch (error) {
    console.error('Error loading report data:', error)
    alert('Error loading report data. Please try again.')
  } finally {
    loading.value = false
  }
}

const renderCharts = () => {
  // Sales Chart
  if (salesChartRef.value) {
    if (salesChart) salesChart.destroy()
    
    const ctx = salesChartRef.value.getContext('2d')
    const hasData = chartData.sales.labels && chartData.sales.labels.length > 0
    
    salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: hasData ? chartData.sales.labels : ['No Data'],
        datasets: [{
          label: 'Sales',
          data: hasData ? chartData.sales.values : [0],
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => '₱' + value.toFixed(2)
            }
          }
        }
      }
    })
  }
  
  // Payment Methods Chart
  if (paymentChartRef.value) {
    if (paymentChart) paymentChart.destroy()
    
    const ctx = paymentChartRef.value.getContext('2d')
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    const hasData = chartData.payment.labels && chartData.payment.labels.length > 0
    
    paymentChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: hasData ? chartData.payment.labels : ['No Data'],
        datasets: [{
          data: hasData ? chartData.payment.values : [1],
          backgroundColor: hasData ? colors.slice(0, chartData.payment.labels.length) : ['#E5E7EB']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    })
  }
  
  // Top Products Chart
  if (topProductsChartRef.value) {
    if (topProductsChart) topProductsChart.destroy()
    
    const ctx = topProductsChartRef.value.getContext('2d')
    const hasData = chartData.topProducts.labels && chartData.topProducts.labels.length > 0
    
    topProductsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hasData ? chartData.topProducts.labels : ['No Data'],
        datasets: [{
          label: 'Quantity Sold',
          data: hasData ? chartData.topProducts.values : [0],
          backgroundColor: ['#4F46E5', '#7C3AED', '#3B82F6', '#10B981', '#F59E0B']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true
          }
        }
      }
    })
  }
  
  // Customer Growth Chart
  if (customerChartRef.value) {
    if (customerChart) customerChart.destroy()
    
    const ctx = customerChartRef.value.getContext('2d')
    const hasData = chartData.customers.labels && chartData.customers.labels.length > 0
    
    customerChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: hasData ? chartData.customers.labels : ['No Data'],
        datasets: [{
          label: 'New Customers',
          data: hasData ? chartData.customers.values : [0],
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10B981',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    })
  }
}

const exportPDF = () => {
  alert('PDF Export feature coming soon!')
}

const exportExcel = () => {
  alert('Excel Export feature coming soon!')
}

watch([startDate, endDate], () => {
  if (dateRange.value === 'custom') {
    loadReportData()
  }
})

onMounted(() => {
  loadReportData()
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
  display: inline-block;
}

.stats-change.positive {
  color: #10B981;
  background: rgba(16, 185, 129, 0.1);
}

.stats-change.negative {
  color: #EF4444;
  background: rgba(239, 68, 68, 0.1);
}

.chart-container {
  position: relative;
  height: 300px;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
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

.loading-spinner p {
  margin-top: 0.5rem;
  color: var(--text-muted);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

body.dark-mode .stats-card {
  background: var(--bg-card);
}

body.dark-mode .stats-change.positive {
  background: rgba(16, 185, 129, 0.2);
}

body.dark-mode .stats-change.negative {
  background: rgba(239, 68, 68, 0.2);
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