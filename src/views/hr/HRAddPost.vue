<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="d-flex justify-content-between align-center mb-4">
          <div>
            <h4 style="font-weight:700;"><i class="fas fa-plus-circle"></i> {{ isEditing ? 'Edit' : 'Add New' }} Job Post</h4>
            <p class="text-muted">{{ isEditing ? 'Update existing job posting' : 'Create a new job posting for recruitment' }}</p>
          </div>
          <span class="badge" style="background:#EC4899;color:white;padding:0.5rem 1rem;">
            <i class="fas fa-users-cog"></i> HR
          </span>
        </div>

        <div class="card">
          <form @submit.prevent="submitJobPost">
            <div class="row g-3">
              <div class="col-md-12">
                <div class="form-group">
                  <label class="form-label">Job Title <span style="color:red;">*</span></label>
                  <input v-model="form.title" type="text" class="form-control" placeholder="e.g., Senior Backend Engineer" required />
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label class="form-label">Department <span style="color:red;">*</span></label>
                  <select v-model="form.department" class="form-control" required>
                    <option value="">Select Department</option>
                    <option value="engineering">Engineering</option>
                    <option value="frontend">Frontend</option>
                    <option value="backend">Backend</option>
                    <option value="design">Design</option>
                    <option value="marketing">Marketing</option>
                    <option value="sales">Sales</option>
                    <option value="hr">Human Resources</option>
                    <option value="finance">Finance</option>
                    <option value="operations">Operations</option>
                    <option value="customer_service">Customer Service</option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label class="form-label">Salary Range</label>
                  <input v-model="form.salary_range" type="text" class="form-control" placeholder="e.g., ₱50,000 - ₱80,000" />
                </div>
              </div>
              <div class="col-md-12">
                <div class="form-group">
                  <label class="form-label">Job Description <span style="color:red;">*</span></label>
                  <textarea v-model="form.description" class="form-control" rows="4" placeholder="Describe the job responsibilities..." required></textarea>
                </div>
              </div>
              <div class="col-md-12">
                <div class="form-group">
                  <label class="form-label">Requirements</label>
                  <textarea v-model="form.requirements" class="form-control" rows="3" placeholder="List the job requirements..."></textarea>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label class="form-label">Employment Type</label>
                  <select v-model="form.employment_type" class="form-control">
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label class="form-label">Status</label>
                  <select v-model="form.status" class="form-control">
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div class="col-md-12">
                <div class="d-flex gap-2">
                  <button type="submit" class="btn btn-primary" :disabled="submitting">
                    <i class="fas fa-paper-plane"></i> {{ submitting ? 'Saving...' : (isEditing ? 'Update Job' : 'Publish Job') }}
                  </button>
                  <button type="button" class="btn btn-secondary" @click="goBack">Cancel</button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
import { showSuccess, showError, showLoading, closeLoading } from '@/utils/security'
import api from '@/api'

const router = useRouter()
const route = useRoute()
const submitting = ref(false)
const isEditing = ref(false)

const form = ref({
  id: null,
  title: '',
  department: '',
  salary_range: '',
  description: '',
  requirements: '',
  employment_type: 'full_time',
  status: 'open'
})

const loadJobPost = async () => {
  const id = route.query.id
  if (id) {
    isEditing.value = true
    try {
      const response = await api.get(`/jobs.php?id=${id}`)
      if (response.data) {
        form.value = { ...response.data }
      }
    } catch (error) {
      showError('Error', 'Failed to load job post')
    }
  }
}

const submitJobPost = async () => {
  if (!form.value.title || !form.value.description) {
    showError('Error', 'Please fill in all required fields')
    return
  }

  submitting.value = true
  try {
    showLoading(isEditing.value ? 'Updating job...' : 'Publishing job...')
    
    let response
    if (isEditing.value) {
      response = await api.put(`/jobs.php?id=${form.value.id}`, form.value)
    } else {
      response = await api.post('/jobs.php', form.value)
    }
    
    closeLoading()
    if (response.data.success) {
      showSuccess('Success!', isEditing.value ? 'Job updated successfully!' : 'Job posted successfully!')
      // ✅ FIXED: Changed from '/hr/job-posts' (doesn't exist) to '/hr/jobs' (correct route)
      router.push('/hr/jobs')
    } else {
      showError('Error', response.data.message || 'Failed to save job')
    }
  } catch (error) {
    closeLoading()
    showError('Error', error.response?.data?.message || 'Failed to save job')
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  loadJobPost()
})
</script>

<style scoped>
.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
}

.form-control {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 2px solid var(--border-light);
  border-radius: 10px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  background: white;
  color: var(--text-light);
  font-family: inherit;
}

body.dark-mode .form-control {
  background: #2D3748;
  border-color: var(--border-dark);
  color: var(--text-dark);
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(79,70,229,0.1);
}

body.dark-mode .form-control:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(79,70,229,0.2);
}

textarea.form-control {
  resize: vertical;
  min-height: 60px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.btn-primary {
  background: #4F46E5;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4338CA;
}

.btn-secondary {
  background: #E5E7EB;
  color: #1F2937;
}

.btn-secondary:hover {
  background: #D1D5DB;
}

body.dark-mode .btn-secondary {
  background: #374151;
  color: #E2E8F0;
}

body.dark-mode .btn-secondary:hover {
  background: #4B5563;
}
</style>