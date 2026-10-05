<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="wallet-container">
          <!-- Header -->
          <div class="wallet-header">
            <div>
              <h2><i class="fas fa-wallet"></i> Payroll Management</h2>
              <p>Manage employee payroll, payslips, and salary disbursements</p>
            </div>
            <div class="header-actions">
              <button @click="refreshData" class="btn-refresh">
                <i class="fas fa-sync" :class="{ spinning: isRefreshing }"></i> Refresh
              </button>
            </div>
          </div>

          <!-- Employee Selector -->
          <div class="user-selector">
            <div class="form-group">
              <label>Select Employee</label>
              <select v-model="selectedUserId" @change="loadPayroll" class="form-control">
                <option value="">-- Select Employee --</option>
                <option v-for="user in users" :key="user.id" :value="user.id">
                  {{ user.full_name || user.username }} ({{ user.role || 'Staff' }})
                </option>
              </select>
            </div>
          </div>

          <!-- Payroll Summary -->
          <div class="wallet-balance" v-if="selectedUserId">
            <div class="balance-card">
              <div class="balance-icon">
                <i class="fas fa-file-invoice-dollar"></i>
              </div>
              <div class="balance-info">
                <h3>Total Salary Earned</h3>
                <p class="balance-amount">{{ formatCurrency(totalSalary) }}</p>
                <span class="balance-label">{{ selectedUser?.full_name || 'Employee' }}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="wallet-actions" v-if="selectedUserId">
            <button class="action-btn payslip" @click="generatePayslip">
              <i class="fas fa-file-invoice"></i> Generate Payslip
            </button>
            <button class="action-btn salary" @click="viewSalaryHistory">
              <i class="fas fa-history"></i> Salary History
            </button>
            <button class="action-btn payroll" @click="processPayroll">
              <i class="fas fa-calculator"></i> Process Payroll
            </button>
          </div>

          <!-- Payslip Summary -->
          <div class="payslip-summary" v-if="selectedUserId">
            <h3>Latest Payslip</h3>
            <div class="payslip-card" v-if="latestPayslip">
              <div class="payslip-header">
                <div>
                  <h4>{{ selectedUser?.full_name || 'Employee' }}</h4>
                  <p>{{ selectedUser?.department || 'General' }} Department</p>
                </div>
                <span class="payslip-date">{{ formatDate(latestPayslip.created_at) }}</span>
              </div>
              <div class="payslip-details">
                <div class="payslip-item">
                  <span>Basic Salary</span>
                  <span>{{ formatCurrency(latestPayslip.basic_salary) }}</span>
                </div>
                <div class="payslip-item">
                  <span>Allowances</span>
                  <span>{{ formatCurrency(latestPayslip.allowances) }}</span>
                </div>
                <div class="payslip-item">
                  <span>Deductions</span>
                  <span>{{ formatCurrency(latestPayslip.deductions) }}</span>
                </div>
                <div class="payslip-item total">
                  <span>Net Pay</span>
                  <span>{{ formatCurrency(latestPayslip.net_pay) }}</span>
                </div>
              </div>
              <div class="payslip-status">
                <span :class="getStatusClass(latestPayslip.status)">
                  {{ (latestPayslip.status || 'PENDING').toUpperCase() }}
                </span>
                <button class="btn-print" @click="printPayslip(latestPayslip)">
                  <i class="fas fa-print"></i> Print
                </button>
              </div>
            </div>
            <div v-else class="empty-state">
              <i class="fas fa-file-invoice"></i>
              <p>No payslip generated yet</p>
              <button class="btn-generate" @click="generatePayslip">Generate First Payslip</button>
            </div>
          </div>

          <!-- Recent Payslips -->
          <div class="transactions-section" v-if="selectedUserId">
            <h3>Recent Payslips</h3>
            <div class="transactions-table-wrapper">
              <table class="transactions-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>EMPLOYEE</th>
                    <th>BASIC</th>
                    <th>ALLOWANCES</th>
                    <th>DEDUCTIONS</th>
                    <th>NET PAY</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="payslips.length === 0">
                    <td colspan="8" class="text-center">No payslips found</td>
                  </tr>
                  <tr v-for="payslip in payslips" :key="payslip.id">
                    <td>{{ formatDate(payslip.created_at) }}</td>
                    <td>{{ selectedUser?.full_name || 'N/A' }}</td>
                    <td>{{ formatCurrency(payslip.basic_salary) }}</td>
                    <td>{{ formatCurrency(payslip.allowances) }}</td>
                    <td>{{ formatCurrency(payslip.deductions) }}</td>
                    <td><strong>{{ formatCurrency(payslip.net_pay) }}</strong></td>
                    <td>
                      <span :class="getStatusClass(payslip.status)">
                        {{ (payslip.status || 'PENDING').toUpperCase() }}
                      </span>
                    </td>
                    <td>
                      <button @click="viewPayslip(payslip)" class="btn-view" title="View Payslip">
                        <i class="fas fa-eye"></i>
                      </button>
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
const users = ref([]);
const selectedUserId = ref('');
const totalSalary = ref(0);
const payslips = ref([]);
const latestPayslip = ref(null);
const isRefreshing = ref(false);
const selectedUser = ref(null);
const loading = ref(false);

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
  if (status === 'paid' || status === 'approved') return 'status-completed';
  if (status === 'pending') return 'status-pending';
  if (status === 'rejected') return 'status-failed';
  return 'status-pending';
};

