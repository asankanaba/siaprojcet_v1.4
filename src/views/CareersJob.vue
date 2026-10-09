<template>
  <div class="cj-page">
    <div class="cj-wrap">
      <!-- Loading -->
      <div v-if="loading" class="cj-state">
        <div class="cj-spinner"></div>
        <p>Loading job…</p>
      </div>

      <!-- Not found -->
      <div v-else-if="error" class="cj-state">
        <div class="cj-icon-error">?</div>
        <h1>{{ error }}</h1>
        <p class="muted">The job you're looking for isn't available.</p>
      </div>

      <!-- Job -->
      <article v-else class="cj-card">
        <header class="cj-head">
          <div class="cj-brand">
            <span class="cj-logo">🛍️</span>
            <span class="cj-brand-text">Smart POS</span>
          </div>
          <span v-if="job.status === 'open'" class="cj-badge cj-badge-open">Open</span>
          <span v-else class="cj-badge cj-badge-closed">Closed</span>
        </header>

        <h1 class="cj-title">{{ job.title }}</h1>

        <div class="cj-meta">
          <span v-if="job.department" class="cj-meta-item">
            <span class="cj-meta-ico">🏢</span> {{ job.department }}
          </span>
          <span v-if="job.salary_range" class="cj-meta-item">
            <span class="cj-meta-ico">💰</span> {{ job.salary_range }}
          </span>
          <span class="cj-meta-item">
            <span class="cj-meta-ico">📅</span> Posted {{ formatDate(job.created_at) }}
          </span>
        </div>

        <section class="cj-section">
          <h2>About this role</h2>
          <div class="cj-content" v-html="job.description"></div>
        </section>

        <section v-if="job.requirements" class="cj-section">
          <h2>Requirements</h2>
          <div class="cj-content" v-html="job.requirements"></div>
        </section>

        <div class="cj-actions" v-if="job.status === 'open'">
          <button class="cj-btn cj-btn-primary" @click="openApply">Apply for this job</button>
          <button class="cj-btn cj-btn-ghost" @click="copyLink">Copy link</button>
        </div>
        <div v-else class="cj-closed-msg">
          This position is no longer accepting applications.
        </div>
      </article>
    </div>

    <!-- APPLY MODAL -->
    <Teleport to="body">
      <div v-if="applyModal" class="cj-backdrop" @click.self="closeApply">
        <div class="cj-modal">
          <header class="cj-modal-head">
            <h3>Apply — {{ job?.title }}</h3>
            <button class="cj-icon-btn" :disabled="submitting" @click="closeApply">✕</button>
          </header>

          <div class="cj-modal-body">
            <div v-if="submitted" class="cj-success">
              <div class="cj-success-icon">✓</div>
              <h4>Application sent!</h4>
              <p>We'll get back to you at <strong>{{ form.applicant_email }}</strong>.</p>
              <button class="cj-btn cj-btn-primary" @click="closeApply">Close</button>
            </div>

            <form v-else @submit.prevent="submitApply">
              <label class="cj-field">
                <span>Full name *</span>
                <input v-model="form.applicant_name" required :disabled="submitting" />
              </label>
              <label class="cj-field">
                <span>Email *</span>
                <input v-model="form.applicant_email" type="email" required :disabled="submitting" />
              </label>
              <label class="cj-field">
                <span>Phone</span>
                <input v-model="form.applicant_phone" type="tel" :disabled="submitting" />
              </label>
              <label class="cj-field">
                <span>Resume URL (Google Drive / Dropbox link)</span>
                <input v-model="form.resume_url" type="url" :disabled="submitting" placeholder="https://…" />
              </label>
              <label class="cj-field">
                <span>Cover letter</span>
                <textarea v-model="form.cover_letter" rows="4" :disabled="submitting"></textarea>
              </label>

              <div v-if="applyError" class="cj-error">{{ applyError }}</div>

              <button type="submit" class="cj-btn cj-btn-primary cj-btn-block" :disabled="submitting">
                {{ submitting ? 'Sending…' : 'Submit application' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { jobsApi } from '@/api/jobs'

const route = useRoute()

const job        = ref(null)
const loading    = ref(true)
const error      = ref(null)
const applyModal = ref(false)
const submitting = ref(false)
const submitted  = ref(false)
const applyError = ref(null)

const form = reactive({
  applicant_name:  '',
  applicant_email: '',
  applicant_phone: '',
  resume_url:      '',
  cover_letter:    ''
})

// ============================================================
// DYNAMIC OPEN GRAPH META TAGS
// ============================================================
// LinkedIn / Facebook / Twitter crawlers look for these tags.
// We set them dynamically based on the loaded job.
function setMetaTag(property, content) {
  if (!content) return
  let el = document.querySelector(`meta[property="${property}"]`)
                 || document.querySelector(`meta[name="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(property.startsWith('og:') || property.startsWith('twitter:') ? 'property' : 'name', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function applyMetaTags(j) {
  if (!j) return

  const siteName = 'Smart POS'
  const url = window.location.href
  const img = `${window.location.origin}/favicon.ico` // Replace with a real OG image URL if you have one

  // Core
  document.title = `${j.title} — ${siteName} Careers`

  // Open Graph
  setMetaTag('og:type', 'website')
  setMetaTag('og:site_name', siteName)
  setMetaTag('og:title', j.title)
  setMetaTag('og:description',
    (j.description || `We are hiring: ${j.title}. ${j.department ? `Department: ${j.department}.` : ''} ${j.salary_range ? `Salary: ${j.salary_range}.` : ''}`).slice(0, 200))
  setMetaTag('og:url', url)
  setMetaTag('og:image', img)

  // Twitter (LinkedIn also reads this as a fallback)
  setMetaTag('twitter:card', 'summary_large_image')
  setMetaTag('twitter:title', j.title)
  setMetaTag('twitter:description', (j.description || '').slice(0, 200))
  setMetaTag('twitter:image', img)

  // Standard meta
  setMetaTag('description', (j.description || '').slice(0, 160))
}

// ============================================================
// LOAD JOB
// ============================================================
async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await jobsApi.getPublic(route.params.slug)
    if (res?.success && res.data) {
      job.value = res.data
      applyMetaTags(job.value)
    } else {
      error.value = 'Job not found'
    }
  } catch (e) {
    error.value = e?.response?.data?.message || 'Job not found'
  } finally {
    loading.value = false
  }
}

function openApply() {
  applyModal.value = true
  submitted.value = false
  applyError.value = null
}

function closeApply() {
  if (submitting.value) return
  applyModal.value = false
}

async function submitApply() {
  submitting.value = true
  applyError.value = null
  try {
    const res = await jobsApi.apply({
      job_post_id:     job.value.id,
      applicant_name:  form.applicant_name,
      applicant_email: form.applicant_email,
      applicant_phone: form.applicant_phone,
      resume_url:      form.resume_url,
      cover_letter:    form.cover_letter
    })
    if (!res?.success) throw new Error(res?.message || 'Submit failed')
    submitted.value = true
  } catch (e) {
    applyError.value = e?.response?.data?.message || e?.message || 'Could not submit application'
  } finally {
    submitting.value = false
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    alert('Link copied!')
  } catch (e) { /* ignore */ }
}

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(load)

// Re-load if the slug changes (SPA navigation between jobs)
watch(() => route.params.slug, load)
</script>

<style scoped>
/* ... keep all your existing styles unchanged ... */
.cj-page {
  min-height: 100vh;
  padding: 2rem 1rem;
  background:
    radial-gradient(circle at 15% 15%, rgba(99, 102, 241, 0.12), transparent 45%),
    radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.10), transparent 45%),
    linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
  color: #1e293b;
  font-size: 0.95rem;
}
body.dark-mode .cj-page {
  background:
    radial-gradient(circle at 15% 15%, rgba(124, 58, 237, 0.22), transparent 45%),
    radial-gradient(circle at 85% 80%, rgba(79, 70, 229, 0.18), transparent 45%),
    linear-gradient(135deg, #0a0a1a 0%, #1a1330 100%);
  color: #e2e8f0;
}
.cj-wrap { max-width: 780px; margin: 0 auto; }
.cj-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 300px; gap: 1rem; color: #64748b;
}
.cj-spinner {
  width: 40px; height: 40px;
  border: 4px solid rgba(99, 102, 241, 0.15);
  border-top-color: #6366f1; border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }
.cj-icon-error {
  width: 64px; height: 64px; border-radius: 50%;
  background: rgba(148, 163, 184, 0.2); color: #94a3b8;
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem; font-weight: 700;
}
.cj-card {
  background: rgba(255, 255, 255, 0.85);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px; padding: 2rem;
  box-shadow: 0 24px 64px rgba(31, 38, 135, 0.12);
}
body.dark-mode .cj-card {
  background: rgba(20, 16, 46, 0.75);
  border-color: rgba(167, 139, 250, 0.22);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 80px rgba(124, 58, 237, 0.15);
}
.cj-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.cj-brand { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1rem; }
.cj-logo { font-size: 1.35rem; }
.cj-brand-text { color: #4f46e5; }
body.dark-mode .cj-brand-text { color: #a5b4fc; }
.cj-badge {
  padding: 0.25rem 0.75rem; border-radius: 999px;
  font-size: 0.7rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.cj-badge-open { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
.cj-badge-closed { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
body.dark-mode .cj-badge-open { background: rgba(34,197,94,0.18); color: #86efac; border-color: rgba(34,197,94,0.35); }
body.dark-mode .cj-badge-closed { background: rgba(148,163,184,0.18); color: #cbd5e1; border-color: rgba(148,163,184,0.35); }
.cj-title { font-size: 1.75rem; font-weight: 800; margin: 0 0 1rem; line-height: 1.2; color: #0f172a; }
body.dark-mode .cj-title { color: #f1f5f9; }
.cj-meta { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; font-size: 0.85rem; color: #64748b; }
body.dark-mode .cj-meta { color: #94a3b8; }
.cj-meta-item { display: inline-flex; align-items: center; gap: 0.35rem; }
.cj-meta-ico { font-size: 0.9rem; }
.cj-section { margin-top: 1.5rem; }
.cj-section h2 { font-size: 1.05rem; font-weight: 700; margin: 0 0 0.75rem; color: #0f172a; }
body.dark-mode .cj-section h2 { color: #f1f5f9; }
.cj-content { line-height: 1.65; color: #334155; font-size: 0.92rem; }
body.dark-mode .cj-content { color: #cbd5e1; }
.cj-content :deep(p) { margin: 0 0 1rem; }
.cj-content :deep(ul), .cj-content :deep(ol) { padding-left: 1.5rem; margin: 0 0 1rem; }
.cj-content :deep(li) { margin-bottom: 0.35rem; }
.cj-actions {
  display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 2rem;
  padding-top: 1.5rem; border-top: 1px solid rgba(148, 163, 184, 0.2);
}
.cj-closed-msg {
  margin-top: 2rem; padding: 1rem; border-radius: 12px;
  background: #f1f5f9; color: #475569; text-align: center; font-size: 0.9rem;
}
body.dark-mode .cj-closed-msg { background: rgba(148,163,184,0.12); color: #cbd5e1; }
.cj-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
  padding: 0.7rem 1.4rem; border-radius: 10px; font-weight: 600; font-size: 0.9rem;
  cursor: pointer; border: 1px solid transparent; transition: all 0.15s ease; font-family: inherit;
}
.cj-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
.cj-btn-primary:hover:not(:disabled) { filter: brightness(1.1); }
.cj-btn-ghost { background: rgba(255,255,255,0.6); color: #334155; border-color: #e2e8f0; }
.cj-btn-ghost:hover:not(:disabled) { background: #f8fafc; }
body.dark-mode .cj-btn-ghost { background: rgba(255,255,255,0.06); color: #e2e8f0; border-color: rgba(167,139,250,0.18); }
.cj-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.cj-btn-block { width: 100%; display: flex; }
.cj-backdrop {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(6px); z-index: 9999;
  display: flex; align-items: center; justify-content: center; padding: 1rem;
}
.cj-modal {
  width: 100%; max-width: 520px; max-height: 90vh; overflow: hidden;
  display: flex; flex-direction: column; border-radius: 18px;
  background: #ffffff; border: 1px solid #e2e8f0;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.3);
}
body.dark-mode .cj-modal {
  background: rgba(20, 16, 46, 0.97);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border-color: rgba(167, 139, 250, 0.22);
}
.cj-modal-head {
  padding: 1rem 1.25rem; border-bottom: 1px solid #f1f5f9;
  display: flex; justify-content: space-between; align-items: center;
}
body.dark-mode .cj-modal-head { border-bottom-color: rgba(255,255,255,0.06); }
.cj-modal-head h3 { margin: 0; font-size: 1rem; font-weight: 600; }
.cj-icon-btn {
  width: 32px; height: 32px; border-radius: 8px;
  border: 1px solid #e2e8f0; background: #ffffff; color: #334155; cursor: pointer;
}
body.dark-mode .cj-icon-btn { background: rgba(255,255,255,0.06); border-color: rgba(167,139,250,0.18); color: #cbd5e1; }
.cj-modal-body { padding: 1.25rem; overflow-y: auto; }
.cj-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.9rem; }
.cj-field > span { font-size: 0.8rem; color: #64748b; font-weight: 500; }
body.dark-mode .cj-field > span { color: #94a3b8; }
.cj-field input, .cj-field textarea {
  padding: 0.65rem 0.85rem; border-radius: 10px; background: #ffffff;
  border: 1px solid #e2e8f0; color: #0f172a; font-size: 0.88rem;
  font-family: inherit; outline: none;
}
.cj-field input:focus, .cj-field textarea:focus {
  border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
body.dark-mode .cj-field input, body.dark-mode .cj-field textarea {
  background: rgba(255,255,255,0.06); border-color: rgba(167,139,250,0.2); color: #e2e8f0;
}
.cj-error {
  padding: 0.65rem 0.9rem; margin-bottom: 0.75rem;
  border-radius: 10px; background: #fef2f2; color: #b91c1c;
  font-size: 0.82rem; border: 1px solid #fecaca;
}
body.dark-mode .cj-error { background: rgba(239,68,68,0.12); color: #fca5a5; border-color: rgba(239,68,68,0.3); }
.cj-success { text-align: center; padding: 1.5rem 1rem; }
.cj-success-icon {
  width: 64px; height: 64px; border-radius: 50%;
  background: #dcfce7; color: #16a34a;
  display: flex; align-items: center; justify-content: center;
  font-size: 2rem; font-weight: 700; margin: 0 auto 1rem;
}
body.dark-mode .cj-success-icon { background: rgba(34,197,94,0.2); color: #4ade80; }
.cj-success h4 { margin: 0 0 0.5rem; font-size: 1.15rem; }
.muted { color: #64748b; }
body.dark-mode .muted { color: #94a3b8; }
</style>