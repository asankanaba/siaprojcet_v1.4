<template>
  <Teleport to="body">
    <div v-if="visible" class="sl-backdrop" @click.self="close">
      <div class="sl-modal">

        <header class="sl-head">
          <div class="sl-head-left">
            <span class="sl-linkedin-icon">in</span>
            <h3>Share on LinkedIn</h3>
          </div>
          <button class="sl-close" @click="close">✕</button>
        </header>

        <div class="sl-body">

          <div class="sl-preview">
            <div class="sl-preview-image">
              <span>🛍️</span>
            </div>
            <div class="sl-preview-content">
              <div class="sl-preview-domain">{{ domainFromUrl(payload.url) }}</div>
              <h4 class="sl-preview-title">{{ payload.title }}</h4>
              <p class="sl-preview-desc">
                {{ truncate(payload.description || 'We are hiring! Click to view the full job description.', 140) }}
              </p>
              <div class="sl-preview-meta" v-if="payload.department || payload.salary_range">
                <span v-if="payload.department">🏢 {{ payload.department }}</span>
                <span v-if="payload.salary_range">💰 {{ payload.salary_range }}</span>
              </div>
            </div>
          </div>

          <div class="sl-url-row">
            <span class="sl-url-label">Public URL</span>
            <div class="sl-url-box">
              <input :value="payload.url" readonly class="sl-url-input" />
              <button class="sl-copy-btn" @click="copyUrl">
                {{ copied ? '✓ Copied' : 'Copy' }}
              </button>
            </div>
          </div>

          <div class="sl-options">
            <label class="sl-checkbox">
              <input type="checkbox" v-model="openInNewTab" />
              <span>Open LinkedIn in a new tab (recommended)</span>
            </label>
            <label class="sl-checkbox">
              <input type="checkbox" v-model="trackShare" />
              <span>Track this share in the job post</span>
            </label>
          </div>

          <div class="sl-hint">
            <p><strong>How it works:</strong></p>
            <ol>
              <li>Click <strong>Open LinkedIn</strong> — LinkedIn opens with a pre-filled post.</li>
              <li>LinkedIn shows a preview of your job page (if your site is public).</li>
              <li>Click <strong>Post</strong> in LinkedIn to publish it to your feed.</li>
            </ol>
            <p v-if="isLocalhost" class="sl-warning">
              ⚠️ You're sharing a <strong>localhost / LAN URL</strong>.
              LinkedIn will preview it as blank because it can't reach your dev machine.
              Deploy to Netlify (or use ngrok) to get a shareable public link.
            </p>
          </div>
        </div>

        <footer class="sl-foot">
          <button class="sl-btn sl-btn-ghost" @click="close">Cancel</button>
          <button class="sl-btn sl-btn-ghost" @click="previewPage">
            👁 Preview page
          </button>
          <button class="sl-btn sl-btn-linkedin" @click="openLinkedIn">
            <span class="sl-btn-icon">in</span>
            Open LinkedIn
          </button>
        </footer>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { jobsApi } from '@/api/jobs'

const emit = defineEmits(['shared', 'closed'])

const visible  = ref(false)
const copied   = ref(false)
const openInNewTab = ref(true)
const trackShare   = ref(true)

const payload = reactive({
  title: '',
  description: '',
  department: '',
  salary_range: '',
  url: '',
  jobId: null
})

let copyTimer = null

function open(data) {
  payload.title        = data.title || 'Job Opening'
  payload.description  = data.description || ''
  payload.department   = data.department || ''
  payload.salary_range = data.salary_range || ''
  payload.url          = data.url || ''
  payload.jobId        = data.jobId || null
  visible.value = true
  copied.value = false
}

function close() {
  visible.value = false
  emit('closed')
}

const isLocalhost = computed(() => {
  const u = payload.url || ''
  return /localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\./.test(u)
})

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(payload.url)
    copied.value = true
    if (copyTimer) clearTimeout(copyTimer)
    copyTimer = setTimeout(() => { copied.value = false }, 1800)
  } catch (e) {
    window.prompt('Copy this link:', payload.url)
  }
}

function previewPage() {
  window.open(payload.url, '_blank', 'noopener')
}

