<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">

        <!-- HEADER -->
        <div class="d-flex justify-content-between align-center mb-4">
          <div>
            <h4 style="font-weight:700;">
              <i class="fas fa-briefcase"></i> Job Posts
            </h4>
            <p class="text-muted">
              Manage all job postings
              <span v-if="jobPosts.length" class="count-badge">{{ jobPosts.length }}</span>
            </p>
          </div>
          <div class="d-flex gap-2">
            <button @click="$router.push('/hr/add-post')" class="btn btn-primary">
              <i class="fas fa-plus"></i> Add Post
            </button>
            <button @click="loadJobPosts" class="btn btn-secondary" :disabled="loading">
              <i class="fas fa-sync-alt" :class="{ spin: loading }"></i> Refresh
            </button>
          </div>
        </div>

        <!-- TABLE -->
        <div class="card">
          <div class="table-responsive">
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Salary Range</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Posted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="text-center py-4">
                    <i class="fas fa-spinner spin"></i> Loading…
                  </td>
                </tr>
                <tr v-else-if="jobPosts.length === 0">
                  <td colspan="7" class="text-center text-muted py-3">No job posts found</td>
                </tr>
                <tr v-for="job in jobPosts" :key="job.id">
                  <td><strong>{{ job.title || 'Untitled' }}</strong></td>
                  <td>{{ job.department || 'N/A' }}</td>
                  <td>{{ job.salary_range || 'N/A' }}</td>
                  <td>
                    <span class="badge" :class="job.status === 'open' ? 'badge-success' : 'badge-secondary'">
                      {{ job.status || 'draft' }}
                    </span>
                  </td>
                  <td>
                    <span class="views-pill" :title="`${job.views_count || 0} views`">
                      👁 {{ job.views_count || 0 }}
                    </span>
                  </td>
                  <td>{{ formatDate(job.created_at) }}</td>
                  <td>
                    <div class="actions-wrap">
                      <!-- Edit -->
                      <button @click="editJob(job)" class="btn btn-primary btn-sm" title="Edit">
                        <i class="fas fa-edit"></i>
                      </button>

                      <!-- Share dropdown -->
                      <div class="share-menu-wrap" ref="shareWrap">
                        <button
                          @click.stop="toggleShareMenu(job.id)"
                          class="btn btn-share btn-sm"
                          :class="{ active: openShareId === job.id }"
                          title="Share"
                        >
                          <i class="fas fa-share-alt"></i>
                        </button>
                        <div v-if="openShareId === job.id" class="share-menu" @click.stop>
                          <button class="share-item" @click="shareLinkedIn(job)">
                            <span class="share-ico">in</span>
                            <span>Share on LinkedIn</span>
                          </button>
                          <button class="share-item" @click="copyPublicLink(job)">
                            <span class="share-ico">🔗</span>
                            <span>Copy public link</span>
                          </button>
                          <button class="share-item" @click="previewPublic(job)">
                            <span class="share-ico">👁</span>
                            <span>Preview public page</span>
                          </button>
                        </div>
                      </div>

                      <!-- Toggle status -->
                      <button @click="toggleStatus(job.id, job.status)" class="btn btn-warning btn-sm" title="Toggle status">
                        <i class="fas fa-sync-alt"></i>
                      </button>

                      <!-- Delete -->
                      <button @click="deleteJob(job.id)" class="btn btn-danger btn-sm" title="Delete">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Linkedin share modal -->
        <ShareToLinkedIn
          ref="shareRef"
          @shared="onShared"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import ShareToLinkedIn from '@/components/common/ShareToLinkedIn.vue'
import api from '@/api/index.js'
import Swal from 'sweetalert2'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const jobPosts = ref([])
const openShareId = ref(null)
const shareRef = ref(null)

// ============================================================
// PUBLIC URL BASE
// ============================================================
// In dev: falls back to window.location.origin (e.g. http://192.168.12.3:5173)
// In prod (Netlify): set VITE_PUBLIC_BASE_URL in .env.production
function publicBaseUrl() {
  return (import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin).replace(/\/$/, '')
}

function publicJobUrl(job) {
  if (!job?.slug) return null
  return `${publicBaseUrl()}/careers/${job.slug}`
}

