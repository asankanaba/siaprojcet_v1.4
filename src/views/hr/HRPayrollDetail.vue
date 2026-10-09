<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="detail-container">

          <!-- Loading -->
          <div v-if="loading" class="state-box">
            <i class="fas fa-spinner spin"></i>
            <p>Loading payslip...</p>
          </div>

          <!-- Error -->
          <div v-else-if="error" class="state-box error">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>{{ error }}</h3>
            <button @click="$router.push('/hr/payroll')" class="btn btn-primary">
              <i class="fas fa-arrow-left"></i> Back to Payroll
            </button>
          </div>

          <!-- Payslip -->
          <div v-else-if="record" class="payslip-wrap">

            <!-- Action bar (hidden in print) -->
            <div class="action-bar no-print">
              <button @click="$router.push('/hr/payroll')" class="btn btn-ghost">
                <i class="fas fa-arrow-left"></i> Back
              </button>
              <div class="action-bar-right">
                <span class="status-pill" :class="`pill-${record.status}`">
                  {{ statusLabel(record.status) }}
                </span>
                <button @click="printPayslip" class="btn btn-primary">
                  <i class="fas fa-print"></i> Print
                </button>
                <button @click="downloadPdf" class="btn btn-ghost">
                  <i class="fas fa-download"></i> Save PDF
                </button>
              </div>
            </div>

            <!-- The payslip itself -->
            <article class="payslip" id="payslip">

              <!-- Header -->
              <header class="payslip-head">
                <div class="brand">
                  <div class="brand-logo">🛍️</div>
                  <div class="brand-info">
                    <h1>Smart POS</h1>
                    <p>Inventory · HR · Finance · Supply Chain</p>
                  </div>
                </div>
                <div class="payslip-title">
                  <h2>PAYSLIP</h2>
                  <p class="muted">Payroll #{{ record.id }}</p>
                </div>
              </header>

              <hr class="divider" />

              <!-- Employee info -->
              <section class="info-grid">
                <div class="info-block">
                  <h3>Employee</h3>
                  <p class="big">{{ record.full_name || 'Unknown' }}</p>
                  <p class="muted">@{{ record.username }}</p>
                </div>
                <div class="info-block">
                  <h3>Department</h3>
                  <p>{{ record.department || 'General' }}</p>
                  <p class="muted">{{ record.role || 'staff' }}</p>
                </div>
                <div class="info-block">
                  <h3>Pay Period</h3>
                  <p>{{ formatDate(record.period_start) }}</p>
                  <p class="muted">to {{ formatDate(record.period_end) }}</p>
                </div>
                <div class="info-block">
                  <h3>Generated</h3>
                  <p>{{ formatDate(record.created_at) }}</p>
                  <p class="muted" v-if="record.approved_at">
                    Approved {{ formatDate(record.approved_at) }}
                  </p>
                </div>
              </section>

              <hr class="divider" />

              <!-- Attendance summary -->
              <section class="attendance-summary">
                <div class="att-stat">
                  <span class="att-label">Days Present</span>
                  <span class="att-value text-success">{{ record.days_present || 0 }}</span>
                </div>
                <div class="att-stat">
                  <span class="att-label">Days Late</span>
                  <span class="att-value text-warning">{{ record.days_late || 0 }}</span>
                </div>
                <div class="att-stat">
                  <span class="att-label">Days Absent</span>
                  <span class="att-value text-danger">{{ record.days_absent || 0 }}</span>
                </div>
                <div class="att-stat">
                  <span class="att-label">Base Rate</span>
                  <span class="att-value">₱{{ formatPrice(record.salary_rate || 0) }}</span>
                </div>
              </section>

              <hr class="divider" />

              <!-- Earnings + Deductions -->
              <section class="breakdown">
                <div class="breakdown-col">
                  <h3 class="col-title text-success">
                    <i class="fas fa-plus-circle"></i> Earnings
                  </h3>
                  <table class="line-table">
                    <tr>
                      <td>Basic Salary</td>
                      <td class="num">₱{{ formatPrice(record.basic_salary) }}</td>
                    </tr>
                    <tr v-if="Number(record.holiday_pay) > 0">
                      <td>Holiday Pay</td>
                      <td class="num">₱{{ formatPrice(record.holiday_pay) }}</td>
                    </tr>
                    <tr v-if="Number(record.leave_pay) > 0">
                      <td>Paid Leave</td>
                      <td class="num">₱{{ formatPrice(record.leave_pay) }}</td>
                    </tr>
                    <tr v-if="Number(record.allowances) > 0">
                      <td>Allowances</td>
                      <td class="num">₱{{ formatPrice(record.allowances) }}</td>
                    </tr>
                    <tr class="total-row">
                      <td><strong>Gross Pay</strong></td>
                      <td class="num"><strong>₱{{ formatPrice(grossPay) }}</strong></td>
                    </tr>
                  </table>
                </div>

                <div class="breakdown-col">
                  <h3 class="col-title text-danger">
                    <i class="fas fa-minus-circle"></i> Deductions
                  </h3>
                  <table class="line-table">
                    <tr>
                      <td>Late / Absent</td>
                      <td class="num">-₱{{ formatPrice(record.deductions) }}</td>
                    </tr>
                    <tr class="total-row">
                      <td><strong>Total Deductions</strong></td>
                      <td class="num"><strong>-₱{{ formatPrice(record.deductions) }}</strong></td>
                    </tr>
                  </table>
                </div>
              </section>

              <!-- Net pay -->
              <section class="net-pay-box">
                <div class="net-label">NET PAY</div>
                <div class="net-amount">₱{{ formatPrice(record.net_pay) }}</div>
                <div class="net-sub" v-if="record.status === 'paid'">
                  <i class="fas fa-check-circle"></i> Paid
                </div>
              </section>

              <hr class="divider" />

              <!-- Audit trail -->
              <section class="audit">
                <h3>Approval Trail</h3>
                <div class="audit-trail">
                  <div class="audit-step" :class="{ done: true }">
                    <div class="step-dot"><i class="fas fa-check"></i></div>
                    <div class="step-info">
                      <strong>Processed</strong>
                      <p class="muted">{{ formatDate(record.created_at) }}</p>
                    </div>
                  </div>
                  <div class="audit-line" :class="{ done: ['finance_approved','approved','paid'].includes(record.status) }"></div>

                  <div class="audit-step" :class="{ done: ['finance_approved','approved','paid'].includes(record.status) }">
                    <div class="step-dot">
                      <i :class="['finance_approved','approved','paid'].includes(record.status) ? 'fas fa-check' : 'fas fa-clock'"></i>
                    </div>
                    <div class="step-info">
                      <strong>Finance Approved</strong>
                      <p class="muted">Step 1 of 2</p>
                    </div>
                  </div>
                  <div class="audit-line" :class="{ done: ['approved','paid'].includes(record.status) }"></div>

                  <div class="audit-step" :class="{ done: ['approved','paid'].includes(record.status) }">
                    <div class="step-dot">
                      <i :class="['approved','paid'].includes(record.status) ? 'fas fa-check' : 'fas fa-clock'"></i>
                    </div>
                    <div class="step-info">
                      <strong>HR Final Approval</strong>
                      <p class="muted">Step 2 of 2</p>
                    </div>
                  </div>
                  <div class="audit-line" :class="{ done: record.status === 'paid' }"></div>

                  <div class="audit-step" :class="{ done: record.status === 'paid' }">
                    <div class="step-dot">
                      <i :class="record.status === 'paid' ? 'fas fa-check' : 'fas fa-clock'"></i>
                    </div>
                    <div class="step-info">
                      <strong>Paid</strong>
                      <p class="muted">Credited to wallet</p>
                    </div>
                  </div>
                </div>
              </section>

              <!-- Footer -->
              <footer class="payslip-footer">
                <p class="muted small">
                  This is a system-generated payslip. No signature required.
                </p>
                <p class="muted small">
                  Smart POS v1.4 · Generated {{ formatDateTime(new Date()) }}
                </p>
              </footer>
            </article>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import api from '@/api/index.js'

