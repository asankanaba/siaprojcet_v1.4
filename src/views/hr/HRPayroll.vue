<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="payroll-container">

          <!-- ============================== -->
          <!-- HEADER -->
          <!-- ============================== -->
          <header class="page-header">
            <div>
              <h2><i class="fas fa-wallet"></i> Payroll Management</h2>
              <p>Process, approve, and track employee salaries</p>
            </div>
            <div class="header-actions">
              <button @click="refreshAll" class="btn-refresh" :disabled="loading">
                <i class="fas fa-sync" :class="{ spinning: loading }"></i> Refresh
              </button>
              <button @click="exportCsv" class="btn-export">
                <i class="fas fa-download"></i> Export CSV
              </button>
            </div>
          </header>

          <!-- ============================== -->
          <!-- STATS -->
          <!-- ============================== -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #4F46E5;">
                <i class="fas fa-users"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Total Employees</p>
                <p class="stat-value">{{ employees.length }}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706;">
                <i class="fas fa-clock"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Pending</p>
                <p class="stat-value">{{ pendingCount }}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #2563eb;">
                <i class="fas fa-check"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Approved</p>
                <p class="stat-value">{{ approvedCount }}</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #059669;">
                <i class="fas fa-money-check-alt"></i>
              </div>
              <div class="stat-info">
                <p class="stat-label">Total Net Pay</p>
                <p class="stat-value">₱{{ formatPrice(totalNetPay) }}</p>
              </div>
            </div>
          </div>

          <!-- ============================== -->
          <!-- TABS -->
          <!-- ============================== -->
          <nav class="tabs-nav">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="tab-btn"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              <i :class="tab.icon"></i>
              <span>{{ tab.label }}</span>
              <span v-if="tab.badge && tab.badge() > 0" class="tab-badge">{{ tab.badge() }}</span>
            </button>
          </nav>

          <!-- ============================== -->
          <!-- TAB 1: PROCESS -->
          <!-- ============================== -->
          <section v-show="activeTab === 'process'" class="tab-content">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>Select Employees to Process</h3>
                  <p class="muted">
                    <kbd>Ctrl</kbd>+Click to select multiple employees
                  </p>
                </div>
                <div class="panel-actions">
                  <button @click="selectAll" class="btn-ghost">Select All</button>
                  <button @click="clearSelection" class="btn-ghost">Clear</button>
                  <button
                    @click="openProcessModal"
                    class="btn-primary"
                    :disabled="selectedEmployees.length === 0 || loading"
                  >
                    <i class="fas fa-calculator"></i>
                    Process Payroll
                    <span v-if="selectedEmployees.length" class="btn-count">{{ selectedEmployees.length }}</span>
                  </button>
                </div>
              </div>

              <div v-if="loading" class="state-loading">
                <i class="fas fa-spinner spin"></i> Loading employees...
              </div>

              <div v-else class="employee-grid">
                <div
                  v-for="emp in employees"
                  :key="emp.id"
                  class="employee-card"
                  :class="{
                    selected: isSelected(emp.id),
                    active: emp.status === 'active'
                  }"
                  @click="toggleEmployee(emp)"
                >
                  <div class="emp-check">
                    <i :class="isSelected(emp.id) ? 'fas fa-check-circle' : 'far fa-circle'"></i>
                  </div>
                  <div class="emp-avatar">{{ initials(emp.full_name) }}</div>
                  <div class="emp-info">
                    <div class="emp-name">{{ emp.full_name }}</div>
                    <div class="emp-meta">
                      <span>{{ emp.department || 'General' }}</span>
                      <span>·</span>
                      <span>{{ emp.role || 'staff' }}</span>
                    </div>
                    <div class="emp-salary">
                      <span class="tag-type">{{ emp.salary_type || 'daily' }}</span>
                      <span class="salary-amt">₱{{ formatPrice(emp.salary_rate || 0) }}</span>
                    </div>
                  </div>
                  <div class="emp-status">
                    <span v-if="emp.status === 'active'" class="badge-active">Active</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Selected summary -->
            <div v-if="selectedEmployees.length > 0" class="selected-summary">
              <div class="summary-head">
                <h4><i class="fas fa-user-check"></i> {{ selectedEmployees.length }} Selected</h4>
                <button @click="clearSelection" class="btn-link">Clear all</button>
              </div>
              <div class="selected-tags">
                <span v-for="emp in selectedEmployees" :key="emp.id" class="selected-tag">
                  {{ emp.full_name }}
                  <button @click.stop="toggleEmployee(emp)" class="tag-close">×</button>
                </span>
              </div>
            </div>
          </section>

          <!-- ============================== -->
          <!-- TAB 2: RECORDS -->
          <!-- ============================== -->
          <section v-show="activeTab === 'records'" class="tab-content">
            <div class="panel">
              <div class="panel-head">
                <h3>Payroll Records</h3>
                <div class="filters">
                  <select v-model="recordFilter.status" class="form-control" @change="loadRecords">
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="finance_approved">Finance Approved</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <input v-model="recordFilter.from" type="date" class="form-control" @change="loadRecords" />
                  <input v-model="recordFilter.to" type="date" class="form-control" @change="loadRecords" />
                </div>
              </div>

              <div v-if="loading" class="state-loading">
                <i class="fas fa-spinner spin"></i> Loading records...
              </div>

              <div v-else-if="payrollRecords.length === 0" class="state-empty">
                <i class="fas fa-inbox"></i>
                <p>No payroll records yet</p>
              </div>

              <div v-else class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Period</th>
                      <th class="num">Days</th>
                      <th class="num">Basic</th>
                      <th class="num">Holiday</th>
                      <th class="num">Deductions</th>
                      <th class="num">Net Pay</th>
                      <th>Status</th>
                      <th class="center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="rec in payrollRecords" :key="rec.id">
                      <td>
                        <strong>{{ rec.full_name || 'Unknown' }}</strong>
                        <div class="muted small">{{ rec.department || 'General' }}</div>
                      </td>
                      <td class="small">
                        {{ formatDate(rec.period_start) }}<br>
                        <span class="muted">→ {{ formatDate(rec.period_end) }}</span>
                      </td>
                      <td class="num small">
                        <div>{{ rec.days_present || 0 }} P</div>
                        <div class="muted">{{ rec.days_late || 0 }} L · {{ rec.days_absent || 0 }} A</div>
                      </td>
                      <td class="num">₱{{ formatPrice(rec.basic_salary) }}</td>
                      <td class="num">₱{{ formatPrice(rec.holiday_pay) }}</td>
                      <td class="num text-danger">-₱{{ formatPrice(rec.deductions) }}</td>
                      <td class="num text-success"><strong>₱{{ formatPrice(rec.net_pay) }}</strong></td>
                      <td><span :class="statusClass(rec.status)">{{ statusLabel(rec.status) }}</span></td>
                      <td class="center actions-cell">

                        <!-- FINANCE: pending → approve -->
                        <button
                          v-if="rec.status === 'pending' && canFinance"
                          @click="openApproveModal(rec, 'finance')"
                          class="btn-sm btn-finance"
                          title="Finance Approve"
                        >
                          <i class="fas fa-money-check"></i> Approve
                        </button>

                        <!-- HR: finance_approved → final approve -->
                        <button
                          v-if="rec.status === 'finance_approved' && canHr"
                          @click="openApproveModal(rec, 'hr')"
                          class="btn-sm btn-hr"
                          title="HR Final Approve"
                        >
                          <i class="fas fa-check-double"></i> Approve
                        </button>

                        <!-- FINANCE: approved → mark paid -->
                        <button
                          v-if="rec.status === 'approved' && canFinance"
                          @click="openPayModal(rec)"
                          class="btn-sm btn-pay"
                          title="Mark Paid"
                        >
                          <i class="fas fa-credit-card"></i> Pay
                        </button>

                        <!-- PAID: view payslip + promote -->
                        <template v-if="rec.status === 'paid'">
                          <button @click="goToPayslip(rec.id)" class="btn-sm btn-view" title="View Payslip">
                            <i class="fas fa-file-invoice"></i>
                          </button>
                          <button
                            v-if="canHr"
                            @click="openPromoteModal(rec)"
                            class="btn-sm btn-promote"
                            title="Promote"
                          >
                            <i class="fas fa-arrow-up"></i>
                          </button>
                        </template>

                        <!-- REJECT -->
                        <button
                          v-if="['pending', 'finance_approved'].includes(rec.status) && (canFinance || canHr)"
                          @click="openRejectModal(rec)"
                          class="btn-sm btn-reject"
                          title="Reject"
                        >
                          <i class="fas fa-times"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- ============================== -->
          <!-- TAB 3: HOLIDAYS -->
          <!-- ============================== -->
          <section v-show="activeTab === 'holidays'" class="tab-content">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>Holiday Calendar</h3>
                  <p class="muted">Regular, special, and double-pay holidays</p>
                </div>
                <button v-if="canHr" @click="openHolidayModal()" class="btn-primary">
                  <i class="fas fa-plus"></i> Add Holiday
                </button>
              </div>

              <div v-if="holidays.length === 0" class="state-empty">
                <i class="fas fa-calendar-alt"></i>
                <p>No holidays configured</p>
              </div>

              <div v-else class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Holiday</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th class="num">Multiplier</th>
                      <th>Created By</th>
                      <th class="center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="h in holidays" :key="h.id">
                      <td><strong>{{ h.name }}</strong></td>
                      <td>{{ formatDate(h.holiday_date) }}</td>
                      <td><span class="holiday-tag" :class="`holiday-${h.type}`">{{ h.type }}</span></td>
                      <td class="num">{{ h.rate_multiplier }}×</td>
                      <td class="small muted">{{ h.created_by_name || '—' }}</td>
                      <td class="center">
                        <button v-if="canHr" @click="openHolidayModal(h)" class="btn-sm btn-edit" title="Edit">
                          <i class="fas fa-edit"></i>
                        </button>
                        <button v-if="canHr" @click="deleteHoliday(h)" class="btn-sm btn-reject" title="Delete">
                          <i class="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <!-- ============================== -->
          <!-- TAB 4: LEAVE -->
          <!-- ============================== -->
          <section v-show="activeTab === 'leave'" class="tab-content">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>Leave Requests</h3>
                  <p class="muted">Approved leave does not deduct from pay</p>
                </div>
                <select v-model="leaveFilter.status" class="form-control" @change="loadLeaveRequests">
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div v-if="leaveRequests.length === 0" class="state-empty">
                <i class="fas fa-umbrella-beach"></i>
                <p>No leave requests</p>
              </div>

              <div v-else class="table-wrap">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Type</th>
                      <th>From</th>
                      <th>To</th>
                      <th class="num">Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th class="center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="lr in leaveRequests" :key="lr.id">
                      <td><strong>{{ lr.full_name || 'Unknown' }}</strong></td>
                      <td class="small">{{ lr.leave_type_name || 'Leave' }}</td>
                      <td class="small">{{ formatDate(lr.start_date) }}</td>
                      <td class="small">{{ formatDate(lr.end_date) }}</td>
                      <td class="num">{{ lr.days_count || 0 }}</td>
                      <td class="small muted">{{ truncate(lr.reason, 40) }}</td>
                      <td><span :class="statusClass(lr.status)">{{ statusLabel(lr.status) }}</span></td>
                      <td class="center">
                        <template v-if="lr.status === 'pending' && canHr">
                          <button @click="approveLeave(lr)" class="btn-sm btn-finance" title="Approve">
                            <i class="fas fa-check"></i>
                          </button>
                          <button @click="rejectLeave(lr)" class="btn-sm btn-reject" title="Reject">
                            <i class="fas fa-times"></i>
                          </button>
                        </template>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  </div>

  <!-- =========================================== -->
  <!-- MODALS -->
  <!-- =========================================== -->

  <!-- PROCESS MODAL -->
  <div v-if="showProcessModal" class="modal-overlay" @click.self="closeProcessModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-calculator"></i> Process Payroll</h5>
        <button @click="closeProcessModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <p class="muted">
          <strong>{{ selectedEmployees.length }}</strong> employee(s) selected
        </p>

        <div class="form-group">
          <label>Period Type</label>
          <select v-model="processForm.periodType" class="form-control" @change="onPeriodTypeChange">
            <option value="daily">Daily</option>
            <option value="semi_monthly" selected>Semi-Monthly (1-15 / 16-End)</option>
            <option value="monthly">Monthly</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Start Date</label>
            <input v-model="processForm.startDate" type="date" class="form-control" />
          </div>
          <div class="form-group">
            <label>End Date</label>
            <input v-model="processForm.endDate" type="date" class="form-control" />
          </div>
        </div>

        <div class="info-box">
          <i class="fas fa-info-circle"></i>
          Payroll will be computed from attendance, shifts, holidays, and approved leave.
          Result status: <strong>pending</strong> — waiting for Finance approval.
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeProcessModal" class="btn btn-secondary" :disabled="processing">Cancel</button>
        <button @click="submitProcess" class="btn btn-primary" :disabled="processing">
          <i v-if="processing" class="fas fa-spinner spin"></i>
          {{ processing ? 'Processing...' : 'Process Now' }}
        </button>
      </div>
    </div>
  </div>

  <!-- APPROVE MODAL -->
  <div v-if="showApproveModal" class="modal-overlay" @click.self="closeApproveModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5>
          <i class="fas fa-check-circle"></i>
          {{ approveForm.stage === 'finance' ? 'Finance Approval' : 'HR Final Approval' }}
        </h5>
        <button @click="closeApproveModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body" v-if="activeRecord">
        <div class="summary-box">
          <div><span>Employee</span><strong>{{ activeRecord.full_name }}</strong></div>
          <div><span>Period</span><strong>{{ formatDate(activeRecord.period_start) }} → {{ formatDate(activeRecord.period_end) }}</strong></div>
          <div><span>Net Pay</span><strong class="text-success">₱{{ formatPrice(activeRecord.net_pay) }}</strong></div>
        </div>
        <p class="muted small">
          <i class="fas fa-info-circle"></i>
          {{ approveForm.stage === 'finance'
            ? 'Approving will forward this payroll to HR for final approval.'
            : 'Approving will mark this payroll ready for payment.' }}
        </p>
      </div>
      <div class="modal-footer">
        <button @click="closeApproveModal" class="btn btn-secondary" :disabled="processing">Cancel</button>
        <button @click="submitApprove" class="btn btn-primary" :disabled="processing">
          {{ processing ? 'Processing...' : 'Confirm Approve' }}
        </button>
      </div>
    </div>
  </div>

  <!-- PAY MODAL -->
  <div v-if="showPayModal" class="modal-overlay" @click.self="closePayModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-credit-card"></i> Mark as Paid</h5>
        <button @click="closePayModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body" v-if="activeRecord">
        <div class="summary-box">
          <div><span>Employee</span><strong>{{ activeRecord.full_name }}</strong></div>
          <div><span>Amount</span><strong class="text-success">₱{{ formatPrice(activeRecord.net_pay) }}</strong></div>
        </div>
        <div class="info-box">
          <i class="fas fa-info-circle"></i>
          The employee's wallet will be credited with ₱{{ formatPrice(activeRecord.net_pay) }}.
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closePayModal" class="btn btn-secondary" :disabled="processing">Cancel</button>
        <button @click="submitPay" class="btn btn-primary" :disabled="processing">
          <i class="fas fa-check"></i> Confirm Payment
        </button>
      </div>
    </div>
  </div>

  <!-- REJECT MODAL -->
  <div v-if="showRejectModal" class="modal-overlay" @click.self="closeRejectModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-times-circle"></i> Reject Payroll</h5>
        <button @click="closeRejectModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Reason</label>
          <textarea v-model="rejectForm.reason" rows="3" class="form-control" placeholder="Why is this being rejected?"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeRejectModal" class="btn btn-secondary" :disabled="processing">Cancel</button>
        <button @click="submitReject" class="btn btn-danger" :disabled="processing || !rejectForm.reason">
          Reject
        </button>
      </div>
    </div>
  </div>

  <!-- HOLIDAY MODAL -->
  <div v-if="showHolidayModal" class="modal-overlay" @click.self="closeHolidayModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-calendar-alt"></i> {{ holidayForm.id ? 'Edit' : 'Add' }} Holiday</h5>
        <button @click="closeHolidayModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Name *</label>
          <input v-model="holidayForm.name" type="text" class="form-control" placeholder="e.g. Christmas Day" />
        </div>
        <div class="form-group">
          <label>Date *</label>
          <input v-model="holidayForm.holiday_date" type="date" class="form-control" />
        </div>
        <div class="form-group">
          <label>Type *</label>
          <select v-model="holidayForm.type" class="form-control" @change="syncMultiplier">
            <option value="regular">Regular (200%)</option>
            <option value="special">Special (130%)</option>
            <option value="double">Double (300%)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Multiplier</label>
          <input v-model.number="holidayForm.rate_multiplier" type="number" step="0.01" class="form-control" />
        </div>
        <div class="form-group">
          <label>Notes</label>
          <textarea v-model="holidayForm.notes" rows="2" class="form-control"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeHolidayModal" class="btn btn-secondary" :disabled="processing">Cancel</button>
        <button @click="submitHoliday" class="btn btn-primary" :disabled="processing">
          {{ processing ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </div>
  </div>

  <!-- PROMOTE MODAL -->
  <div v-if="showPromoteModal" class="modal-overlay" @click.self="closePromoteModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-arrow-up"></i> Promote Employee</h5>
        <button @click="closePromoteModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body" v-if="promoteForm.employee">
        <div class="summary-box">
          <div><span>Employee</span><strong>{{ promoteForm.employee.full_name }}</strong></div>
          <div><span>Current Rate</span><strong>₱{{ formatPrice(promoteForm.oldRate) }}</strong></div>
        </div>
        <div class="form-group">
          <label>New Rate *</label>
          <input v-model.number="promoteForm.newRate" type="number" step="0.01" class="form-control" />
        </div>
        <div class="form-group">
          <label>Rate Type</label>
          <select v-model="promoteForm.newType" class="form-control">
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div class="form-group">
          <label>Reason</label>
          <textarea v-model="promoteForm.reason" rows="2" class="form-control" placeholder="e.g. Annual promotion"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closePromoteModal" class="btn btn-secondary" :disabled="processing">Cancel</button>
        <button @click="submitPromote" class="btn btn-primary" :disabled="processing || !promoteForm.newRate">
          <i class="fas fa-arrow-up"></i> Promote
        </button>
      </div>
    </div>
  </div>

</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePayrollStore } from '@/stores/payroll'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import Swal from 'sweetalert2'

const router      = useRouter()
const payroll    = usePayrollStore()
const authStore  = useAuthStore()

// ============================================
// STATE
// ============================================
const activeTab = ref('process')
const loading   = ref(false)
const processing = ref(false)

const selectedEmployees = ref([])
const activeRecord      = ref(null)

// Modal visibility
const showProcessModal  = ref(false)
const showApproveModal  = ref(false)
const showPayModal      = ref(false)
const showRejectModal   = ref(false)
const showHolidayModal  = ref(false)
const showPromoteModal  = ref(false)

// Forms
const processForm = ref({
  periodType: 'semi_monthly',
  startDate: '',
  endDate: '',
})

const approveForm = ref({
  stage: 'finance',
})

const rejectForm = ref({
  reason: '',
})

const holidayForm = ref({
  id: null,
  name: '',
  holiday_date: '',
  type: 'regular',
  rate_multiplier: 2.00,
  notes: '',
})

const promoteForm = ref({
  employee: null,
  oldRate: 0,
  newRate: 0,
  newType: 'daily',
  reason: '',
})

// Filters
const recordFilter = ref({ status: '', from: '', to: '' })
const leaveFilter  = ref({ status: '' })

// ============================================
// ROLE CHECKS
// ============================================
const canFinance = computed(() => authStore.hasAnyRole(['finance', 'admin', 'super_admin']))
const canHr      = computed(() => authStore.hasAnyRole(['hr', 'admin', 'super_admin']))

// ============================================
// TABS CONFIG
// ============================================
const tabs = computed(() => [
  { key: 'process',  label: 'Process',  icon: 'fas fa-calculator' },
  { key: 'records',  label: 'Records',  icon: 'fas fa-list', badge: () => payrollRecords.value.filter(r => r.status === 'pending').length },
  { key: 'holidays', label: 'Holidays', icon: 'fas fa-calendar-alt', badge: () => holidays.value.length },
  { key: 'leave',    label: 'Leave',    icon: 'fas fa-umbrella-beach', badge: () => leaveRequests.value.filter(l => l.status === 'pending').length },
])

// ============================================
// COMPUTED
// ============================================
const employees      = computed(() => payroll.employees)
const payrollRecords = computed(() => payroll.payrollRecords)
const holidays       = computed(() => payroll.holidays)
const leaveRequests  = computed(() => payroll.leaveRequests)

const pendingCount  = computed(() => payroll.pendingCount)
const approvedCount = computed(() => payroll.approvedCount + payroll.financeApprovedCount)
const totalNetPay   = computed(() => payroll.totalNetPay)

// ============================================
// UTILITIES
// ============================================
const formatPrice = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const formatDate  = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return d
  return dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}