async function openLinkedIn() {
  const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(payload.url)}`

  if (openInNewTab.value) {
    window.open(shareUrl, '_blank', 'noopener,width=600,height=700')
  } else {
    window.location.href = shareUrl
  }

  if (trackShare.value && payload.jobId) {
    try {
      await jobsApi.trackShare(payload.jobId)
      emit('shared', { jobId: payload.jobId })
    } catch (e) {
      console.warn('Share tracking failed:', e)
    }
  } else {
    emit('shared', { jobId: payload.jobId })
  }

  setTimeout(() => close(), 300)
}

function domainFromUrl(url) {
  try {
    const u = new URL(url)
    return u.host + u.pathname
  } catch (e) {
    return url
  }
}

function truncate(str, n) {
  if (!str) return ''
  const clean = String(str).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return clean.length > n ? clean.slice(0, n).trimEnd() + '…' : clean
}

defineExpose({ open, close })
</script>

<style scoped>
.sl-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(6px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  animation: fade 0.15s ease;
}
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }

.sl-modal {
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.3);
  color: #1e293b;
  animation: pop 0.2s ease;
}
body.dark-mode .sl-modal {
  background: rgba(20, 16, 46, 0.97);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border-color: rgba(167, 139, 250, 0.22);
  color: #e2e8f0;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6), 0 0 60px rgba(124, 58, 237, 0.25);
}
@keyframes pop { from { transform: scale(0.96); opacity: 0 } to { transform: scale(1); opacity: 1 } }

.sl-head {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
body.dark-mode .sl-head { border-bottom-color: rgba(255, 255, 255, 0.06); }

.sl-head-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.sl-linkedin-icon {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  background: #0A66C2;
  color: #fff;
  font-weight: 800;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  letter-spacing: -0.02em;
}
.sl-head h3 { margin: 0; font-size: 1rem; font-weight: 600; }

.sl-close {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #334155;
  cursor: pointer;
  font-size: 0.9rem;
}
.sl-close:hover { background: #f1f5f9; }
body.dark-mode .sl-close {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(167, 139, 250, 0.18);
  color: #cbd5e1;
}

.sl-body {
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sl-preview {
  display: flex;
  gap: 1rem;
  padding: 0.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f9fafb;
}
body.dark-mode .sl-preview {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
}

.sl-preview-image {
  width: 90px;
  height: 90px;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  flex-shrink: 0;
}

.sl-preview-content { flex: 1; min-width: 0; }

.sl-preview-domain {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body.dark-mode .sl-preview-domain { color: #94a3b8; }

.sl-preview-title {
  margin: 0 0 0.35rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #0f172a;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
body.dark-mode .sl-preview-title { color: #f1f5f9; }

.sl-preview-desc {
  margin: 0;
  font-size: 0.8rem;
  color: #475569;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
body.dark-mode .sl-preview-desc { color: #94a3b8; }

.sl-preview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
  font-size: 0.72rem;
  color: #64748b;
}
body.dark-mode .sl-preview-meta { color: #94a3b8; }

.sl-url-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.sl-url-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #64748b;
  font-weight: 600;
}
body.dark-mode .sl-url-label { color: #94a3b8; }

.sl-url-box { display: flex; gap: 0.4rem; }
.sl-url-input {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border-radius: 10px;
  background: #f9fafb;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-size: 0.82rem;
  font-family: ui-monospace, monospace;
  outline: none;
  min-width: 0;
}
body.dark-mode .sl-url-input {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(167, 139, 250, 0.18);
  color: #cbd5e1;
}
.sl-copy-btn {
  padding: 0.6rem 1rem;
  border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  border: none;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.sl-copy-btn:hover { filter: brightness(1.1); }

.sl-options { display: flex; flex-direction: column; gap: 0.6rem; }
.sl-checkbox {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.83rem;
  cursor: pointer;
  color: #334155;
}
body.dark-mode .sl-checkbox { color: #cbd5e1; }
.sl-checkbox input {
  width: 16px;
  height: 16px;
  accent-color: #0A66C2;
  cursor: pointer;
}

.sl-hint {
  padding: 0.9rem 1rem;
  border-radius: 10px;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  font-size: 0.8rem;
  color: #3730a3;
  line-height: 1.5;
}
body.dark-mode .sl-hint {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.3);
  color: #c7d2fe;
}
.sl-hint p { margin: 0 0 0.4rem; }
.sl-hint p:last-child { margin-bottom: 0; }
.sl-hint ol { margin: 0.4rem 0 0.6rem; padding-left: 1.3rem; }
.sl-hint li { margin-bottom: 0.2rem; }

.sl-warning {
  margin-top: 0.75rem !important;
  padding: 0.6rem 0.8rem;
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #92400e;
  font-size: 0.75rem;
}
body.dark-mode .sl-warning {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fcd34d;
}

.sl-foot {
  padding: 1rem 1.25rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
body.dark-mode .sl-foot { border-top-color: rgba(255, 255, 255, 0.06); }

.sl-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.1rem;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
  font-family: inherit;
}
.sl-btn-ghost {
  background: #ffffff;
  color: #334155;
  border-color: #e2e8f0;
}
.sl-btn-ghost:hover { background: #f8fafc; }
body.dark-mode .sl-btn-ghost {
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
  border-color: rgba(167, 139, 250, 0.18);
}
body.dark-mode .sl-btn-ghost:hover { background: rgba(255, 255, 255, 0.1); }

.sl-btn-linkedin {
  background: #0A66C2;
  color: #ffffff;
  font-weight: 600;
}
.sl-btn-linkedin:hover { background: #004182; }
.sl-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.15);
  font-size: 0.7rem;
  font-weight: 800;
}
</style>