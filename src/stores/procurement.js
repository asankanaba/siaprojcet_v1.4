// src/stores/procurement.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api/index.js'

export const useProcurementStore = defineStore('procurement', () => {
  // ============================================
  // STATE
  // ============================================
  const requisitions = ref([])
  const rfqs         = ref([])
  const deliveries   = ref([])
  const invoices     = ref([])
  const payments     = ref([])
  const performance  = ref([])

  const loading      = ref(false)
  const processing   = ref(false)
  const error        = ref(null)

  // ============================================
  // STATS
  // ============================================
  const stats = computed(() => ({
    pendingRequisitions: requisitions.value.filter(r => r.status === 'pending_finance').length,
    approvedRequisitions: requisitions.value.filter(r => r.status === 'approved').length,
    openRfqs:            rfqs.value.filter(r => r.status === 'sent').length,
    awaitingDelivery:    requisitions.value.filter(r => r.po_id).length,
    unmatchedInvoices:   invoices.value.filter(i => i.status === 'mismatch').length,
    pendingPayments:     payments.value.filter(p => p.status === 'pending').length,
    totalPaid:           payments.value
      .filter(p => p.status === 'succeeded')
      .reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  }))

  // ============================================
  // REQUISITIONS
  // ============================================
  const loadRequisitions = async (filters = {}) => {
    loading.value = true
    try {
      const q = new URLSearchParams(filters).toString()
      const { data } = await api.get(`/requisitions.php${q ? '?' + q : ''}`)
      requisitions.value = data.data || []
    } catch (e) {
      console.error('loadRequisitions:', e)
      error.value = e.message
      requisitions.value = []
    } finally { loading.value = false }
  }

  const createRequisition = async (payload) => {
    const { data } = await api.post('/requisitions.php', payload)
    if (data.success) await loadRequisitions()
    return data
  }

  const approveRequisition = async (id, approvedBy) => {
    const { data } = await api.put(`/requisitions.php?id=${id}`, {
      action: 'approve', approved_by: approvedBy
    })
    if (data.success) await loadRequisitions()
    return data
  }

  const rejectRequisition = async (id, approvedBy, reason) => {
    const { data } = await api.put(`/requisitions.php?id=${id}`, {
      action: 'reject', approved_by: approvedBy, rejection_reason: reason
    })
    if (data.success) await loadRequisitions()
    return data
  }

  const cancelRequisition = async (id) => {
    const { data } = await api.put(`/requisitions.php?id=${id}`, { action: 'cancel' })
    if (data.success) await loadRequisitions()
    return data
  }

  // ============================================
  // RFQs
  // ============================================
  const loadRfqs = async (filters = {}) => {
    loading.value = true
    try {
      const q = new URLSearchParams(filters).toString()
      const { data } = await api.get(`/rfqs.php${q ? '?' + q : ''}`)
      rfqs.value = data.data || []
    } catch (e) {
      console.error('loadRfqs:', e)
      rfqs.value = []
    } finally { loading.value = false }
  }

  const getRfq = async (id) => {
    const { data } = await api.get(`/rfqs.php?id=${id}`)
    return data.data
  }

  const createRfq = async (payload) => {
    const { data } = await api.post('/rfqs.php', { ...payload, kind: 'rfq' })
    if (data.success) await loadRfqs()
    return data
  }

  const addQuote = async (payload) => {
    const { data } = await api.post('/rfqs.php', { ...payload, kind: 'quote' })
    return data
  }

  const selectQuote = async (rfqId, quoteId) => {
    const { data } = await api.put(`/rfqs.php?id=${rfqId}`, { select_quote_id: quoteId })
    return data
  }

  // ============================================
  // DELIVERIES (Accept Delivery / GRN)
  // ============================================
  const loadDeliveries = async (poId = null) => {
    loading.value = true
    try {
      const url = poId ? `/po_deliveries.php?po_id=${poId}` : '/po_deliveries.php'
      const { data } = await api.get(url)
      deliveries.value = data.data || []
    } catch (e) {
      console.error('loadDeliveries:', e)
      deliveries.value = []
    } finally { loading.value = false }
  }

  const acceptDelivery = async (payload) => {
    processing.value = true
    try {
      const { data } = await api.post('/po_deliveries.php', payload)
      return data
    } finally { processing.value = false }
  }

  // ============================================
  // INVOICES (3-way match)
  // ============================================
  const loadInvoices = async (filters = {}) => {
    loading.value = true
    try {
      const q = new URLSearchParams(filters).toString()
      const { data } = await api.get(`/supplier_invoices.php${q ? '?' + q : ''}`)
      invoices.value = data.data || []
    } catch (e) {
      console.error('loadInvoices:', e)
      invoices.value = []
    } finally { loading.value = false }
  }

  const recordInvoice = async (payload) => {
    const { data } = await api.post('/supplier_invoices.php', payload)
    if (data.success) await loadInvoices()
    return data
  }

  // ============================================
  // PAYMENTS (PayMongo + manual)
  // ============================================
  const loadPayments = async (filters = {}) => {
    loading.value = true
    try {
      const q = new URLSearchParams(filters).toString()
      const { data } = await api.get(`/payments.php${q ? '?' + q : ''}`)
      payments.value = data.data || []
    } catch (e) {
      console.error('loadPayments:', e)
      payments.value = []
    } finally { loading.value = false }
  }

  const createPaymongoCheckout = async (payload) => {
    const { data } = await api.post('/payments.php', {
      ...payload,
      kind: 'create_checkout',
      redirect_base: window.location.origin
    })
    return data
  }

  const recordManualPayment = async (payload) => {
    const { data } = await api.post('/payments.php', {
      ...payload,
      kind: 'record_manual'
    })
    if (data.success) await loadPayments()
    return data
  }

  // ============================================
  // SUPPLIER PERFORMANCE
  // ============================================
  const loadSupplierPerformance = async () => {
    loading.value = true
    try {
      const { data } = await api.get('/supplier_performance.php')
      performance.value = data.data || []
    } catch (e) {
      console.error('loadSupplierPerformance:', e)
      performance.value = []
    } finally { loading.value = false }
  }

  const rateSupplier = async (payload) => {
    const { data } = await api.post('/supplier_performance.php', payload)
    if (data.success) await loadSupplierPerformance()
    return data
  }

  return {
    // state
    requisitions, rfqs, deliveries, invoices, payments, performance,
    loading, processing, error, stats,
    // actions
    loadRequisitions, createRequisition, approveRequisition,
    rejectRequisition, cancelRequisition,
    loadRfqs, getRfq, createRfq, addQuote, selectQuote,
    loadDeliveries, acceptDelivery,
    loadInvoices, recordInvoice,
    loadPayments, createPaymongoCheckout, recordManualPayment,
    loadSupplierPerformance, rateSupplier
  }
})