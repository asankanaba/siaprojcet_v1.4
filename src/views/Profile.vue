<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="profile-container">
          <!-- Header -->
          <div class="profile-header">
            <div>
              <h2><i class="fas fa-user-circle"></i> My Profile</h2>
              <p>View your personal information</p>
            </div>
          </div>

          <!-- Profile Card -->
          <div class="profile-card">
            <!-- Avatar Section -->
            <div class="profile-avatar-section">
              <div class="avatar-wrapper">
                <div class="avatar-circle">
                  <img 
                    v-if="profilePictureUrl" 
                    :src="profilePictureUrl" 
                    alt="Profile" 
                  />
                  <span v-else>{{ userInitials }}</span>
                </div>
              </div>
              <div class="avatar-role-badge" :style="{ backgroundColor: roleColor }">
                {{ roleLabel }}
              </div>
            </div>

            <!-- Information -->
            <div class="profile-info">
              <div class="info-row">
                <div class="info-label">
                  <i class="fas fa-user"></i> Full Name
                </div>
                <div class="info-value">{{ user?.full_name || user?.name || 'N/A' }}</div>
              </div>
              <div class="info-row">
                <div class="info-label">
                  <i class="fas fa-user-tag"></i> Username
                </div>
                <div class="info-value">{{ user?.username || 'N/A' }}</div>
              </div>
              <div class="info-row">
                <div class="info-label">
                  <i class="fas fa-envelope"></i> Email
                </div>
                <div class="info-value">{{ user?.email || 'N/A' }}</div>
              </div>
              <div class="info-row">
                <div class="info-label">
                  <i class="fas fa-phone"></i> Phone
                </div>
                <div class="info-value">{{ user?.phone || 'Not provided' }}</div>
              </div>
              <div class="info-row">
                <div class="info-label">
                  <i class="fas fa-briefcase"></i> Primary Role
                </div>
                <div class="info-value">
                  <span :class="getRoleClass(user?.role)">
                    {{ getRoleLabel(user?.role) }}
                  </span>
                </div>
              </div>
              <div class="info-row" v-if="allRoles.length > 1">
                <div class="info-label">
                  <i class="fas fa-tags"></i> All Roles
                </div>
                <div class="info-value">
                  <div class="role-tags">
                    <span 
                      v-for="role in allRoles" 
                      :key="role"
                      class="role-tag"
                      :style="{ 
                        backgroundColor: getRoleColor(role) + '20', 
                        color: getRoleColor(role),
                        borderColor: getRoleColor(role)
                      }"
                    >
                      <i :class="getRoleIcon(role)"></i>
                      {{ getRoleLabel(role) }}
                      <span v-if="role === user?.role" class="primary-badge">Primary</span>
                    </span>
                  </div>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">
                  <i class="fas fa-building"></i> Department
                </div>
                <div class="info-value">{{ user?.department || 'Not assigned' }}</div>
              </div>
              <div class="info-row">
                <div class="info-label">
                  <i class="fas fa-calendar-check"></i> Status
                </div>
                <div class="info-value">
                  <span :class="getStatusClass(user?.status)">
                    {{ (user?.status || 'Active').toUpperCase() }}
                  </span>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">
                  <i class="fas fa-clock"></i> Joined
                </div>
                <div class="info-value">{{ formatDate(user?.created_at) }}</div>
              </div>
            </div>

            <!-- Actions -->
            <div class="profile-actions">
              <button @click="goToEditProfile" class="btn btn-primary">
                <i class="fas fa-edit"></i> Edit Profile
              </button>
              <button @click="handleLogout" class="btn btn-danger">
                <i class="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore, ROLE_CONFIG } from '@/stores/auth';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
import Swal from 'sweetalert2';

const router = useRouter();
const authStore = useAuthStore();

const user = computed(() => authStore.user);

// ✅ Profile picture URL computed property
const profilePictureUrl = computed(() => {
  if (!user.value) return null;
  if (user.value.profile_picture) {
    // If it's a full URL or path starting with http or /
    if (user.value.profile_picture.startsWith('http') || user.value.profile_picture.startsWith('/')) {
      return user.value.profile_picture;
    }
    // If it's just a filename, assume it's in the uploads directory
    // Use the API base URL
    const apiBase = 'http://localhost/smart-pos-api';
    return `${apiBase}/uploads/profiles/${user.value.profile_picture}`;
  }
  return null;
});

// Get all roles (primary + additional)
const allRoles = computed(() => {
  if (!user.value) return [];
  const roles = [user.value.role];
  
  if (user.value.roles) {
    let additionalRoles = [];
    if (typeof user.value.roles === 'string') {
      try {
        const parsed = JSON.parse(user.value.roles);
        if (Array.isArray(parsed)) {
          additionalRoles = parsed;
        }
      } catch (e) {}
    } else if (Array.isArray(user.value.roles)) {
      additionalRoles = user.value.roles;
    }
    
    additionalRoles.forEach(r => {
      if (!roles.includes(r)) roles.push(r);
    });
  }
  
  return roles;
});

