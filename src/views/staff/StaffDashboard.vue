<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="staff-dashboard">
          <!-- Welcome Section -->
          <div class="welcome-section">
            <div class="welcome-text">
              <h1>Welcome back, {{ user?.name || 'Staff' }}! 👋</h1>
              <p>Start a new sale or manage your daily tasks</p>
            </div>
            <div class="welcome-date">
              <span>{{ currentDate }}</span>
            </div>
          </div>

          <!-- Quick Actions - Only POS Related -->
          <div class="quick-actions">
            <h3>Quick Actions</h3>
            <div class="actions-grid">
              <div class="action-card" @click="goToPOS">
                <i class="fas fa-shopping-cart"></i>
                <span>New Sale</span>
              </div>
              <div class="action-card" @click="goToProducts">
                <i class="fas fa-box"></i>
                <span>View Products</span>
              </div>
            </div>
          </div>

          <!-- POS Quick Access -->
          <div class="pos-quick-access">
            <div class="pos-card" @click="goToPOS">
              <div class="pos-card-icon">
                <i class="fas fa-shopping-cart"></i>
              </div>
              <div class="pos-card-content">
                <h3>Point of Sale</h3>
                <p>Start a new transaction</p>
                <button class="btn-pos">Open POS →</button>
              </div>
            </div>
          </div>

          <!-- Recent Orders -->
          <div class="recent-section">
            <div class="section-header">
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
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
import api from '@/api/index.js';

const router = useRouter();
const authStore = useAuthStore();

// User
const user = computed(() => authStore.user);

// Current Date
const currentDate = ref('');

// Recent Orders
const recentOrders = ref([]);

// ============================================
// METHODS
// ============================================
const formatPrice = (price) => {
  if (!price) return '0.00';
  return Number(price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const loadRecentOrders = async () => {
  try {
    const response = await api.get('/api/sales.php?limit=5');
    if (response.data && Array.isArray(response.data)) {
      recentOrders.value = response.data;
    } else {
      // Sample data
      recentOrders.value = [
        { id: 1, invoice_number: 'INV-001', customer_name: 'John Doe', total: 1250.00, status: 'completed' },
        { id: 2, invoice_number: 'INV-002', customer_name: 'Jane Smith', total: 850.00, status: 'pending' },
        { id: 3, invoice_number: 'INV-003', customer_name: 'Mike Johnson', total: 2100.00, status: 'completed' }
      ];
    }
  } catch (error) {
    console.error('Error loading recent orders:', error);
    recentOrders.value = [
      { id: 1, invoice_number: 'INV-001', customer_name: 'John Doe', total: 1250.00, status: 'completed' },
      { id: 2, invoice_number: 'INV-002', customer_name: 'Jane Smith', total: 850.00, status: 'pending' },
      { id: 3, invoice_number: 'INV-003', customer_name: 'Mike Johnson', total: 2100.00, status: 'completed' }
    ];
  }
};

const viewAllOrders = () => {
  router.push('/sales');
};

const goToPOS = () => {
  router.push('/pos');
};

const goToProducts = () => {
  router.push('/products');
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  // Set current date
  const now = new Date();
  currentDate.value = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  loadRecentOrders();
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

.staff-dashboard {
  padding: 2rem;
  max-width: 1200px;
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
   QUICK ACTIONS
   ============================================ */
.quick-actions {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

body.dark-mode .quick-actions {
  background: #1e293b;
}

.quick-actions h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 1rem 0;
}

body.dark-mode .quick-actions h3 {
  color: #e2e8f0;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

body.dark-mode .action-card {
  background: #2d3748;
}

.action-card:hover {
  border-color: #4F46E5;
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.action-card i {
  font-size: 1.8rem;
  color: #4F46E5;
  margin-bottom: 0.5rem;
}

.action-card span {
  font-size: 0.9rem;
  font-weight: 500;
  color: #1a1a2e;
}

body.dark-mode .action-card span {
  color: #e2e8f0;
}

/* ============================================
   POS QUICK ACCESS
   ============================================ */
.pos-quick-access {
  margin-bottom: 2rem;
}

.pos-card {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 2rem;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(79,70,229,0.3);
}

.pos-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(79,70,229,0.4);
}

.pos-card-icon {
  width: 80px;
  height: 80px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: white;
}

.pos-card-content {
  flex: 1;
}

.pos-card-content h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  margin: 0 0 0.25rem 0;
}

.pos-card-content p {
  color: rgba(255,255,255,0.7);
  margin: 0 0 1rem 0;
}

.btn-pos {
  background: white;
  color: #4F46E5;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-pos:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* ============================================
   RECENT ORDERS
   ============================================ */
.recent-section {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .recent-section {
  background: #1e293b;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  font-size: 1rem;
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
  font-size: 0.85rem;
  font-weight: 500;
  transition: color 0.2s;
}

.btn-view-all:hover {
  color: #4338CA;
}

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
@media (max-width: 768px) {
  .staff-dashboard {
    padding: 1rem;
  }
  
  .welcome-section {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .pos-card {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
  }
  
  .actions-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .order-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
}

@media (max-width: 480px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>