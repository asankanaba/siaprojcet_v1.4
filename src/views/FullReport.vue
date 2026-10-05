<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="d-flex justify-content-between align-center mb-4">
          <div>
            <h4 style="font-weight:700;">📊 Full Report Dashboard</h4>
            <p class="text-muted">Complete business analytics and reporting</p>
          </div>
          <div class="d-flex gap-2">
            <button @click="exportPDF" class="btn btn-primary">
              <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button @click="exportExcel" class="btn btn-success">
              <i class="fas fa-file-excel"></i> Export Excel
            </button>
            <button @click="refreshData" class="btn btn-secondary">
              <i class="fas fa-sync-alt" :class="{ spin: loading }"></i> Refresh
            </button>
          </div>
        </div>

        <!-- Report Controls -->
        <div class="card mb-4">
          <div class="row g-3 align-items-end">
            <div class="col-md-2">
              <label class="form-label">Report Period</label>
              <select v-model="period" class="form-control" @change="loadReport">
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="week">This Week</option>
                <option value="month" selected>This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div class="col-md-2" v-if="period === 'custom'">
              <label class="form-label">From</label>
              <input v-model="dateFrom" type="date" class="form-control" @change="loadReport" />
            </div>
            <div class="col-md-2" v-if="period === 'custom'">
              <label class="form-label">To</label>
              <input v-model="dateTo" type="date" class="form-control" @change="loadReport" />
            </div>
            <div class="col-md-2">
              <label class="form-label">Report Type</label>
              <select v-model="reportType" class="form-control" @change="loadReport">
                <option value="all">All Reports</option>
                <option value="sales">Sales Report</option>
                <option value="products">Products Report</option>
                <option value="customers">Customers Report</option>
                <option value="inventory">Inventory Report</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">Group By</label>
              <select v-model="groupBy" class="form-control" @change="loadReport">
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>
            <div class="col-md-2">
              <label class="form-label">Chart Type</label>
              <select v-model="chartType" class="form-control" @change="renderCharts">
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="area">Area Chart</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="card summary-card">
              <div class="summary-icon" style="background:rgba(79,70,229,0.1);color:#4F46E5;">
                <i class="fas fa-currency-sign"></i>
              </div>
              <div class="summary-info">
                <span class="summary-label">Total Revenue</span>
                <h3 class="summary-value">{{ formatCurrency(summary.total_revenue) }}</h3>
                <span class="summary-change" :class="summary.revenue_change >= 0 ? 'positive' : 'negative'">
                  <i :class="summary.revenue_change >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(summary.revenue_change) }}%
                </span>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card summary-card">
              <div class="summary-icon" style="background:rgba(16,185,129,0.1);color:#10B981;">
                <i class="fas fa-shopping-cart"></i>
              </div>
              <div class="summary-info">
                <span class="summary-label">Total Orders</span>
                <h3 class="summary-value">{{ summary.total_orders }}</h3>
                <span class="summary-change" :class="summary.orders_change >= 0 ? 'positive' : 'negative'">
                  <i :class="summary.orders_change >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(summary.orders_change) }}%
                </span>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card summary-card">
              <div class="summary-icon" style="background:rgba(245,158,11,0.1);color:#F59E0B;">
                <i class="fas fa-users"></i>
              </div>
              <div class="summary-info">
                <span class="summary-label">Customers</span>
                <h3 class="summary-value">{{ summary.total_customers }}</h3>
                <span class="summary-change" :class="summary.customers_change >= 0 ? 'positive' : 'negative'">
                  <i :class="summary.customers_change >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(summary.customers_change) }}%
                </span>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card summary-card">
              <div class="summary-icon" style="background:rgba(239,68,68,0.1);color:#EF4444;">
                <i class="fas fa-boxes"></i>
              </div>
              <div class="summary-info">
                <span class="summary-label">Items Sold</span>
                <h3 class="summary-value">{{ summary.items_sold }}</h3>
                <span class="summary-change" :class="summary.items_change >= 0 ? 'positive' : 'negative'">
                  <i :class="summary.items_change >= 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                  {{ Math.abs(summary.items_change) }}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Charts -->
        <div class="row g-3 mb-4">
          <div class="col-md-8">
            <div class="card">
              <h5 style="font-weight:700;margin-bottom:1rem;">
                <i class="fas fa-chart-line"></i> Revenue & Orders Trend
              </h5>
              <div class="chart-container">
                <canvas ref="mainChartRef"></canvas>
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

        <!-- Secondary Charts -->
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="card">
              <h5 style="font-weight:700;margin-bottom:1rem;">
                <i class="fas fa-trophy"></i> Top Products
              </h5>
              <div class="chart-container">
                <canvas ref="productsChartRef"></canvas>
              </div>
            </div>
          </div>
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

        <!-- Detailed Tables -->
        <div class="row g-3 mb-4">
          <div class="col-md-6">
            <div class="card">
              <h5 style="font-weight:700;margin-bottom:1rem;">
                <i class="fas fa-list"></i> Top Products
              </h5>
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product</th>
                      <th>Units Sold</th>
                      <th>Revenue</th>
                      <th>% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="topProducts.length === 0">
                      <td colspan="5" class="text-center text-muted">No data available</td>
                    </tr>
                    <tr v-for="(product, index) in topProducts" :key="index">
                      <td>{{ index + 1 }}</td>
                      <td>{{ product.name }}</td>
                      <td>{{ product.units }}</td>
                      <td>{{ formatCurrency(product.revenue) }}</td>
                      <td>{{ product.percentage }}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card">
              <h5 style="font-weight:700;margin-bottom:1rem;">
                <i class="fas fa-users"></i> Top Customers
              </h5>
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Customer</th>
                      <th>Orders</th>
                      <th>Total Spent</th>
                      <th>Average Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="topCustomers.length === 0">
                      <td colspan="5" class="text-center text-muted">No data available</td>
                    </tr>
                    <tr v-for="(customer, index) in topCustomers" :key="index">
                      <td>{{ index + 1 }}</td>
                      <td>{{ customer.name || 'Walk-in' }}</td>
                      <td>{{ customer.orders }}</td>
                      <td>{{ formatCurrency(customer.total) }}</td>
                      <td>{{ formatCurrency(customer.total / customer.orders) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Sales Table -->
        <div class="card">
          <h5 style="font-weight:700;margin-bottom:1rem;">
            <i class="fas fa-table"></i> All Transactions
          </h5>
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Cashier</th>
                  <th>Items</th>
                  <th>Subtotal</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="allSales.length === 0">
                  <td colspan="10" class="text-center text-muted" style="padding:2rem 0;">
                    <i class="fas fa-receipt" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                    No transactions found
                  </td>
                </tr>
                <tr v-for="sale in paginatedSales" :key="sale.id">
                  <td><strong>{{ sale.invoice_number }}</strong></td>
                  <td>{{ sale.customer_name || 'Walk-in' }}</td>
                  <td>{{ sale.cashier_name || 'Unknown' }}</td>
                  <td>{{ sale.item_count || 0 }}</td>
                  <td>{{ formatCurrency(sale.subtotal) }}</td>
                  <td>{{ formatCurrency(sale.tax) }}</td>
                  <td><strong>{{ formatCurrency(sale.total) }}</strong></td>
                  <td><span class="badge badge-info">{{ sale.payment_method }}</span></td>
                  <td>
                    <span class="badge" :class="sale.status === 'completed' ? 'badge-success' : 'badge-danger'">
                      {{ sale.status || 'Completed' }}
                    </span>
                  </td>
                  <td>{{ formatDate(sale.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="text-muted small">
              Showing {{ (currentPage - 1) * pageSize + 1 }} - 
              {{ Math.min(currentPage * pageSize, allSales.length) }} 
              of {{ allSales.length }} entries
            </span>
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-secondary" @click="prevPage" :disabled="currentPage === 1">
                <i class="fas fa-chevron-left"></i>
              </button>
              <span class="btn btn-sm btn-primary">{{ currentPage }}</span>
              <button class="btn btn-sm btn-secondary" @click="nextPage" :disabled="currentPage * pageSize >= allSales.length">
                <i class="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner">
            <i class="fas fa-spinner spin"></i>
            <p>Loading report data...</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import Sidebar from '../components/common/Sidebar.vue'
import Navbar from '../components/common/Navbar.vue'
import api from '../api/index.js'

Chart.register(...registerables)

const loading = ref(false)
const period = ref('month')
const dateFrom = ref('')
const dateTo = ref('')
const reportType = ref('all')
const groupBy = ref('day')
const chartType = ref('line')
const currentPage = ref(1)
const pageSize = 10

// Chart refs
const mainChartRef = ref(null)
const paymentChartRef = ref(null)
const productsChartRef = ref(null)
const customerChartRef = ref(null)

let mainChart = null
let paymentChart = null
let productsChart = null
let customerChart = null

// Data
const summary = reactive({
  total_revenue: 0,
  total_orders: 0,
  total_customers: 0,
  items_sold: 0,
  revenue_change: 0,
  orders_change: 0,
  customers_change: 0,
  items_change: 0
})

const topProducts = ref([])
const topCustomers = ref([])
const allSales = ref([])

const chartData = reactive({
  revenue: { labels: [], values: [] },
  orders: { labels: [], values: [] },
  payment: { labels: [], values: [] },
  products: { labels: [], values: [] },
  customers: { labels: [], values: [] }
})

const paginatedSales = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return allSales.value.slice(start, end)
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
  
  switch(period.value) {
    case 'today':
      start.setHours(0,0,0,0)
      end.setHours(23,59,59,999)
      break
    case 'yesterday':
      start.setDate(now.getDate() - 1)
      start.setHours(0,0,0,0)
      end.setDate(now.getDate() - 1)
      end.setHours(23,59,59,999)
      break
    case 'week':
      const day = now.getDay() || 7
      start.setDate(now.getDate() - day + 1)
      start.setHours(0,0,0,0)
      break
    case 'month':
      start.setDate(1)
      start.setHours(0,0,0,0)
      break
    case 'quarter':
      const q = Math.floor(now.getMonth() / 3) * 3
      start.setMonth(q, 1)
      start.setHours(0,0,0,0)
      break
    case 'year':
      start.setMonth(0, 1)
      start.setHours(0,0,0,0)
      break
    case 'custom':
      if (dateFrom.value) start = new Date(dateFrom.value)
      if (dateTo.value) {
        end = new Date(dateTo.value)
        end.setHours(23,59,59,999)
      }
      break
  }
  return { start, end }
}

const loadReport = async () => {
  loading.value = true
  try {
    const { start, end } = getDateRange()
    const startParam = start.toISOString().split('T')[0]
    const endParam = end.toISOString().split('T')[0]
    
    const response = await api.get('/reports.php', {
      params: {
        start: startParam + ' 00:00:00',
        end: endParam + ' 23:59:59',
        type: reportType.value,
        group_by: groupBy.value
      }
    })
    
    const data = response.data
    
    summary.total_revenue = data.total_revenue || 0
    summary.total_orders = data.total_orders || 0
    summary.total_customers = data.active_customers || 0
    summary.items_sold = data.items_sold || 0
    summary.revenue_change = data.revenue_change || 0
    summary.orders_change = data.orders_change || 0
    summary.customers_change = data.customers_change || 0
    summary.items_change = data.items_change || 0
    
    topProducts.value = data.top_products || []
    topCustomers.value = data.top_customers || []
    allSales.value = data.recent_sales || []
    
    // Calculate percentages for top products
    const totalRevenue = topProducts.value.reduce((sum, p) => sum + p.revenue, 0)
    topProducts.value.forEach(p => {
      p.percentage = totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : 0
    })
    
    chartData.revenue = data.revenue_chart || { labels: [], values: [] }
    chartData.orders = data.orders_chart || { labels: [], values: [] }
    chartData.payment = data.payment_chart || { labels: [], values: [] }
    chartData.products = data.top_products_chart || { labels: [], values: [] }
    chartData.customers = data.customer_chart || { labels: [], values: [] }
    
    await nextTick()
    renderCharts()
    
  } catch (error) {
    console.error('Error loading report:', error)
    alert('Error loading report data. Please try again.')
  } finally {
    loading.value = false
  }
}

const renderCharts = () => {
  const chartTypeMap = {
    line: 'line',
    bar: 'bar',
    area: 'line'
  }
  
  const type = chartTypeMap[chartType.value] || 'line'
  
  // Main Chart - Revenue & Orders
  if (mainChartRef.value) {
    if (mainChart) mainChart.destroy()
    const hasData = chartData.revenue.labels && chartData.revenue.labels.length > 0
    const labels = hasData ? chartData.revenue.labels : ['No Data']
    const revenueData = hasData ? chartData.revenue.values : [0]
    const ordersData = hasData ? chartData.orders.values : [0]
    
    mainChart = new Chart(mainChartRef.value.getContext('2d'), {
      type: type,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Revenue',
            data: revenueData,
            borderColor: '#4F46E5',
            backgroundColor: chartType.value === 'area' ? 'rgba(79,70,229,0.2)' : 'rgba(79,70,229,0.1)',
            tension: 0.4,
            fill: chartType.value === 'area',
            yAxisID: 'y'
          },
          {
            label: 'Orders',
            data: ordersData,
            borderColor: '#10B981',
            backgroundColor: chartType.value === 'area' ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.1)',
            tension: 0.4,
            fill: chartType.value === 'area',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, position: 'left', ticks: { callback: (v) => '₱' + v } },
          y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } }
        }
      }
    })
  }
  
  // Payment Chart
  if (paymentChartRef.value) {
    if (paymentChart) paymentChart.destroy()
    const hasData = chartData.payment.labels && chartData.payment.labels.length > 0
    const colors = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    paymentChart = new Chart(paymentChartRef.value.getContext('2d'), {
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
        plugins: { legend: { position: 'bottom' } }
      }
    })
  }
  
  // Products Chart
  if (productsChartRef.value) {
    if (productsChart) productsChart.destroy()
    const hasData = chartData.products.labels && chartData.products.labels.length > 0
    productsChart = new Chart(productsChartRef.value.getContext('2d'), {
      type: 'bar',
      data: {
        labels: hasData ? chartData.products.labels : ['No Data'],
        datasets: [{
          label: 'Units Sold',
          data: hasData ? chartData.products.values : [0],
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
  
  // Customer Chart
  if (customerChartRef.value) {
    if (customerChart) customerChart.destroy()
    const hasData = chartData.customers.labels && chartData.customers.labels.length > 0
    customerChart = new Chart(customerChartRef.value.getContext('2d'), {
      type: 'bar',
      data: {
        labels: hasData ? chartData.customers.labels : ['No Data'],
        datasets: [{
          label: 'New Customers',
          data: hasData ? chartData.customers.values : [0],
          backgroundColor: 'rgba(16,185,129,0.6)',
          borderColor: '#10B981',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    })
  }
}

const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }
const nextPage = () => { if (currentPage.value * pageSize < allSales.value.length) currentPage.value++ }

const exportPDF = () => { alert('PDF Export feature coming soon!') }
const exportExcel = () => { alert('Excel Export feature coming soon!') }
const refreshData = () => { loadReport() }

onMounted(() => { loadReport() })
</script>

<style scoped>
.summary-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
}

.summary-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.summary-info {
  flex: 1;
}

.summary-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: block;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0.25rem 0;
}

.summary-change {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  display: inline-block;
}

.summary-change.positive {
  color: #10B981;
  background: rgba(16,185,129,0.1);
}

.summary-change.negative {
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
  to { rotate: 360deg; }
}

.badge-success {
  background: #D1FAE5;
  color: #065F46;
}

.badge-danger {
  background: #FEE2E2;
  color: #991B1B;
}

.badge-info {
  background: #DBEAFE;
  color: #1E40AF;
}

body.dark-mode .badge-success {
  background: rgba(16,185,129,0.2);
  color: #34D399;
}

body.dark-mode .badge-danger {
  background: rgba(239,68,68,0.2);
  color: #F87171;
}

body.dark-mode .badge-info {
  background: rgba(59,130,246,0.2);
  color: #60A5FA;
}

body.dark-mode .summary-card {
  background: var(--bg-card);
}

body.dark-mode .summary-change.positive {
  background: rgba(16,185,129,0.2);
}

body.dark-mode .summary-change.negative {
  background: rgba(239,68,68,0.2);
}

@media (max-width: 768px) {
  .summary-card {
    flex-direction: column;
    text-align: center;
  }
  
  .chart-container {
    height: 200px;
  }
}
</style>