const userInitials = computed(() => {
  const name = user.value?.full_name || user.value?.name || 'User';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
});

const roleLabel = computed(() => {
  return ROLE_CONFIG.roles[user.value?.role]?.label || user.value?.role || 'Staff';
});

const roleColor = computed(() => {
  return ROLE_CONFIG.roles[user.value?.role]?.color || '#6B7280';
});

// Role helpers
const getRoleLabel = (role) => {
  return ROLE_CONFIG.roles[role]?.label || role || 'Staff';
};

const getRoleIcon = (role) => {
  return ROLE_CONFIG.roles[role]?.icon || 'fas fa-user';
};

const getRoleColor = (role) => {
  return ROLE_CONFIG.roles[role]?.color || '#6B7280';
};

const getRoleClass = (role) => {
  const classes = {
    'super_admin': 'role-super-admin',
    'admin': 'role-admin',
    'hr': 'role-hr',
    'finance': 'role-finance',
    'supply_chain': 'role-supply-chain',
    'staff': 'role-staff',
    'cashier': 'role-cashier'
  };
  return classes[role] || 'role-staff';
};

const getStatusClass = (status) => {
  if (status === 'archived') return 'status-archived';
  if (status === 'inactive') return 'status-inactive';
  return 'status-active';
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const goToEditProfile = () => {
  router.push('/profile/edit');
};

const handleLogout = async () => {
  const result = await Swal.fire({
    title: 'Logout?',
    text: 'Are you sure you want to logout?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Logout',
    cancelButtonText: 'Cancel'
  });

  if (result.isConfirmed) {
    authStore.logout();
    router.push('/login');
  }
};
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.page-content {
  padding: 0;
  background: #f1f5f9;
  flex: 1;
}

body.dark-mode .page-content {
  background: #0f172a;
}

.profile-container {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
}

.profile-header {
  margin-bottom: 2rem;
}

.profile-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

body.dark-mode .profile-header h2 {
  color: #e2e8f0;
}

.profile-header p {
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

body.dark-mode .profile-header p {
  color: #9ca3af;
}

.profile-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

body.dark-mode .profile-card {
  background: #1e293b;
}

.profile-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;
}

.avatar-wrapper {
  position: relative;
}

.avatar-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4F46E5, #7C3AED);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  overflow: hidden;
}

.avatar-circle img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-role-badge {
  padding: 0.25rem 1rem;
  border-radius: 20px;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 0.75rem;
}

.profile-info {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.info-row {
  display: grid;
  grid-template-columns: 150px 1fr;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

body.dark-mode .info-row {
  border-bottom-color: #2d3748;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.85rem;
}

body.dark-mode .info-label {
  color: #9ca3af;
}

.info-label i {
  width: 1.2rem;
  margin-right: 0.5rem;
}

.info-value {
  color: #1f2937;
  font-size: 0.9rem;
}

body.dark-mode .info-value {
  color: #e2e8f0;
}

.role-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.role-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.6rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid;
}

.primary-badge {
  font-size: 0.5rem;
  background: #4F46E5;
  color: white;
  padding: 0.05rem 0.3rem;
  border-radius: 8px;
  font-weight: 700;
}

.role-super-admin {
  background: #ede9fe;
  color: #5b21b6;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

.role-admin {
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

.role-hr {
  background: #fce7f3;
  color: #831843;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

.role-finance {
  background: #d1fae5;
  color: #065f46;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

.role-supply-chain {
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

.role-staff {
  background: #f3f4f6;
  color: #374151;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

.role-cashier {
  background: #fef3c7;
  color: #92400e;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.7rem;
  font-weight: 600;
  display: inline-block;
}

.status-active {
  background: #d1fae5;
  color: #065f46;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-block;
}

.status-inactive {
  background: #fef3c7;
  color: #92400e;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-block;
}

.status-archived {
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.15rem 0.5rem;
  border-radius: 50px;
  font-size: 0.65rem;
  font-weight: 600;
  display: inline-block;
}

.profile-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

body.dark-mode .profile-actions {
  border-top-color: #2d3748;
}

.btn {
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #4F46E5;
  color: white;
}

.btn-primary:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}

.btn-danger {
  background: #EF4444;
  color: white;
}

.btn-danger:hover {
  background: #DC2626;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(239,68,68,0.3);
}

@media (max-width: 768px) {
  .profile-container {
    padding: 1rem;
  }
  
  .profile-card {
    padding: 1.5rem;
  }
  
  .info-row {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
  
  .profile-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>