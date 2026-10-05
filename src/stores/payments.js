// ============================================================
// 📁 File: src/stores/payments.js
// 🏪 Pinia store for PayMongo payments
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { paymentsApi } from '@/api/payments'

// ------------------------------------------------------------
// 🔧 HELPER — extract a readable message from any error shape
// (used by every catch block below)
// ------------------------------------------------------------
function errMsg(e, fallback = 'Request failed') {
  return (
    e?.response?.data?.message ||
    e?.payload?.message ||
    e?.message ||
    fallback
  )
}

export const usePaymentsStore = defineStore('payments', () => {
  // ============================================================
  // 🟢 STATE
  // ============================================================
  const methods         = ref([])
  const methodsLoaded   = ref(false)
  const methodsLoading  = ref(false)
  const methodsError    = ref(null)

  const current         = ref(null)     // active payment being tracked
  const polling         = ref(false)
  const pollTimer       = ref(null)
  const pollAttempts    = ref(0)
  const maxPollAttempts = 40            // 40 × 3s = 2 minutes

  const history         = ref([])
  const historyLoading  = ref(false)

  // ============================================================
  // 🟡 GETTERS
  // ============================================================
  const isTerminal = computed(() => {
    const s = current.value?.status
    return s === 'succeeded' || s === 'failed' || s === 'cancelled' || s === 'refunded'
  })

  // ============================================================
  // 🔵 ACTIONS
  // ============================================================

  // ---------- Load payment methods (cached) ----------
  async function loadMethods(force = false) {
    if (methodsLoaded.value && !force) return methods.value
    methodsLoading.value = true
    methodsError.value = null
    try {
      const res = await paymentsApi.listMethods()
      if (res?.success) {
        methods.value = res.data || []
        methodsLoaded.value = true
      } else {
        methodsError.value = res?.message || 'Failed to load methods'
      }
    } catch (e) {
      methodsError.value = errMsg(e, 'Failed to load methods')
    } finally {
      methodsLoading.value = false
    }
    return methods.value
  }

  // ---------- Create hosted Checkout Session ----------
  // ⬇️ PATCH: now catches axios errors and reads server message
  async function createCheckout(payload) {
    try {
      const res = await paymentsApi.createCheckout(payload)
      if (!res?.success) throw new Error(res?.message || 'Checkout failed')
      current.value = {
        id:            res.id,
        payment_ref:   res.payment_ref,
        checkout_id:   res.checkout_id,
        checkout_url:  res.checkout_url,
        status:        'pending',
        amount:        payload.amount,
        supplier_id:   payload.supplier_id,
        methods:       res.methods || []
      }
      return res
    } catch (e) {
      throw new Error(errMsg(e, 'Checkout failed'))
    }
  }

  // ---------- Create Payment Intent (custom UI) ----------
  async function createIntent(payload) {
    try {
      const res = await paymentsApi.createIntent(payload)
      if (!res?.success) throw new Error(res?.message || 'Intent creation failed')
      current.value = {
        id:           res.id,
        payment_ref:  res.payment_ref,
        intent_id:    res.intent_id,
        client_key:   res.client_key,
        status:       res.status || 'pending',
        amount:       payload.amount,
        supplier_id:  payload.supplier_id
      }
      return res
    } catch (e) {
      throw new Error(errMsg(e, 'Intent creation failed'))
    }
  }

  // ---------- Create Source (GCash/Maya/GrabPay/QR Ph) ----------
  async function createSource(payload) {
    try {
      const res = await paymentsApi.createSource(payload)
      if (!res?.success) throw new Error(res?.message || 'Source creation failed')
      current.value = {
        id:           res.id,
        payment_ref:  res.payment_ref,
        source_id:    res.source_id,
        checkout_url: res.checkout_url,
        status:       'pending',
        amount:       payload.amount,
        supplier_id:  payload.supplier_id,
        method:       payload.method
      }
      return res
    } catch (e) {
      throw new Error(errMsg(e, 'Source creation failed'))
    }
  }

  // ---------- Create Payment Link (shareable) ----------
  async function createLink(payload) {
    try {
      const res = await paymentsApi.createLink(payload)
      if (!res?.success) throw new Error(res?.message || 'Link creation failed')
      current.value = {
        id:          res.id,
        payment_ref: res.payment_ref,
        link_id:     res.link_id,
        link_url:    res.link_url,
        status:      'pending',
        amount:      payload.amount,
        supplier_id: payload.supplier_id
      }
      return res
    } catch (e) {
      throw new Error(errMsg(e, 'Link creation failed'))
    }
  }

  // ---------- Record manual payment (bank/cash/cheque) ----------
  async function recordManual(payload) {
    try {
      const res = await paymentsApi.recordManual(payload)
      if (!res?.success) throw new Error(res?.message || 'Manual payment failed')
      return res
    } catch (e) {
      throw new Error(errMsg(e, 'Manual payment failed'))
    }
  }

  // ---------- Refund ----------
  async function refund(payload) {
    try {
      const res = await paymentsApi.refund(payload)
      if (!res?.success) throw new Error(res?.message || 'Refund failed')
      return res
    } catch (e) {
      throw new Error(errMsg(e, 'Refund failed'))
    }
  }

  // ---------- Refresh a single payment ----------
  async function refresh(idOrRef, { sync = false, byRef = false } = {}) {
    try {
      const res = byRef
        ? await paymentsApi.findByRef(idOrRef)
        : (sync ? await paymentsApi.sync(idOrRef) : await paymentsApi.get(idOrRef))
      if (res?.success && res.data) {
        current.value = { ...current.value, ...res.data }
      }
      return res
    } catch (e) {
      return { success: false, message: errMsg(e, 'Refresh failed') }
    }
  }

  // ---------- Poll until terminal ----------
  function startPolling({ id = null, ref = null, intervalMs = 3000, onUpdate = null } = {}) {
    stopPolling()
    polling.value = true
    pollAttempts.value = 0

    const tick = async () => {
      pollAttempts.value++
      try {
        const res = ref
          ? await paymentsApi.findByRef(ref)
          : await paymentsApi.sync(id)

        if (res?.success && res.data) {
          current.value = { ...current.value, ...res.data }
          if (typeof onUpdate === 'function') onUpdate(current.value)

          if (['succeeded', 'failed', 'cancelled', 'refunded'].includes(current.value.status)) {
            stopPolling()
            return
          }
        }
      } catch (e) {
        // swallow — retry on next tick
      }

      if (pollAttempts.value >= maxPollAttempts) {
        stopPolling()
        return
      }
      pollTimer.value = setTimeout(tick, intervalMs)
    }

    tick()
  }

  function stopPolling() {
    polling.value = false
    if (pollTimer.value) {
      clearTimeout(pollTimer.value)
      pollTimer.value = null
    }
  }

  // ---------- Load history ----------
  async function loadHistory(filters = {}) {
    historyLoading.value = true
    try {
      const res = await paymentsApi.list(filters)
      if (res?.success) history.value = res.data || []
      return res
    } catch (e) {
      return { success: false, message: errMsg(e, 'Failed to load history') }
    } finally {
      historyLoading.value = false
    }
  }

  // ---------- Reset active ----------
  function reset() {
    stopPolling()
    current.value = null
    pollAttempts.value = 0
  }

  // ============================================================
  // 🟣 EXPORTS
  // ============================================================
  return {
    // state
    methods, methodsLoaded, methodsLoading, methodsError,
    current, polling, pollAttempts, maxPollAttempts,
    history, historyLoading,
    // getters
    isTerminal,
    // actions
    loadMethods,
    createCheckout, createIntent, createSource, createLink,
    recordManual, refund,
    refresh,
    startPolling, stopPolling,
    loadHistory,
    reset
  }
})