<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <h4 style="font-weight:700;margin-bottom:1.5rem;">Sales History</h4>
        
        <div class="card">
          <div class="d-flex gap-3 mb-3 flex-wrap">
            <div style="flex:1;min-width:200px;">
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-search"></i></span>
                <input
                  v-model="search"
                  type="text"
                  class="form-control"
                  placeholder="Search by invoice or customer..."
                  @input="loadSales"
                />
              </div>
            </div>
            <div style="min-width:150px;">
              <input v-model="dateFrom" type="date" class="form-control" @change="loadSales" />
            </div>
            <div style="min-width:150px;">
              <input v-model="dateTo" type="date" class="form-control" @change="loadSales" />
            </div>
          </div>
          
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Cashier</th>
                  <th>Customer</th>
                  <th>Subtotal</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="sales.length === 0">
                  <td colspan="8" class="text-center text-muted" style="padding:2rem 0;">No sales found</td>
                </tr>
                <tr v-for="sale in sales" :key="sale.id">
                  <td><strong>{{ sale.invoice_number }}</strong></td>
                  <td>{{ sale.cashier_name || 'Unknown' }}</td>
                  <td>{{ sale.customer_name || 'Walk-in' }}</td>
                  <td>₱{{ Number(sale.subtotal).toFixed(2) }}</td>
                  <td>₱{{ Number(sale.tax).toFixed(2) }}</td>
                  <td><strong>₱{{ Number(sale.total).toFixed(2) }}</strong></td>
                  <td><span class="badge badge-info">{{ sale.payment_method }}</span></td>
                  <td>{{ new Date(sale.created_at).toLocaleString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Sidebar from '../components/common/Sidebar.vue'
import Navbar from '../components/common/Navbar.vue'
import api from '../api/index.js'

const sales = ref([])
const search = ref('')
const dateFrom = ref('')
const dateTo = ref('')

const loadSales = async () => {
  try {
    // ✅ FIXED: Removed /api/ prefix
    const response = await api.get('/sales.php')
    let data = response.data || []
    
    if (search.value) {
      const s = search.value.toLowerCase()
      data = data.filter(item => 
        item.invoice_number.toLowerCase().includes(s) ||
        (item.customer_name && item.customer_name.toLowerCase().includes(s))
      )
    }
    
    if (dateFrom.value) {
      data = data.filter(item => new Date(item.created_at) >= new Date(dateFrom.value))
    }
    
    if (dateTo.value) {
      data = data.filter(item => new Date(item.created_at) <= new Date(dateTo.value + ' 23:59:59'))
    }
    
    sales.value = data
  } catch (error) {
    console.error('Error loading sales:', error)
  }
}

onMounted(() => {
  loadSales()
})
</script>