<template>
  <div class="proc-container">
    <div class="page-header">
      <div>
        <h2><i class="fas fa-chart-line"></i> Procurement Dashboard</h2>
        <p>End-to-end visibility: Requisition → Finance → Supplier → Finance → Management</p>
      </div>
      <button @click="refresh" class="btn-secondary"><i class="fas fa-sync" :class="{ spinning: loading }"></i></button>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card" @click="$router.push('/supply-chain/procurement/requisitions')">
        <div class="kpi-icon icon-purple"><i class="fas fa-file-signature"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Pending Requisitions</div>
          <div class="kpi-value">{{ stats.pendingRequisitions }}</div>
          <div class="kpi-sub">Awaiting Finance approval</div>
        </div>
      </div>

      <div class="kpi-card" @click="$router.push('/supply-chain/procurement/rfqs')">
        <div class="kpi-icon icon-blue"><i class="fas fa-file-contract"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Open RFQs</div>
          <div class="kpi-value">{{ stats.openRfqs }}</div>
          <div class="kpi-sub">Awaiting supplier quotes</div>
        </div>
      </div>

      <div class="kpi-card" @click="$router.push('/supply-chain/procurement/goods-receipt')">
        <div class="kpi-icon icon-orange"><i class="fas fa-box-open"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Awaiting Delivery</div>
          <div class="kpi-value">{{ awaitingDelivery }}</div>
          <div class="kpi-sub">POs in transit</div>
        </div>
      </div>

      <div class="kpi-card" @click="$router.push('/supply-chain/procurement/invoices')">
        <div class="kpi-icon icon-red"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Invoice Mismatches</div>
          <div class="kpi-value">{{ stats.unmatchedInvoices }}</div>
          <div class="kpi-sub">3-way match failed</div>
        </div>
      </div>

      <div class="kpi-card" @click="$router.push('/supply-chain/procurement/payments')">
        <div class="kpi-icon icon-green"><i class="fas fa-money-bill-wave"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Pending Payments</div>
          <div class="kpi-value">{{ stats.pendingPayments }}</div>
          <div class="kpi-sub">Matched, not yet paid</div>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-icon icon-teal"><i class="fas fa-coins"></i></div>
        <div class="kpi-body">
          <div class="kpi-label">Total Paid</div>
          <div class="kpi-value">₱{{ fmt(stats.totalPaid) }}</div>
          <div class="kpi-sub">All-time to suppliers</div>
        </div>
      </div>
    </div>

    <h3 class="section-title"><i class="fas fa-diagram-project"></i> Procurement Lifecycle</h3>
    <div class="lifecycle">
      <div class="step" v-for="(s, i) in lifecycle" :key="i">
        <div class="step-icon" :class="s.color"><i :class="s.icon"></i></div>
        <div class="step-body">
          <div class="step-title">{{ s.title }}</div>
          <div class="step-desc">{{ s.desc }}</div>
          <div class="step-actor">{{ s.actor }}</div>
        </div>
        <div v-if="i < lifecycle.length - 1" class="step-arrow"><i class="fas fa-arrow-right"></i></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProcurementStore } from '@/stores/procurement'
import { useSupplyChainStore } from '@/stores/supplyChain'

const store   = useProcurementStore()
const scStore = useSupplyChainStore()

const loading = ref(false)

const stats = computed(() => store.stats)
const awaitingDelivery = computed(() =>
  scStore.purchaseOrders.filter(po =>
    ['ordered','acknowledged','shipped'].includes(po.status) ||
    ['ordered','acknowledged','shipped'].includes(po.lifecycle_status)
  ).length
)