const initials = (name) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}
const truncate = (s, n) => (s || '').length > n ? s.slice(0, n) + '…' : (s || '')

const statusClass = (s) => ({
  pending:          'pill pill-pending',
  finance_approved: 'pill pill-finance',
  approved:         'pill pill-approved',
  paid:             'pill pill-paid',
  rejected:         'pill pill-rejected',
}[s] || 'pill pill-pending')

const statusLabel = (s) => ({
  pending:          'Pending',
  finance_approved: 'Finance OK',
  approved:         'Approved',
  paid:             'Paid',
  rejected:         'Rejected',
}[s] || s)

// ============================================
// DATA LOADING
// ============================================
const refreshAll = async () => {
  loading.value = true
  try {
    await Promise.all([
      payroll.fetchEmployees(),
      payroll.fetchPayrollRecords(recordFilter.value),
      payroll.fetchHolidays(),
      payroll.fetchLeaveRequests(leaveFilter.value),
    ])
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadRecords = () => payroll.fetchPayrollRecords(recordFilter.value)
const loadLeaveRequests = () => payroll.fetchLeaveRequests(leaveFilter.value)

// ============================================
// EMPLOYEE SELECTION
// ============================================
const isSelected = (id) => selectedEmployees.value.some(e => e.id === id)

const toggleEmployee = (emp) => {
  const idx = selectedEmployees.value.findIndex(e => e.id === emp.id)
  if (idx >= 0) selectedEmployees.value.splice(idx, 1)
  else selectedEmployees.value.push(emp)
}

const selectAll = () => {
  selectedEmployees.value = [...employees.value]
}

const clearSelection = () => {
  selectedEmployees.value = []
}

// ============================================
// PROCESS PAYROLL
// ============================================
const getPeriodDates = (type) => {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  const fmt = (dt) => {
    const yy = dt.getFullYear()
    const mm = String(dt.getMonth() + 1).padStart(2, '0')
    const dd = String(dt.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  if (type === 'daily') {
    return { start: fmt(today), end: fmt(today) }
  }
  if (type === 'semi_monthly') {
    if (d <= 15) {
      return { start: fmt(new Date(y, m, 1)), end: fmt(new Date(y, m, 15)) }
    }
    return { start: fmt(new Date(y, m, 16)), end: fmt(new Date(y, m + 1, 0)) }
  }
  if (type === 'monthly') {
    return { start: fmt(new Date(y, m, 1)), end: fmt(new Date(y, m + 1, 0)) }
  }
  return { start: '', end: '' }
}

const onPeriodTypeChange = () => {
  if (processForm.value.periodType !== 'custom') {
    const { start, end } = getPeriodDates(processForm.value.periodType)
    processForm.value.startDate = start
    processForm.value.endDate   = end
  }
}

const openProcessModal = () => {
  if (selectedEmployees.value.length === 0) {
    Swal.fire({ icon: 'warning', title: 'Select employees first', confirmButtonColor: '#4F46E5' })
    return
  }
  processForm.value.periodType = 'semi_monthly'
  onPeriodTypeChange()
  showProcessModal.value = true
}

const closeProcessModal = () => {
  if (processing.value) return
  showProcessModal.value = false
}

const submitProcess = async () => {
  if (!processForm.value.startDate || !processForm.value.endDate) {
    Swal.fire({ icon: 'warning', title: 'Missing dates', confirmButtonColor: '#4F46E5' })
    return
  }
  processing.value = true
  try {
    const ids = selectedEmployees.value.map(e => e.id)
    const res = await payroll.processPayroll(
      processForm.value.periodType,
      processForm.value.startDate,
      processForm.value.endDate,
      ids
    )

    if (res.success) {
      showProcessModal.value = false
      clearSelection()
      activeTab.value = 'records'
      await loadRecords()

      const details = res.data?.details || []
      const total   = res.data?.summary?.total_net_pay || 0

      Swal.fire({
        icon: details.length > 0 ? 'success' : 'info',
        title: details.length > 0 ? 'Payroll Processed!' : 'No Attendance',
        html: details.length > 0
          ? `<p><strong>${details.length}</strong> employee(s) processed</p>
             <p>Total net: <strong>₱${formatPrice(total)}</strong></p>
             <p style="color:#6b7280;font-size:.85rem;">Awaiting Finance approval</p>`
          : '<p>No attendance records found in this period.</p>',
        confirmButtonColor: '#4F46E5',
      })
    } else {
      Swal.fire({ icon: 'error', title: 'Failed', text: res.message, confirmButtonColor: '#EF4444' })
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: 'Error', text: e.message, confirmButtonColor: '#EF4444' })
  } finally {
    processing.value = false
  }
}

// ============================================
// APPROVE
// ============================================
const openApproveModal = (rec, stage) => {
  activeRecord.value    = rec
  approveForm.value.stage = stage
  showApproveModal.value = true
}

const closeApproveModal = () => { if (!processing.value) showApproveModal.value = false }

const submitApprove = async () => {
  processing.value = true
  try {
    const stage = approveForm.value.stage
    const res = stage === 'finance'
      ? await payroll.financeApprove(activeRecord.value.id)
      : await payroll.hrApprove(activeRecord.value.id)

    if (res.success) {
      showApproveModal.value = false
      await loadRecords()
      Swal.fire({
        icon: 'success',
        title: stage === 'finance' ? 'Finance Approved' : 'HR Approved',
        timer: 1600,
        showConfirmButton: false,
      })
    } else {
      Swal.fire({ icon: 'error', title: 'Failed', text: res.message, confirmButtonColor: '#EF4444' })
    }
  } finally {
    processing.value = false
  }
}

// ============================================
// PAY
// ============================================
const openPayModal = (rec) => {
  activeRecord.value = rec
  showPayModal.value = true
}
const closePayModal = () => { if (!processing.value) showPayModal.value = false }

const submitPay = async () => {
  processing.value = true
  try {
    const res = await payroll.markPaid(activeRecord.value.id)
    if (res.success) {
      showPayModal.value = false
      await loadRecords()
      Swal.fire({
        icon: 'success',
        title: 'Paid!',
        html: `<p>₱${formatPrice(activeRecord.value.net_pay)} credited to wallet</p>`,
        timer: 2000,
        showConfirmButton: false,
      })
    } else {
      Swal.fire({ icon: 'error', title: 'Failed', text: res.message, confirmButtonColor: '#EF4444' })
    }
  } finally {
    processing.value = false
  }
}

// ============================================
// REJECT
// ============================================
const openRejectModal = (rec) => {
  activeRecord.value = rec
  rejectForm.value.reason = ''
  showRejectModal.value = true
}
const closeRejectModal = () => { if (!processing.value) showRejectModal.value = false }

const submitReject = async () => {
  processing.value = true
  try {
    const res = await payroll.reject(activeRecord.value.id, rejectForm.value.reason)
    if (res.success) {
      showRejectModal.value = false
      await loadRecords()
      Swal.fire({ icon: 'info', title: 'Rejected', timer: 1400, showConfirmButton: false })
    } else {
      Swal.fire({ icon: 'error', title: 'Failed', text: res.message, confirmButtonColor: '#EF4444' })
    }
  } finally {
    processing.value = false
  }
}

// ============================================
// HOLIDAYS
// ============================================
const openHolidayModal = (h = null) => {
  if (h) {
    holidayForm.value = { ...h }
  } else {
    holidayForm.value = {
      id: null, name: '', holiday_date: '', type: 'regular', rate_multiplier: 2.00, notes: '',
    }
  }
  showHolidayModal.value = true
}
const closeHolidayModal = () => { if (!processing.value) showHolidayModal.value = false }

const syncMultiplier = () => {
  const map = { regular: 2.00, special: 1.30, double: 3.00 }
  holidayForm.value.rate_multiplier = map[holidayForm.value.type] ?? 2.00
}

const submitHoliday = async () => {
  if (!holidayForm.value.name || !holidayForm.value.holiday_date) {
    Swal.fire({ icon: 'warning', title: 'Name and date required', confirmButtonColor: '#4F46E5' })
    return
  }
  processing.value = true
  try {
    const payload = { ...holidayForm.value }
    delete payload.id
    delete payload.created_by_name

    const res = holidayForm.value.id
      ? await payroll.updateHoliday(holidayForm.value.id, payload)
      : await payroll.createHoliday(payload)

    if (res.success) {
      showHolidayModal.value = false
      await payroll.fetchHolidays()
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1200, showConfirmButton: false })
    } else {
      Swal.fire({ icon: 'error', title: 'Failed', text: res.message, confirmButtonColor: '#EF4444' })
    }
  } finally {
    processing.value = false
  }
}

const deleteHoliday = async (h) => {
  const result = await Swal.fire({
    title: 'Delete Holiday?',
    html: `<p>Delete <strong>${h.name}</strong>?</p>`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    confirmButtonText: 'Delete',
  })
  if (!result.isConfirmed) return

  const res = await payroll.deleteHoliday(h.id)
  if (res.success) {
    Swal.fire({ icon: 'success', title: 'Deleted', timer: 1000, showConfirmButton: false })
  } else {
    Swal.fire({ icon: 'error', title: 'Failed', text: res.message })
  }
}

// ============================================
// LEAVE
// ============================================
const approveLeave = async (lr) => {
  const res = await payroll.approveLeave(lr.id)
  if (res.success) {
    await loadLeaveRequests()
    Swal.fire({ icon: 'success', title: 'Approved', timer: 1200, showConfirmButton: false })
  } else {
    Swal.fire({ icon: 'error', title: 'Failed', text: res.message })
  }
}

const rejectLeave = async (lr) => {
  const res = await payroll.rejectLeave(lr.id)
  if (res.success) {
    await loadLeaveRequests()
    Swal.fire({ icon: 'info', title: 'Rejected', timer: 1200, showConfirmButton: false })
  } else {
    Swal.fire({ icon: 'error', title: 'Failed', text: res.message })
  }
}

// ============================================
// PROMOTE
// ============================================
const openPromoteModal = (rec) => {
  const emp = employees.value.find(e => e.id === rec.user_id)
  if (!emp) {
    Swal.fire({ icon: 'error', title: 'Employee not found' })
    return
  }
  promoteForm.value = {
    employee: emp,
    oldRate:  emp.salary_rate || 0,
    newRate:  emp.salary_rate || 0,
    newType:  emp.salary_type || 'daily',
    reason:   '',
  }
  showPromoteModal.value = true
}
const closePromoteModal = () => { if (!processing.value) showPromoteModal.value = false }

const submitPromote = async () => {
  processing.value = true
  try {
    const res = await payroll.promoteEmployee(
      promoteForm.value.employee.id,
      promoteForm.value.newRate,
      promoteForm.value.newType,
      promoteForm.value.reason
    )
    if (res.success) {
      showPromoteModal.value = false
      await payroll.fetchEmployees()
      Swal.fire({ icon: 'success', title: 'Promoted!', timer: 1500, showConfirmButton: false })
    } else {
      Swal.fire({ icon: 'error', title: 'Failed', text: res.message, confirmButtonColor: '#EF4444' })
    }
  } finally {
    processing.value = false
  }
}

// ============================================
// MISC
// ============================================
const exportCsv = () => payroll.exportCsv()
const goToPayslip = (id) => router.push(`/hr/payroll/${id}`)

// ============================================
// MOUNTED
// ============================================
onMounted(async () => {
  // Set default period
  processForm.value.periodType = 'semi_monthly'
  onPeriodTypeChange()
  await refreshAll()
})
</script>

<style scoped>
/* ---------- Layout ---------- */
.app-layout { display: flex; min-height: 100vh; }
.main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.page-content { flex: 1; background: #f1f5f9; padding: 1.5rem; }
body.dark-mode .page-content { background: #0f172a; }
.payroll-container { max-width: 1400px; margin: 0 auto; }

/* ---------- Header ---------- */
.page-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
}
.page-header h2 { font-size: 1.5rem; font-weight: 700; margin: 0; color: #1a1a2e; display: flex; align-items: center; gap: .5rem; }
.page-header h2 i { color: #4F46E5; }
.page-header p { margin: .25rem 0 0; color: #6b7280; font-size: .9rem; }
body.dark-mode .page-header h2 { color: #f1f5f9; }
body.dark-mode .page-header h2 i { color: #a78bfa; }
body.dark-mode .page-header p { color: #94a3b8; }

.header-actions { display: flex; gap: .5rem; }

.btn-refresh {
  background: rgba(255, 255, 255, .55); border: 1px solid rgba(255, 255, 255, .7);
  padding: .5rem 1rem; border-radius: 10px; color: #374151; cursor: pointer;
  display: inline-flex; align-items: center; gap: .4rem; font-size: .85rem; font-weight: 500;
}
.btn-refresh:hover:not(:disabled) { background: rgba(255, 255, 255, .8); }
.btn-refresh:disabled { opacity: .5; cursor: not-allowed; }
body.dark-mode .btn-refresh { background: rgba(255, 255, 255, .06); border-color: rgba(167, 139, 250, .2); color: #e2e8f0; }

.btn-export {
  background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff;
  border: none; padding: .5rem 1rem; border-radius: 10px; cursor: pointer;
  display: inline-flex; align-items: center; gap: .4rem; font-size: .85rem; font-weight: 500;
}
.btn-export:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(79, 70, 229, .3); }

.spinning { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ---------- Stats ---------- */
.stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem; margin-bottom: 1.5rem;
}
.stat-card {
  display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, .85); border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, .8);
  box-shadow: 0 1px 3px rgba(0, 0, 0, .05);
}
body.dark-mode .stat-card {
  background: rgba(26, 22, 48, .55);
  border-color: rgba(167, 139, 250, .15);
  box-shadow: 0 4px 12px rgba(0, 0, 0, .3);
}
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0; }
.stat-label { font-size: .7rem; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin: 0; }
.stat-value { font-size: 1.4rem; font-weight: 700; color: #1a1a2e; margin: .15rem 0 0; }
body.dark-mode .stat-label { color: #94a3b8; }
body.dark-mode .stat-value { color: #f1f5f9; }

/* ---------- Tabs ---------- */
.tabs-nav {
  display: flex; gap: .25rem; padding: .35rem;
  background: rgba(255, 255, 255, .6); border-radius: 12px;
  margin-bottom: 1.25rem; overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, .7);
}
body.dark-mode .tabs-nav { background: rgba(26, 22, 48, .55); border-color: rgba(167, 139, 250, .15); }
.tab-btn {
  display: inline-flex; align-items: center; gap: .5rem;
  padding: .6rem 1.1rem; border-radius: 9px;
  background: transparent; border: none; cursor: pointer;
  color: #6b7280; font-weight: 500; font-size: .85rem; font-family: inherit;
  transition: all .15s ease; white-space: nowrap;
}
.tab-btn:hover { color: #4F46E5; background: rgba(79, 70, 229, .06); }
.tab-btn.active {
  background: linear-gradient(135deg, #4F46E5, #7C3AED); color: #fff;
  box-shadow: 0 4px 12px rgba(79, 70, 229, .3);
}
body.dark-mode .tab-btn { color: #94a3b8; }
body.dark-mode .tab-btn:hover { color: #a78bfa; background: rgba(167, 139, 250, .1); }
.tab-badge {
  background: rgba(255, 255, 255, .25); color: inherit;
  font-size: .65rem; font-weight: 700;
  padding: .1rem .45rem; border-radius: 999px; margin-left: .15rem;
}
.tab-btn:not(.active) .tab-badge { background: #4F46E5; color: #fff; }

.tab-content { animation: fadeIn .2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

/* ---------- Panel ---------- */
.panel {
  background: rgba(255, 255, 255, .9); border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, .8);
  padding: 1.25rem; margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .05);
}
body.dark-mode .panel {
  background: rgba(26, 22, 48, .55);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-color: rgba(167, 139, 250, .15);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .35);
}
.panel-head {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;
}
.panel-head h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1a1a2e; }
body.dark-mode .panel-head h3 { color: #f1f5f9; }
.panel-actions { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; }

.btn-primary {
  display: inline-flex; align-items: center; gap: .4rem;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: #fff; border: none; padding: .55rem 1.1rem;
  border-radius: 10px; cursor: pointer; font-weight: 600; font-size: .85rem;
  font-family: inherit; transition: all .15s;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79, 70, 229, .35); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-count {
  background: rgba(255, 255, 255, .3);
  font-size: .7rem; font-weight: 700;
  padding: .1rem .45rem; border-radius: 999px; margin-left: .2rem;
}

.btn-ghost {
  background: transparent; border: 1px solid #e5e7eb; color: #6b7280;
  padding: .45rem .9rem; border-radius: 9px; cursor: pointer;
  font-size: .82rem; font-weight: 500; font-family: inherit;
}
.btn-ghost:hover { background: #f9fafb; color: #4F46E5; border-color: #a5b4fc; }
body.dark-mode .btn-ghost { border-color: rgba(167, 139, 250, .2); color: #cbd5e1; }
body.dark-mode .btn-ghost:hover { background: rgba(124, 58, 237, .15); border-color: rgba(167, 139, 250, .5); }

.btn-link {
  background: none; border: none; color: #4F46E5; cursor: pointer;
  font-size: .82rem; text-decoration: underline;
}
body.dark-mode .btn-link { color: #a78bfa; }

/* ---------- Employee Grid ---------- */
.employee-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: .75rem;
}
.employee-card {
  display: flex; align-items: center; gap: .75rem;
  padding: .85rem 1rem; background: #f9fafb;
  border: 2px solid transparent; border-radius: 11px;
  cursor: pointer; transition: all .15s ease;
  position: relative;
}
body.dark-mode .employee-card { background: rgba(255, 255, 255, .04); }
.employee-card:hover { border-color: #4F46E5; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, .08); }
.employee-card.selected {
  border-color: #10b981;
  background: linear-gradient(135deg, rgba(16, 185, 129, .08), rgba(16, 185, 129, .02));
}
body.dark-mode .employee-card.selected { background: rgba(16, 185, 129, .12); }
.employee-card.active { border-left: 4px solid #10b981; }

.emp-check { color: #cbd5e1; font-size: 1.05rem; flex-shrink: 0; }
.employee-card.selected .emp-check { color: #10b981; }

.emp-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: .75rem; flex-shrink: 0;
}
.emp-info { flex: 1; min-width: 0; }
.emp-name {
  font-weight: 600; font-size: .88rem; color: #1a1a2e;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
body.dark-mode .emp-name { color: #f1f5f9; }
.emp-meta { font-size: .7rem; color: #6b7280; margin-top: .1rem; display: flex; gap: .25rem; }
body.dark-mode .emp-meta { color: #94a3b8; }
.emp-salary { display: flex; gap: .4rem; align-items: center; margin-top: .3rem; }
.tag-type {
  font-size: .6rem; text-transform: uppercase; font-weight: 700;
  background: rgba(79, 70, 229, .1); color: #4F46E5;
  padding: .1rem .4rem; border-radius: 4px;
}
body.dark-mode .tag-type { background: rgba(124, 58, 237, .2); color: #a78bfa; }
.salary-amt { font-size: .75rem; font-weight: 600; color: #1a1a2e; }
body.dark-mode .salary-amt { color: #e2e8f0; }
.badge-active {
  font-size: .6rem; font-weight: 700;
  background: rgba(16, 185, 129, .15); color: #059669;
  padding: .15rem .5rem; border-radius: 999px;
}
body.dark-mode .badge-active { background: rgba(16, 185, 129, .2); color: #6ee7b7; }

/* ---------- Selected Summary ---------- */
.selected-summary {
  margin-top: 1rem; padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, .08), rgba(16, 185, 129, .02));
  border: 1px solid rgba(16, 185, 129, .3); border-radius: 12px;
}
body.dark-mode .selected-summary { background: rgba(16, 185, 129, .08); border-color: rgba(16, 185, 129, .3); }
.summary-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
.summary-head h4 { margin: 0; font-size: .9rem; color: #065f46; }
body.dark-mode .summary-head h4 { color: #6ee7b7; }
.selected-tags { display: flex; flex-wrap: wrap; gap: .4rem; }
.selected-tag {
  display: inline-flex; align-items: center; gap: .3rem;
  background: rgba(255, 255, 255, .8); color: #065f46;
  padding: .25rem .7rem; border-radius: 999px;
  font-size: .78rem; border: 1px solid rgba(16, 185, 129, .3);
}
body.dark-mode .selected-tag { background: rgba(16, 185, 129, .15); color: #6ee7b7; }
.tag-close { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem; padding: 0 .1rem; }

/* ---------- Filters ---------- */
.filters { display: flex; gap: .5rem; flex-wrap: wrap; }
.form-control {
  padding: .5rem .75rem; border: 2px solid #e5e7eb;
  border-radius: 9px; font-size: .85rem; background: #fff; color: #1f2937;
  font-family: inherit; min-width: 130px;
}
.form-control:focus { outline: none; border-color: #4F46E5; }
body.dark-mode .form-control { background: rgba(255, 255, 255, .06); border-color: rgba(167, 139, 250, .2); color: #e2e8f0; }

/* ---------- Tables ---------- */
.table-wrap { overflow-x: auto; border-radius: 10px; }
.data-table { width: 100%; border-collapse: collapse; min-width: 900px; font-size: .85rem; }
.data-table th {
  padding: .7rem .85rem; text-align: left; font-weight: 600;
  font-size: .7rem; text-transform: uppercase; letter-spacing: .04em;
  color: #6b7280; background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
body.dark-mode .data-table th { background: rgba(255, 255, 255, .04); color: #94a3b8; border-bottom-color: rgba(167, 139, 250, .1); }
.data-table td { padding: .7rem .85rem; border-bottom: 1px solid #f3f4f6; color: #1f2937; vertical-align: middle; }
body.dark-mode .data-table td { color: #e2e8f0; border-bottom-color: rgba(167, 139, 250, .06); }
.data-table tr:last-child td { border-bottom: none; }
.data-table tbody tr:hover td { background: rgba(79, 70, 229, .03); }
body.dark-mode .data-table tbody tr:hover td { background: rgba(124, 58, 237, .08); }
.num { text-align: right; font-variant-numeric: tabular-nums; }
.center { text-align: center; }
.small { font-size: .78rem; }
.text-danger { color: #ef4444 !important; font-weight: 600; }
.text-success { color: #10b981 !important; font-weight: 600; }
.muted { color: #6b7280; }
body.dark-mode .muted { color: #94a3b8; }

/* ---------- Pills ---------- */
.pill {
  display: inline-block; padding: .15rem .55rem;
  border-radius: 999px; font-size: .68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .03em;
}
.pill-pending  { background: rgba(245, 158, 11, .15); color: #d97706; }
.pill-finance  { background: rgba(37, 99, 235, .15); color: #2563eb; }
.pill-approved { background: rgba(79, 70, 229, .15); color: #4F46E5; }
.pill-paid     { background: rgba(16, 185, 129, .15); color: #059669; }
.pill-rejected { background: rgba(239, 68, 68, .15); color: #dc2626; }

.holiday-tag {
  display: inline-block; padding: .15rem .55rem; border-radius: 999px;
  font-size: .68rem; font-weight: 700; text-transform: uppercase;
}
.holiday-regular { background: rgba(239, 68, 68, .15); color: #dc2626; }
.holiday-special { background: rgba(245, 158, 11, .15); color: #d97706; }
.holiday-double  { background: rgba(139, 92, 246, .15); color: #7c3aed; }

/* ---------- Action Buttons ---------- */
.actions-cell { white-space: nowrap; }
.btn-sm {
  display: inline-flex; align-items: center; gap: .25rem;
  padding: .35rem .6rem; border-radius: 7px; border: none;
  font-size: .72rem; font-weight: 600; cursor: pointer; font-family: inherit;
  margin: 0 .15rem;
}
.btn-finance { background: #2563eb; color: #fff; }
.btn-finance:hover { background: #1d4ed8; }
.btn-hr { background: #7C3AED; color: #fff; }
.btn-hr:hover { background: #6d28d9; }
.btn-pay { background: #059669; color: #fff; }
.btn-pay:hover { background: #047857; }
.btn-view { background: #4F46E5; color: #fff; }
.btn-view:hover { background: #4338CA; }
.btn-promote { background: #8b5cf6; color: #fff; }
.btn-promote:hover { background: #7c3aed; }
.btn-edit { background: #f59e0b; color: #fff; }
.btn-edit:hover { background: #d97706; }
.btn-reject { background: #ef4444; color: #fff; }
.btn-reject:hover { background: #dc2626; }

/* ---------- States ---------- */
.state-loading,
.state-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 3rem 1rem; text-align: center; gap: .75rem;
  color: #6b7280;
}
.state-empty i { font-size: 2.5rem; color: #d1d5db; }
.state-loading i { font-size: 1.5rem; color: #4F46E5; }
body.dark-mode .state-empty i { color: #475569; }

/* ---------- Modals ---------- */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999; padding: 1rem;
  background: rgba(15, 23, 42, .55);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
}
.modal-content {
  background: #fff; border-radius: 16px; width: 100%; max-width: 520px;
  max-height: 90vh; overflow-y: auto;
  animation: pop .2s ease;
}
body.dark-mode .modal-content {
  background: rgba(20, 16, 46, .97);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border: 1px solid rgba(167, 139, 250, .22);
  color: #e2e8f0;
}
@keyframes pop { from { transform: scale(.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.modal-header {
  padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9;
  display: flex; justify-content: space-between; align-items: center;
}
body.dark-mode .modal-header { border-bottom-color: rgba(167, 139, 250, .1); }
.modal-header h5 { margin: 0; font-size: 1rem; font-weight: 700; color: #1a1a2e; }
body.dark-mode .modal-header h5 { color: #f1f5f9; }
.btn-close { background: none; border: none; font-size: 1.5rem; color: #6b7280; cursor: pointer; line-height: 1; }

.modal-body { padding: 1.25rem; }
.modal-footer {
  padding: 1rem 1.25rem; border-top: 1px solid #f1f5f9;
  display: flex; justify-content: flex-end; gap: .5rem;
}
body.dark-mode .modal-footer { border-top-color: rgba(167, 139, 250, .1); }

.form-group { margin-bottom: 1rem; }
.form-group label { display: block; font-weight: 600; font-size: .82rem; color: #1f2937; margin-bottom: .35rem; }
body.dark-mode .form-group label { color: #e2e8f0; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
textarea.form-control { resize: vertical; min-height: 60px; }

.summary-box {
  display: flex; flex-direction: column; gap: .5rem;
  background: #f9fafb; border-radius: 10px; padding: 1rem; margin-bottom: 1rem;
  font-size: .88rem;
}
body.dark-mode .summary-box { background: rgba(255, 255, 255, .04); }
.summary-box > div { display: flex; justify-content: space-between; }
.summary-box span { color: #6b7280; }
body.dark-mode .summary-box span { color: #94a3b8; }

.info-box {
  background: rgba(79, 70, 229, .08); color: #4338ca;
  padding: .75rem 1rem; border-radius: 10px;
  font-size: .82rem; display: flex; align-items: flex-start; gap: .5rem;
  margin-top: .5rem;
}
body.dark-mode .info-box { background: rgba(124, 58, 237, .12); color: #c7d2fe; }

.btn {
  padding: .55rem 1.25rem; border: none; border-radius: 10px;
  font-weight: 600; font-size: .85rem; cursor: pointer; font-family: inherit;
}
.btn-secondary { background: #f3f4f6; color: #1f2937; }
body.dark-mode .btn-secondary { background: rgba(255, 255, 255, .08); color: #e2e8f0; }
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover { background: #dc2626; }

/* ---------- Responsive ---------- */
@media (max-width: 768px) {
  .payroll-container { padding: 0; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: flex-end; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .employee-grid { grid-template-columns: 1fr; }
  .form-row { grid-template-columns: 1fr; }
  .panel-head { flex-direction: column; align-items: flex-start; }
  .panel-actions { width: 100%; }
}

@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr; }
  .tab-btn { padding: .55rem .75rem; font-size: .78rem; }
}
</style>