const route  = useRoute()
const router = useRouter()

const record  = ref(null)
const loading = ref(true)
const error   = ref(null)

// ============================================
// COMPUTED
// ============================================
const grossPay = computed(() => {
  if (!record.value) return 0
  return (
    Number(record.value.basic_salary || 0) +
    Number(record.value.holiday_pay  || 0) +
    Number(record.value.leave_pay    || 0) +
    Number(record.value.allowances   || 0)
  )
})

// ============================================
// FORMATTERS
// ============================================
const formatPrice = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
const formatDate  = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return d
  return dt.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}
const formatDateTime = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return d
  return dt.toLocaleString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const statusLabel = (s) => ({
  pending:          'Pending Finance',
  finance_approved: 'Awaiting HR',
  approved:         'Ready to Pay',
  paid:             'Paid',
  rejected:         'Rejected',
}[s] || s)

// ============================================
// ACTIONS
// ============================================
const printPayslip = () => {
  window.print()
}

const downloadPdf = () => {
  // Triggers print dialog with "Save as PDF" option
  window.print()
}

// ============================================
// LOAD
// ============================================
const load = async () => {
  loading.value = true
  error.value = null
  try {
    const id = route.params.id
    const { data } = await api.get(`/payroll.php?id=${id}`)
    if (data.success && data.data) {
      record.value = data.data
    } else {
      error.value = 'Payroll record not found'
    }
  } catch (e) {
    console.error('Error loading payroll:', e)
    error.value = e.response?.data?.message || 'Failed to load payslip'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
/* ============================================
   LAYOUT
   ============================================ */
.app-layout { display: flex; min-height: 100vh; }
.main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.page-content { flex: 1; background: #f1f5f9; padding: 1.5rem; }
body.dark-mode .page-content { background: #0f172a; }
.detail-container { max-width: 900px; margin: 0 auto; }

/* ============================================
   STATES
   ============================================ */
.state-box {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 4rem 1rem; gap: 1rem;
  background: #fff; border-radius: 16px;
  color: #6b7280;
}
body.dark-mode .state-box { background: rgba(20, 16, 46, .6); color: #94a3b8; }
.state-box.error { color: #ef4444; }
.state-box.error i { font-size: 3rem; }
.state-box i.spin { font-size: 2rem; color: #4F46E5; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ============================================
   ACTION BAR
   ============================================ */
.action-bar {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1rem; flex-wrap: wrap; gap: .75rem;
}
.action-bar-right { display: flex; gap: .5rem; align-items: center; }

.btn {
  padding: .5rem 1.1rem; border-radius: 10px; border: none;
  font-weight: 600; font-size: .85rem; cursor: pointer;
  display: inline-flex; align-items: center; gap: .4rem;
  font-family: inherit; transition: all .15s;
}
.btn-primary {
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  color: #fff;
}
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79, 70, 229, .35); }
.btn-ghost {
  background: #fff; color: #374151; border: 1px solid #e5e7eb;
}
.btn-ghost:hover { background: #f9fafb; }
body.dark-mode .btn-ghost { background: rgba(255, 255, 255, .06); color: #e2e8f0; border-color: rgba(167, 139, 250, .2); }

.status-pill {
  display: inline-block; padding: .3rem .8rem;
  border-radius: 999px; font-size: .72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .04em;
}
.pill-pending  { background: rgba(245, 158, 11, .15); color: #d97706; }
.pill-finance_approved { background: rgba(37, 99, 235, .15); color: #2563eb; }
.pill-approved { background: rgba(79, 70, 229, .15); color: #4F46E5; }
.pill-paid     { background: rgba(16, 185, 129, .15); color: #059669; }
.pill-rejected { background: rgba(239, 68, 68, .15); color: #dc2626; }

/* ============================================
   PAYSLIP
   ============================================ */
.payslip {
  background: #fff;
  border-radius: 16px;
  padding: 2.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .05);
  color: #1a1a2e;
}
body.dark-mode .payslip {
  background: rgba(20, 16, 46, .75);
  color: #e2e8f0;
  border: 1px solid rgba(167, 139, 250, .15);
}

.payslip-head {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;
}
.brand { display: flex; align-items: center; gap: .75rem; }
.brand-logo {
  width: 48px; height: 48px; border-radius: 12px;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem;
}
.brand-info h1 { font-size: 1.35rem; margin: 0; font-weight: 800; letter-spacing: -.01em; }
.brand-info p { font-size: .78rem; margin: .15rem 0 0; color: #6b7280; }
body.dark-mode .brand-info p { color: #94a3b8; }

.payslip-title { text-align: right; }
.payslip-title h2 {
  font-size: 1.5rem; margin: 0; font-weight: 800;
  letter-spacing: .1em; color: #4F46E5;
}
body.dark-mode .payslip-title h2 { color: #a78bfa; }
.payslip-title .muted { font-size: .75rem; margin: .25rem 0 0; }

.divider {
  border: none; border-top: 2px dashed #e5e7eb;
  margin: 1.5rem 0;
}
body.dark-mode .divider { border-top-color: rgba(167, 139, 250, .15); }

/* Info grid */
.info-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.25rem;
}
.info-block h3 {
  font-size: .68rem; text-transform: uppercase; letter-spacing: .05em;
  font-weight: 700; color: #6b7280; margin: 0 0 .35rem;
}
body.dark-mode .info-block h3 { color: #94a3b8; }
.info-block p { margin: 0; font-size: .95rem; }
.info-block p.big { font-size: 1.1rem; font-weight: 700; }
.info-block p.muted { font-size: .78rem; color: #6b7280; margin-top: .15rem; }
body.dark-mode .info-block p.muted { color: #94a3b8; }

/* Attendance summary */
.attendance-summary {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
  padding: 1.25rem;
  background: #f9fafb;
  border-radius: 12px;
}
body.dark-mode .attendance-summary { background: rgba(255, 255, 255, .04); }
.att-stat { display: flex; flex-direction: column; gap: .3rem; }
.att-label {
  font-size: .68rem; text-transform: uppercase; letter-spacing: .05em;
  font-weight: 700; color: #6b7280;
}
body.dark-mode .att-label { color: #94a3b8; }
.att-value { font-size: 1.3rem; font-weight: 700; }
.text-success { color: #10b981 !important; }
.text-warning { color: #f59e0b !important; }
.text-danger  { color: #ef4444 !important; }

/* Breakdown */
.breakdown {
  display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;
}
.col-title {
  font-size: .95rem; font-weight: 700; margin: 0 0 .75rem;
  display: flex; align-items: center; gap: .4rem;
}
.line-table {
  width: 100%; border-collapse: collapse; font-size: .9rem;
}
.line-table td {
  padding: .55rem 0;
  border-bottom: 1px solid #f3f4f6;
}
body.dark-mode .line-table td { border-bottom-color: rgba(167, 139, 250, .08); }
.line-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.line-table tr:last-child td { border-bottom: none; }
.line-table .total-row td {
  padding-top: .75rem;
  border-top: 2px solid #e5e7eb;
}
body.dark-mode .line-table .total-row td { border-top-color: rgba(167, 139, 250, .2); }

/* Net pay */
.net-pay-box {
  margin-top: 2rem;
  padding: 1.75rem;
  text-align: center;
  background: linear-gradient(135deg, rgba(16, 185, 129, .1), rgba(16, 185, 129, .02));
  border: 2px solid rgba(16, 185, 129, .3);
  border-radius: 14px;
}
body.dark-mode .net-pay-box { background: rgba(16, 185, 129, .1); }
.net-label {
  font-size: .75rem; text-transform: uppercase; letter-spacing: .15em;
  font-weight: 700; color: #059669; margin-bottom: .35rem;
}
.net-amount {
  font-size: 2.5rem; font-weight: 800;
  color: #059669; line-height: 1;
  font-variant-numeric: tabular-nums;
}
body.dark-mode .net-amount { color: #6ee7b7; }
.net-sub {
  margin-top: .5rem; font-size: .78rem; font-weight: 600;
  color: #059669; display: inline-flex; align-items: center; gap: .3rem;
}

/* Audit trail */
.audit h3 {
  font-size: .85rem; text-transform: uppercase; letter-spacing: .05em;
  font-weight: 700; color: #6b7280; margin: 0 0 1rem;
}
body.dark-mode .audit h3 { color: #94a3b8; }
.audit-trail {
  display: flex; align-items: center; gap: .5rem;
  flex-wrap: wrap;
}
.audit-step {
  display: flex; align-items: center; gap: .5rem;
  flex: 0 0 auto;
}
.audit-step .step-dot {
  width: 32px; height: 32px; border-radius: 50%;
  background: #f3f4f6; color: #9ca3af;
  display: flex; align-items: center; justify-content: center;
  font-size: .8rem; flex-shrink: 0;
}
.audit-step.done .step-dot {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 2px 8px rgba(16, 185, 129, .35);
}
body.dark-mode .audit-step .step-dot { background: rgba(255, 255, 255, .08); color: #64748b; }
body.dark-mode .audit-step.done .step-dot { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
.step-info strong { font-size: .82rem; display: block; }
.step-info p { font-size: .7rem; margin: .1rem 0 0; }
.audit-line {
  flex: 1; min-width: 20px; height: 2px;
  background: #e5e7eb;
}
.audit-line.done { background: #10b981; }

/* Footer */
.payslip-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
  text-align: center;
}
body.dark-mode .payslip-footer { border-top-color: rgba(167, 139, 250, .1); }
.small { font-size: .72rem; }
.payslip-footer p { margin: .2rem 0; }

/* Muted */
.muted { color: #6b7280; }
body.dark-mode .muted { color: #94a3b8; }

/* ============================================
   RESPONSIVE
   ============================================ */
@media (max-width: 640px) {
  .payslip { padding: 1.5rem; }
  .breakdown { grid-template-columns: 1fr; gap: 1.5rem; }
  .payslip-head { flex-direction: column; align-items: flex-start; }
  .payslip-title { text-align: left; }
  .net-amount { font-size: 2rem; }
  .audit-trail { flex-direction: column; align-items: flex-start; }
  .audit-line { width: 2px; height: 20px; min-width: 2px; }
}

/* ============================================
   PRINT STYLES
   ============================================ */
@media print {
  .no-print { display: none !important; }
  .sidebar, .navbar, nav, aside { display: none !important; }
  .app-layout { display: block; }
  .page-content { background: #fff !important; padding: 0; }
  .detail-container { max-width: 100%; }
  .payslip {
    box-shadow: none !important;
    border-radius: 0 !important;
    padding: 1rem !important;
    border: none !important;
  }
  body { background: #fff !important; color: #000 !important; }
  body.dark-mode .payslip { background: #fff !important; color: #000 !important; border: none !important; }
  .net-pay-box { border-color: #059669 !important; }
  .audit-step.done .step-dot { background: #059669 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>