const lifecycle = [
  { title: 'Requisition', desc: 'Business unit requests goods', actor: 'Management', icon: 'fas fa-file-signature', color: 'icon-purple' },
  { title: 'Budget Approval', desc: 'Finance validates budget', actor: 'Finance', icon: 'fas fa-check-circle', color: 'icon-blue' },
  { title: 'Sourcing (RFQ)', desc: 'Suppliers submit quotes', actor: 'Supplier', icon: 'fas fa-file-contract', color: 'icon-teal' },
  { title: 'Purchase Order', desc: 'Formal order issued', actor: 'Management', icon: 'fas fa-file-invoice', color: 'icon-purple' },
  { title: 'Accept Delivery', desc: 'Goods received & verified', actor: 'Management', icon: 'fas fa-box-open', color: 'icon-orange' },
  { title: 'Invoice Match', desc: '3-way match PO/GRN/Invoice', actor: 'Finance', icon: 'fas fa-balance-scale', color: 'icon-blue' },
  { title: 'PayMongo Payment', desc: 'Online payment to supplier', actor: 'Finance', icon: 'fas fa-credit-card', color: 'icon-green' },
  { title: 'Close & Review', desc: 'Rate supplier performance', actor: 'Management', icon: 'fas fa-star', color: 'icon-teal' }
]

const fmt = (v) => Number(v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')

const refresh = async () => {
  loading.value = true
  await Promise.all([
    store.loadRequisitions(),
    store.loadRfqs(),
    store.loadInvoices(),
    store.loadPayments(),
    scStore.loadPurchaseOrders()
  ])
  loading.value = false
}

onMounted(refresh)
</script>

<style scoped>
.proc-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
.page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
.page-header h2 { font-size:1.5rem; font-weight:700; color:#1a1a2e; margin:0; }
.page-header h2 i { color:#8B5CF6; margin-right:.4rem; }
.page-header p { color:#6b7280; margin:.25rem 0 0; }
.btn-secondary { background:#f3f4f6; color:#6b7280; border:none; padding:.5rem 1rem; border-radius:8px; cursor:pointer; }
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.kpi-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:1rem; margin-bottom:2rem; }
.kpi-card { background:#fff; border-radius:12px; padding:1.25rem; display:flex; align-items:center; gap:1rem; box-shadow:0 1px 3px rgba(0,0,0,.1); cursor:pointer; transition:transform .15s,box-shadow .15s; }
.kpi-card:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,.08); }
.kpi-icon { width:48px; height:48px; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.25rem; flex-shrink:0; }
.icon-purple { background:#8B5CF6; }
.icon-blue   { background:#2563eb; }
.icon-orange { background:#F59E0B; }
.icon-red    { background:#EF4444; }
.icon-green  { background:#10B981; }
.icon-teal   { background:#06B6D4; }
.kpi-label { font-size:.8rem; color:#6b7280; font-weight:500; }
.kpi-value { font-size:1.5rem; font-weight:700; color:#1a1a2e; line-height:1.2; }
.kpi-sub   { font-size:.75rem; color:#9ca3af; margin-top:.15rem; }
.section-title { font-size:1rem; font-weight:600; margin:1.5rem 0 1rem; display:flex; align-items:center; gap:.5rem; color:#1f2937; }
.section-title i { color:#8B5CF6; }
.lifecycle { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:.75rem; }
.step { position:relative; background:#fff; border-radius:12px; padding:1rem; display:flex; gap:.75rem; align-items:flex-start; box-shadow:0 1px 3px rgba(0,0,0,.06); }
.step-arrow { position:absolute; right:-14px; top:50%; transform:translateY(-50%); color:#cbd5e1; display:none; }
.step-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; }
.step-title { font-weight:600; font-size:.9rem; color:#1f2937; }
.step-desc  { font-size:.78rem; color:#6b7280; margin-top:.15rem; }
.step-actor { font-size:.7rem; color:#8B5CF6; font-weight:600; margin-top:.25rem; text-transform:uppercase; letter-spacing:.03em; }
@media (min-width: 1200px) {
  .lifecycle { grid-template-columns:repeat(4,1fr); }
  .step-arrow { display:block; }
  .step:nth-child(4) .step-arrow { display:none; }
}
</style>