// ============================================
// LOAD USERS
// ============================================
const loadUsers = async () => {
  try {
    console.log('📊 Loading users...');
    const response = await api.get('/users.php');
    console.log('📊 Users response:', response.data);
    
    if (Array.isArray(response.data)) {
      users.value = response.data.filter(u => u.status !== 'archived');
      console.log('✅ Users loaded:', users.value.length);
    } else {
      users.value = [];
    }
  } catch (error) {
    console.error('❌ Error loading users:', error);
    users.value = [];
  }
};

// ============================================
// LOAD PAYROLL
// ============================================
const loadPayroll = async () => {
  if (!selectedUserId.value) {
    totalSalary.value = 0;
    payslips.value = [];
    latestPayslip.value = null;
    return;
  }

  loading.value = true;
  
  try {
    const userResponse = await api.get(`/users.php?id=${selectedUserId.value}`);
    selectedUser.value = userResponse.data;

    const response = await api.get(`/payroll.php?user_id=${selectedUserId.value}`);
    
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      payslips.value = response.data.data;
      
      totalSalary.value = payslips.value.reduce((sum, p) => {
        const netPay = parseFloat(p.net_pay) || 0;
        return sum + netPay;
      }, 0);
      
      if (payslips.value.length > 0) {
        latestPayslip.value = payslips.value[0];
      } else {
        latestPayslip.value = null;
      }
    } else {
      payslips.value = [];
      latestPayslip.value = null;
      totalSalary.value = 0;
    }
  } catch (error) {
    console.error('Error loading payroll:', error);
    payslips.value = [];
    latestPayslip.value = null;
    totalSalary.value = 0;
  } finally {
    loading.value = false;
  }
};

