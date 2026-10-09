// ============================================================
// 📁 File: src/api/jobs.js
// 💼 Job posts + public careers + applications
// ============================================================

import api from '@/api/index'

const ENDPOINT = '/jobs.php'

export const jobsApi = {
  // ---------- Public (no auth) ----------
  async listPublic() {
    const { data } = await api.get(ENDPOINT, { params: { action: 'public_list' } })
    return data
  },

  // Alias used by CareersLanding.vue
  async getPublicList() {
    return this.listPublic()
  },

  async getPublic(slug) {
    const { data } = await api.get(ENDPOINT, { params: { action: 'public', slug } })
    return data
  },

  async apply(payload) {
    const { data } = await api.post(ENDPOINT + '?action=apply', payload)
    return data
  },

  async trackShare(id) {
    const { data } = await api.put(ENDPOINT, {}, { params: { action: 'track_share', id } })
    return data
  },

  // ---------- HR ----------
  async list(filters = {}) {
    const { data } = await api.get(ENDPOINT, { params: filters })
    return data
  },

  async get(id) {
    const { data } = await api.get(ENDPOINT, { params: { id } })
    return data
  },

  async create(payload) {
    const { data } = await api.post(ENDPOINT, payload)
    return data
  },

  async update(id, fields) {
    const { data } = await api.put(ENDPOINT, fields, { params: { id } })
    return data
  },

  async remove(id) {
    const { data } = await api.delete(ENDPOINT, { params: { id } })
    return data
  },

  // ---------- Applications ----------
  async listApplications(jobId) {
    const { data } = await api.get(ENDPOINT, { params: { action: 'applications', job_id: jobId } })
    return data
  },

  async updateApplicationStatus(id, status, notes) {
    const { data } = await api.put(ENDPOINT, { status, notes }, { params: { action: 'application_status', id } })
    return data
  }
}

export default jobsApi