// ============================================================
// LOADING
// ============================================================
const loadJobPosts = async () => {
  loading.value = true
  try {
    const response = await api.get('/jobs.php')
    // API returns { success: true, data: [...] }
    // Old file read response.data — that's why you saw N/A
    const payload = response.data?.data ?? response.data ?? []
    jobPosts.value = Array.isArray(payload) ? payload : []
  } catch (error) {
    console.error('Error loading job posts:', error)
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error?.response?.data?.message || 'Failed to load job posts',
      confirmButtonColor: '#4F46E5',
    })
  } finally {
    loading.value = false
  }
}

const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// ============================================================
// EDIT / DELETE / TOGGLE
// ============================================================
const editJob = (job) => {
  router.push(`/hr/add-post?id=${job.id}`)
}

const deleteJob = async (id) => {
  const result = await Swal.fire({
    title: 'Delete Job?',
    text: 'Are you sure you want to delete this job post?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel',
  })

  if (result.isConfirmed) {
    try {
      await api.delete(`/jobs.php?id=${id}`)
      await Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Job post deleted successfully!',
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false,
      })
      await loadJobPosts()
    } catch (error) {
      console.error('Error deleting job post:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to delete job post',
        confirmButtonColor: '#4F46E5',
      })
    }
  }
}

const toggleStatus = async (id, currentStatus) => {
  const newStatus = currentStatus === 'open' ? 'closed' : 'open'
  const result = await Swal.fire({
    title: 'Toggle Status',
    text: `Change status to ${newStatus}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#F59E0B',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Change',
    cancelButtonText: 'Cancel',
  })

  if (result.isConfirmed) {
    try {
      await api.put(`/jobs.php?id=${id}`, { status: newStatus })
      await Swal.fire({
        icon: 'success',
        title: 'Updated!',
        text: `Job status changed to ${newStatus}`,
        confirmButtonColor: '#4F46E5',
        timer: 1500,
        showConfirmButton: false,
      })
      await loadJobPosts()
    } catch (error) {
      console.error('Error updating job status:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.response?.data?.message || 'Failed to update job status',
        confirmButtonColor: '#4F46E5',
      })
    }
  }
}

// ============================================================
// SHARE MENU
// ============================================================
function toggleShareMenu(jobId) {
  openShareId.value = openShareId.value === jobId ? null : jobId
}

function closeShareMenu() {
  openShareId.value = null
}

// Close menu on click outside
function onDocClick(e) {
  if (openShareId.value !== null) {
    // If the click wasn't inside a share menu, close
    if (!e.target.closest('.share-menu') && !e.target.closest('.btn-share')) {
      closeShareMenu()
    }
  }
}

onMounted(() => {
  loadJobPosts()
  document.addEventListener('click', onDocClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
})

// ============================================================
// SHARE ACTIONS
// ============================================================
function shareLinkedIn(job) {
  closeShareMenu()
  const url = publicJobUrl(job)
  if (!url) {
    Swal.fire({
      icon: 'warning',
      title: 'No public link',
      text: 'This job has no slug yet. Save it again to generate one.',
      confirmButtonColor: '#4F46E5',
    })
    return
  }
  // Open the reusable share dialog
  shareRef.value?.open({
    title: job.title,
    description: job.description,
    department: job.department,
    salary_range: job.salary_range,
    url,
    jobId: job.id
  })
}

async function copyPublicLink(job) {
  closeShareMenu()
  const url = publicJobUrl(job)
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    Swal.fire({
      icon: 'success',
      title: 'Copied!',
      html: `<code style="font-size:0.8rem; word-break:break-all;">${url}</code>`,
      timer: 1800,
      showConfirmButton: false,
      background: document.body.classList.contains('dark-mode') ? 'rgba(20,16,46,0.95)' : '#fff',
      color: document.body.classList.contains('dark-mode') ? '#f1f5f9' : '#1e293b',
    })
  } catch (e) {
    // Fallback: show in a prompt
    window.prompt('Copy this link:', url)
  }
}

function previewPublic(job) {
  closeShareMenu()
  const url = publicJobUrl(job)
  if (!url) return
  window.open(url, '_blank', 'noopener')
}

function onShared({ jobId }) {
  // Update local view count optimistically
  const job = jobPosts.value.find(j => j.id === jobId)
  if (job) {
    job.linkedin_share_count = (job.linkedin_share_count || 0) + 1
  }
}
</script>

<style scoped>
/* ============================================================
   Existing table styles
   ============================================================ */
.badge-success { background: #D1FAE5; color: #065F46; }
.badge-secondary { background: #F3F4F6; color: #374151; }
body.dark-mode .badge-success { background: rgba(16, 185, 129, 0.2); color: #34D399; }
body.dark-mode .badge-secondary { background: rgba(107, 114, 128, 0.2); color: #9CA3AF; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.count-badge {
  display: inline-block;
  background: rgba(79, 70, 229, 0.12);
  color: #4F46E5;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  margin-left: 0.4rem;
}
body.dark-mode .count-badge {
  background: rgba(99, 102, 241, 0.2);
  color: #a5b4fc;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.75rem;
  padding: 0.35rem 0.6rem;
  font-family: inherit;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary { background: #4F46E5; color: white; }
.btn-primary:hover:not(:disabled) { background: #4338CA; }
.btn-danger { background: #EF4444; color: white; }
.btn-danger:hover:not(:disabled) { background: #DC2626; }
.btn-warning { background: #F59E0B; color: white; }
.btn-warning:hover:not(:disabled) { background: #D97706; }
.btn-secondary { background: #E5E7EB; color: #1F2937; }
.btn-secondary:hover:not(:disabled) { background: #D1D5DB; }
body.dark-mode .btn-secondary { background: #374151; color: #E2E8F0; }
body.dark-mode .btn-secondary:hover:not(:disabled) { background: #4B5563; }

/* LinkedIn blue button */
.btn-share {
  background: linear-gradient(135deg, #0A66C2, #004182);
  color: white;
}
.btn-share:hover:not(:disabled) { filter: brightness(1.15); }
.btn-share.active { filter: brightness(1.2); }

.btn-sm { padding: 0.35rem 0.6rem; font-size: 0.75rem; }

.card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}
body.dark-mode .card {
  background: rgba(26, 22, 48, 0.55);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border-color: rgba(167, 139, 250, 0.18);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 40px rgba(124, 58, 237, 0.08);
}

.table-responsive { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; }
.table th {
  padding: 0.7rem 0.85rem;
  text-align: left;
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}
body.dark-mode .table th {
  background: rgba(255, 255, 255, 0.04);
  color: #94a3b8;
  border-bottom-color: rgba(255, 255, 255, 0.06);
}
.table td {
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
  color: #1f2937;
  vertical-align: middle;
}
body.dark-mode .table td {
  border-bottom-color: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
}
.table tr:hover td { background: #f9fafb; }
body.dark-mode .table tr:hover td { background: rgba(255, 255, 255, 0.03); }

.views-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.1);
  color: #4F46E5;
  font-size: 0.7rem;
  font-weight: 600;
}
body.dark-mode .views-pill {
  background: rgba(99, 102, 241, 0.18);
  color: #a5b4fc;
}

.text-center { text-align: center; padding: 1.5rem; color: #6b7280; }
.text-muted { color: #6b7280; }
body.dark-mode .text-muted { color: #94a3b8; }

/* ============================================================
   Actions + Share menu
   ============================================================ */
.actions-wrap {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  position: relative;
}

.share-menu-wrap {
  position: relative;
  display: inline-block;
}

.share-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 220px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.15);
  padding: 0.4rem;
  z-index: 50;
  animation: menuIn 0.12s ease;
}
body.dark-mode .share-menu {
  background: rgba(20, 16, 46, 0.98);
  -webkit-backdrop-filter: blur(30px) saturate(180%);
  backdrop-filter: blur(30px) saturate(180%);
  border-color: rgba(167, 139, 250, 0.25);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(124, 58, 237, 0.2);
}

@keyframes menuIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.share-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: none;
  background: transparent;
  color: #1e293b;
  font-size: 0.83rem;
  text-align: left;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.12s;
}
.share-item:hover { background: #f1f5f9; }
body.dark-mode .share-item { color: #e2e8f0; }
body.dark-mode .share-item:hover { background: rgba(124, 58, 237, 0.15); }

.share-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  background: rgba(10, 102, 194, 0.15);
  color: #0A66C2;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}
body.dark-mode .share-ico {
  background: rgba(10, 102, 194, 0.25);
  color: #60a5fa;
}
</style>