// ============================================
// PAYROLL ACTIONS
// ============================================
const generatePayslip = async () => {
  if (!selectedUserId.value) {
    await Swal.fire({
      icon: 'warning',
      title: 'No Employee Selected',
      text: 'Please select an employee first.',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }

  const result = await Swal.fire({
    title: 'Generate Payslip',
    html: `
      <div style="text-align: left;">
        <div class="form-group">
          <label>Basic Salary</label>
          <input id="basic-salary" class="swal2-input" type="number" value="15000" />
        </div>
        <div class="form-group">
          <label>Allowances</label>
          <input id="allowances" class="swal2-input" type="number" value="2000" />
        </div>
        <div class="form-group">
          <label>Deductions</label>
          <input id="deductions" class="swal2-input" type="number" value="1500" />
        </div>
      </div>
    `,
    confirmButtonColor: '#4F46E5',
    confirmButtonText: 'Generate Payslip',
    showCancelButton: true,
    cancelButtonColor: '#6B7280',
    cancelButtonText: 'Cancel',
    preConfirm: () => {
      const basic_salary = document.getElementById('basic-salary').value;
      const allowances = document.getElementById('allowances').value;
      const deductions = document.getElementById('deductions').value;
      
      return {
        user_id: selectedUserId.value,
        basic_salary: parseFloat(basic_salary) || 0,
        allowances: parseFloat(allowances) || 0,
        deductions: parseFloat(deductions) || 0
      };
    }
  });

  if (result.isConfirmed && result.value) {
    try {
      const data = {
        user_id: result.value.user_id,
        period_start: new Date().toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        basic_salary: result.value.basic_salary,
        allowances: result.value.allowances,
        deductions: result.value.deductions,
        net_pay: result.value.basic_salary + result.value.allowances - result.value.deductions,
        status: 'pending'
      };

      const response = await api.post('/payroll.php', data);
      
      if (response.data.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Payslip Generated',
          text: 'Payslip has been generated successfully!',
          confirmButtonColor: '#4F46E5',
          timer: 1500,
          showConfirmButton: false
        });
        await loadPayroll();
      }
    } catch (error) {
      console.error('Error generating payslip:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to generate payslip. Please try again.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

const viewSalaryHistory = () => {
  Swal.fire({
    title: 'Salary History',
    html: `
      <div style="text-align: left;">
        <p><strong>Employee:</strong> ${selectedUser.value?.full_name || 'N/A'}</p>
        <p><strong>Total Salary Earned:</strong> ${formatCurrency(totalSalary.value)}</p>
        <p><strong>Number of Payslips:</strong> ${payslips.value.length}</p>
        <hr />
        <p style="font-size: 0.9rem; color: #6b7280;">Click the payslip tab to view details.</p>
      </div>
    `,
    confirmButtonColor: '#4F46E5',
    confirmButtonText: 'OK'
  });
};

const processPayroll = async () => {
  if (payslips.value.length === 0) {
    await Swal.fire({
      icon: 'warning',
      title: 'No Payslips',
      text: 'Generate a payslip first before processing payroll.',
      confirmButtonColor: '#4F46E5'
    });
    return;
  }

  const result = await Swal.fire({
    title: 'Process Payroll',
    text: 'Are you sure you want to process this payroll?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#10B981',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Process',
    cancelButtonText: 'Cancel'
  });

  if (result.isConfirmed) {
    try {
      const pendingPayslips = payslips.value.filter(p => p.status === 'pending');
      
      for (const payslip of pendingPayslips) {
        await api.put(`/payroll.php?id=${payslip.id}`, { status: 'paid' });
      }
      
      await Swal.fire({
        icon: 'success',
        title: 'Payroll Processed',
        text: `${pendingPayslips.length} payslips have been processed!`,
        confirmButtonColor: '#4F46E5',
        timer: 2000,
        showConfirmButton: false
      });
      
      await loadPayroll();
    } catch (error) {
      console.error('Error processing payroll:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to process payroll. Please try again.',
        confirmButtonColor: '#4F46E5'
      });
    }
  }
};

const viewPayslip = (payslip) => {
  Swal.fire({
    title: 'Payslip Details',
    html: `
      <div style="text-align: left; padding: 10px;">
        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0;">
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #d1d5db;">
            <span style="color: #6B7280;">Employee</span>
            <span style="font-weight: 600;">${selectedUser.value?.full_name || 'N/A'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #d1d5db;">
            <span style="color: #6B7280;">Basic Salary</span>
            <span style="font-weight: 600;">${formatCurrency(payslip.basic_salary)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #d1d5db;">
            <span style="color: #6B7280;">Allowances</span>
            <span style="font-weight: 600;">${formatCurrency(payslip.allowances)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #d1d5db;">
            <span style="color: #6B7280;">Deductions</span>
            <span style="font-weight: 600;">${formatCurrency(payslip.deductions)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-top: 2px solid #4F46E5; margin-top: 4px;">
            <span style="font-weight: 700; color: #4F46E5;">Net Pay</span>
            <span style="font-weight: 700; color: #4F46E5; font-size: 1.1rem;">${formatCurrency(payslip.net_pay)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 4px 0; margin-top: 4px;">
            <span style="color: #6B7280;">Status</span>
            <span style="font-weight: 600; text-transform: uppercase;">${payslip.status || 'PENDING'}</span>
          </div>
        </div>
      </div>
    `,
    confirmButtonColor: '#4F46E5',
    confirmButtonText: 'Close',
    width: '500px'
  });
};

const printPayslip = (payslip) => {
  const printContent = `
    <div style="font-family: 'Courier New', monospace; padding: 20px; max-width: 400px; margin: 0 auto; border: 1px solid #ddd;">
      <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 10px;">
        <h2 style="margin: 0; color: #4F46E5;">Smart POS</h2>
        <p style="margin: 5px 0;">Payslip</p>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">${formatDate(payslip.created_at)}</p>
      </div>
      <div style="margin-bottom: 10px;">
        <p style="margin: 3px 0;"><strong>Employee:</strong> ${selectedUser.value?.full_name || 'N/A'}</p>
        <p style="margin: 3px 0;"><strong>Department:</strong> ${selectedUser.value?.department || 'General'}</p>
      </div>
      <div style="border-top: 1px dashed #999; border-bottom: 1px dashed #999; padding: 10px 0; margin: 10px 0;">
        <div style="display: flex; justify-content: space-between; padding: 3px 0;">
          <span>Basic Salary</span>
          <span>${formatCurrency(payslip.basic_salary)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 3px 0;">
          <span>Allowances</span>
          <span>${formatCurrency(payslip.allowances)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 3px 0;">
          <span>Deductions</span>
          <span>${formatCurrency(payslip.deductions)}</span>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 1.1rem; font-weight: 700; border-bottom: 2px solid #333;">
        <span>Net Pay</span>
        <span>${formatCurrency(payslip.net_pay)}</span>
      </div>
      <div style="text-align: center; margin-top: 15px; font-size: 11px; color: #666;">
        <p>Thank you for your hard work!</p>
        <p>${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Payslip</title>
          <style>
            body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
};

const refreshData = async () => {
  isRefreshing.value = true;
  await loadUsers();
  if (selectedUserId.value) {
    await loadPayroll();
  }
  setTimeout(() => {
    isRefreshing.value = false;
  }, 500);
};

// ============================================
// LIFECYCLE
// ============================================
onMounted(() => {
  loadUsers();
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

.wallet-container {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.wallet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.wallet-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .wallet-header h2 {
  color: #e2e8f0;
}

.wallet-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .wallet-header p {
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

.user-selector {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

body.dark-mode .user-selector {
  background: #1e293b;
}

.form-group {
  margin-bottom: 0.5rem;
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

.form-control {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
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

.form-control option {
  background: white;
  color: #1f2937;
}

body.dark-mode .form-control option {
  background: #1e293b;
  color: #e2e8f0;
}

.wallet-balance {
  margin-bottom: 1.5rem;
}

.balance-card {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  border-radius: 16px;
  padding: 2rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.3);
}

.balance-icon {
  width: 70px;
  height: 70px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: white;
}

.balance-info h3 {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 0.25rem 0;
}

.balance-amount {
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  margin: 0;
}

.balance-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.wallet-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.action-btn {
  flex: 1;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 120px;
}

.action-btn.payslip {
  background: #d1fae5;
  color: #065f46;
}

.action-btn.payslip:hover {
  background: #a7f3d0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.action-btn.salary {
  background: #e0e7ff;
  color: #3730a3;
}

.action-btn.salary:hover {
  background: #c7d2fe;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.action-btn.payroll {
  background: #fef3c7;
  color: #92400e;
}

.action-btn.payroll:hover {
  background: #fde68a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

body.dark-mode .action-btn.payslip {
  background: #064e3b;
  color: #6ee7b7;
}

body.dark-mode .action-btn.salary {
  background: #312e81;
  color: #818cf8;
}

body.dark-mode .action-btn.payroll {
  background: #78350f;
  color: #fcd34d;
}

.payslip-summary {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

body.dark-mode .payslip-summary {
  background: #1e293b;
}

.payslip-summary h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 1rem 0;
}

body.dark-mode .payslip-summary h3 {
  color: #e2e8f0;
}

.payslip-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
}

body.dark-mode .payslip-card {
  border-color: #2d3748;
}

.payslip-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

body.dark-mode .payslip-header {
  border-bottom-color: #2d3748;
}

.payslip-header h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .payslip-header h4 {
  color: #e2e8f0;
}

.payslip-header p {
  font-size: 0.85rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .payslip-header p {
  color: #9ca3af;
}

.payslip-date {
  font-size: 0.8rem;
  color: #6b7280;
}

body.dark-mode .payslip-date {
  color: #9ca3af;
}

.payslip-details {
  margin-bottom: 0.75rem;
}

.payslip-item {
  display: flex;
  justify-content: space-between;
  padding: 0.3rem 0;
  font-size: 0.9rem;
  color: #1f2937;
  border-bottom: 1px dashed #f3f4f6;
}

body.dark-mode .payslip-item {
  color: #e2e8f0;
  border-bottom-color: #2d3748;
}

.payslip-item.total {
  font-weight: 700;
  font-size: 1rem;
  border-bottom: none;
  padding-top: 0.5rem;
  margin-top: 0.25rem;
  border-top: 2px solid #4F46E5;
  color: #4F46E5;
}

body.dark-mode .payslip-item.total {
  border-top-color: #818cf8;
  color: #818cf8;
}

.payslip-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

body.dark-mode .payslip-status {
  border-top-color: #2d3748;
}

.btn-print {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.3rem 0.8rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  transition: background 0.2s;
}

.btn-print:hover {
  background: #4338CA;
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

.transactions-section h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0 0 1rem 0;
}

body.dark-mode .transactions-section h3 {
  color: #e2e8f0;
}

.transactions-table-wrapper {
  overflow-x: auto;
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

.btn-view {
  background: none;
  border: none;
  color: #4F46E5;
  cursor: pointer;
  padding: 0.25rem;
  font-size: 1rem;
}

.btn-view:hover {
  color: #4338CA;
}

.empty-state {
  text-align: center;
  padding: 1.5rem 0;
  color: #6b7280;
}

.empty-state i {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.5rem;
  color: #d1d5db;
}

body.dark-mode .empty-state i {
  color: #374151;
}

.empty-state p {
  margin: 0 0 1rem 0;
}

.btn-generate {
  background: #4F46E5;
  color: white;
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-generate:hover {
  background: #4338CA;
}

@media (max-width: 768px) {
  .wallet-container {
    padding: 1rem;
  }

  .wallet-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .wallet-actions {
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }

  .balance-card {
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
  }

  .balance-amount {
    font-size: 2rem;
  }

  .payslip-header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .transactions-table-wrapper {
    overflow-x: auto;
  }

  .transactions-table {
    font-size: 0.8rem;
    min-width: 600px;
  }
}
</style>