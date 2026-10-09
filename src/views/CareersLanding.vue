<template>
  <div class="cl-page">
    <div class="cl-wrap">

      <!-- Brand header -->
      <header class="cl-header">
        <div class="cl-brand">
          <span class="cl-logo">🛍️</span>
          <span class="cl-brand-text">Smart POS</span>
        </div>
        <span class="cl-tag">Careers</span>
      </header>

      <!-- Hero -->
      <section class="cl-hero">
        <h1>Join our team</h1>
        <p>
          We're building the future of retail — one store at a time.
          Explore open roles below and start your journey with us.
        </p>
      </section>

      <!-- Filters -->
      <section class="cl-filters" v-if="!loading && jobs.length > 0">
        <input
          v-model="search"
          type="text"
          class="cl-search"
          placeholder="Search jobs…"
        />
        <select v-model="filterDept" class="cl-select">
          <option value="">All Departments</option>
          <option v-for="d in departments" :key="d" :value="d">{{ d }}</option>
        </select>
      </section>

      <!-- Jobs grid -->
      <section v-if="loading" class="cl-state">
        <div class="cl-spinner"></div>
        <p>Loading open positions…</p>
      </section>

      <section v-else-if="filteredJobs.length === 0" class="cl-state">
        <div class="cl-icon">📭</div>
        <h3>No open positions right now</h3>
        <p class="muted">
          {{ jobs.length === 0 ? "We don't have any openings at the moment. Check back soon!" : "No jobs match your search." }}
        </p>
      </section>

      <section v-else class="cl-grid">
        <router-link
          v-for="job in filteredJobs"
          :key="job.id"
          :to="`/careers/${job.slug}`"
          class="cl-card"
        >
          <div class="cl-card-head">
            <h3 class="cl-card-title">{{ job.title }}</h3>
            <span class="cl-arrow">→</span>
          </div>
          <div class="cl-card-meta">
            <span v-if="job.department" class="cl-tag-pill">🏢 {{ job.department }}</span>
            <span v-if="job.salary_range" class="cl-tag-pill">💰 {{ job.salary_range }}</span>
          </div>
          <div class="cl-card-foot">
            Posted {{ formatDate(job.created_at) }}
          </div>
        </router-link>
      </section>

      <!-- Footer -->
      <footer class="cl-footer">
        <p>© {{ new Date().getFullYear() }} Smart POS · All rights reserved</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { jobsApi } from '@/api/jobs'

const jobs      = ref([])
const loading   = ref(true)
const search    = ref('')
const filterDept = ref('')

const departments = computed(() => {
  const set = new Set()
  jobs.value.forEach(j => { if (j.department) set.add(j.department) })
  return Array.from(set).sort()
})

const filteredJobs = computed(() => {
  let list = jobs.value
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(j =>
      (j.title || '').toLowerCase().includes(q) ||
      (j.department || '').toLowerCase().includes(q)
    )
  }
  if (filterDept.value) {
    list = list.filter(j => j.department === filterDept.value)
  }
  return list
})

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

