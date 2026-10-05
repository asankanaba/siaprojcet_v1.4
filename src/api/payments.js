// ============================================================
// 📁 File: src/api/payments.js
// 💳 PayMongo payments API module
// Reuses the existing axios instance from @/api/index.js
// (so it inherits: JWT interceptor, 401 redirect, dual-base URL,
//  common headers, error logging)
// ============================================================

import api from '@/api/index'

// ------------------------------------------------------------
// Endpoints — payments.php lives at the same /api/ folder
// ------------------------------------------------------------
const ENDPOINTS = {
  payments: '/payments.php',
  return:   '/paymongo_return.php',
  webhook:  '/paymongo_webhook.php' // not used from frontend, documented only
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------
export const paymentsApi = {
  // ---------- Reads ----------

  /** GET enabled PayMongo methods (card, gcash, paymaya, grab_pay, qrph, …) */
  async listMethods() {
    const { data } = await api.get(ENDPOINTS.payments, { params: { action: 'methods' } })
    return data
  },

  /** GET list of payments with optional filters: status, supplier_id, po_id, invoice_id */
  async list(filters = {}) {
    const { data } = await api.get(ENDPOINTS.payments, { params: filters })
    return data
  },

  /** GET one payment by DB id */
  async get(id) {
    const { data } = await api.get(ENDPOINTS.payments, { params: { id } })
    return data
  },

  /** GET one payment + re-sync with PayMongo (webhook fallback) */
  async sync(id) {
    const { data } = await api.get(ENDPOINTS.payments, {
      params: { action: 'retrieve', id }
    })
    return data
  },

  /** GET payment by payment_ref (used on return page) */
  async findByRef(ref) {
    const { data } = await api.get(ENDPOINTS.return, { params: { ref } })
    return data
  },

  // ---------- Creates ----------

  /** POST create hosted Checkout Session → returns { checkout_url } */
  async createCheckout(payload) {
    const { data } = await api.post(ENDPOINTS.payments, {
      kind: 'create_checkout',
      ...payload
    })
    return data
  },

  /** POST create Payment Intent (for custom UI) */
  async createIntent(payload) {
    const { data } = await api.post(ENDPOINTS.payments, {
      kind: 'create_intent',
      ...payload
    })
    return data
  },

  /** POST attach payment method to an existing intent */
  async attachIntent({ payment_id, payment_method_id, return_url }) {
    const { data } = await api.post(ENDPOINTS.payments, {
      kind: 'attach_intent',
      payment_id,
      payment_method_id,
      return_url
    })
    return data
  },

  /** POST create Source (GCash/Maya/GrabPay/QR Ph legacy flow) */
  async createSource(payload) {
    const { data } = await api.post(ENDPOINTS.payments, {
      kind: 'create_source',
      ...payload
    })
    return data
  },

  /** POST create Payment Link (shareable URL, no redirect) */
  async createLink(payload) {
    const { data } = await api.post(ENDPOINTS.payments, {
      kind: 'create_link',
      ...payload
    })
    return data
  },

  /** POST record manual payment (bank_transfer, cash, cheque) */
  async recordManual(payload) {
    const { data } = await api.post(ENDPOINTS.payments, {
      kind: 'record_manual',
      ...payload
    })
    return data
  },

  /** POST refund a succeeded payment */
  async refund({ payment_id, amount, reason }) {
    const { data } = await api.post(ENDPOINTS.payments, {
      kind: 'refund',
      payment_id,
      amount,
      reason
    })
    return data
  },

  // ---------- Updates ----------

  /** PUT manual override (status, paymongo_status, paid_at, notes, failure_reason) */
  async update(id, fields) {
    const { data } = await api.put(ENDPOINTS.payments, fields, { params: { id } })
    return data
  }
}

export default paymentsApi