async function load() {
  loading.value = true
  try {
    const res = await jobsApi.listPublic()
    jobs.value = res?.data || []
  } catch (e) {
    console.error('Failed to load jobs:', e)
    jobs.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.cl-page {
  min-height: 100vh;
  padding: 2rem 1rem;
  background:
    radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.12), transparent 45%),
    radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.10), transparent 45%),
    linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  color: #1e293b;
  font-size: 0.95rem;
}
body.dark-mode .cl-page {
  background:
    radial-gradient(circle at 15% 15%, rgba(124, 58, 237, 0.22), transparent 45%),
    radial-gradient(circle at 85% 80%, rgba(79, 70, 229, 0.18), transparent 45%),
    linear-gradient(135deg, #0a0a1a 0%, #1a1330 100%);
  color: #e2e8f0;
}

.cl-wrap {
  max-width: 980px;
  margin: 0 auto;
}

/* Header */
.cl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
}
.cl-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
}
.cl-logo { font-size: 1.35rem; }
.cl-brand-text { color: #4f46e5; }
body.dark-mode .cl-brand-text { color: #a5b4fc; }
.cl-tag {
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(99, 102, 241, 0.12);
  color: #4f46e5;
}
body.dark-mode .cl-tag {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
}

/* Hero */
.cl-hero {
  margin-bottom: 2.5rem;
}
.cl-hero h1 {
  font-size: 2.25rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
  color: #0f172a;
  line-height: 1.15;
}
body.dark-mode .cl-hero h1 { color: #f1f5f9; }
.cl-hero p {
  font-size: 1rem;
  color: #64748b;
  max-width: 600px;
  line-height: 1.55;
  margin: 0;
}
body.dark-mode .cl-hero p { color: #94a3b8; }

/* Filters */
.cl-filters {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.cl-search {
  flex: 1;
  min-width: 200px;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(226, 232, 240, 0.9);
  color: #0f172a;
  font-size: 0.9rem;
  outline: none;
  font-family: inherit;
}
.cl-search:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12); }
body.dark-mode .cl-search {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2);
  color: #e2e8f0;
}
.cl-select {
  padding: 0.7rem 1rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(226, 232, 240, 0.9);
  color: #0f172a;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  outline: none;
}
body.dark-mode .cl-select {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.2);
  color: #e2e8f0;
}
body.dark-mode .cl-select option { background: #1a1630; color: #e2e8f0; }

/* States */
.cl-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
  color: #64748b;
  gap: 0.75rem;
}
.cl-spinner {
  width: 40px; height: 40px;
  border: 4px solid rgba(99, 102, 241, 0.15);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }
.cl-icon { font-size: 3rem; margin-bottom: 0.5rem; }
.cl-state h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}
body.dark-mode .cl-state h3 { color: #f1f5f9; }
.muted { color: #94a3b8; margin: 0; }
body.dark-mode .muted { color: #94a3b8; }

/* Jobs grid */
.cl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.cl-card {
  display: block;
  padding: 1.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.85);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 8px 24px rgba(31, 38, 135, 0.06);
  text-decoration: none;
  color: inherit;
  transition: all 0.2s ease;
}
.cl-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(31, 38, 135, 0.12);
  border-color: rgba(99, 102, 241, 0.3);
}
body.dark-mode .cl-card {
  background: rgba(20, 16, 46, 0.75);
  border-color: rgba(167, 139, 250, 0.22);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}
body.dark-mode .cl-card:hover {
  border-color: rgba(167, 139, 250, 0.5);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(124, 58, 237, 0.15);
}

.cl-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.cl-card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}
body.dark-mode .cl-card-title { color: #f1f5f9; }
.cl-arrow {
  color: #6366f1;
  font-weight: 700;
  font-size: 1.1rem;
  transition: transform 0.2s ease;
}
.cl-card:hover .cl-arrow { transform: translateX(3px); }

.cl-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.9rem;
}
.cl-tag-pill {
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.1);
  color: #4f46e5;
  font-size: 0.72rem;
  font-weight: 500;
}
body.dark-mode .cl-tag-pill {
  background: rgba(99, 102, 241, 0.18);
  color: #a5b4fc;
}

.cl-card-foot {
  font-size: 0.75rem;
  color: #94a3b8;
  padding-top: 0.6rem;
  border-top: 1px solid rgba(148, 163, 184, 0.15);
}
body.dark-mode .cl-card-foot { border-top-color: rgba(148, 163, 184, 0.1); }

/* Footer */
.cl-footer {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(148, 163, 184, 0.15);
  text-align: center;
  font-size: 0.8rem;
  color: #94a3b8;
}
body.dark-mode .cl-footer { border-top-color: rgba(148, 163, 184, 0.1); }
.cl-footer p { margin: 0; }

@media (max-width: 640px) {
  .cl-hero h1 { font-size: 1.75rem; }
  .cl-grid { grid-template-columns: 1fr; }
}
</style>