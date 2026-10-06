<template>
  <nav class="navbar glass-navbar">
    <!-- Left -->
    <div class="navbar-left">
      <span class="brand">Smart POS</span>
    </div>

    <!-- Center -->
    <div class="navbar-center">
      <span class="version">v1.4</span>
    </div>

    <!-- Right -->
    <div class="navbar-right">
      <!-- 🎭 DEMO ROLE PREVIEW TOGGLE -->
      <RolePreviewToggle />

      <!-- Notifications -->
      <div ref="notifRef" class="notif-wrapper">
        <button
          @click="toggleDropdown"
          class="nav-btn notif-btn"
          :class="{ 'has-unread': hasUnread }"
          aria-label="Notifications"
        >
          <i class="fas fa-bell"></i>
          <span v-if="hasUnread" class="notif-badge">{{ badgeCount }}</span>
        </button>

        <div v-if="isOpen" class="notif-dropdown glass-panel">
          <div class="dropdown-header">
            <span class="dropdown-title">
              <i class="fas fa-bell"></i> Notifications
            </span>
            <div class="dropdown-actions">
              <button v-if="hasUnread" @click="handleMarkAllRead" class="link-btn">
                Mark all read
              </button>
              <button @click="isOpen = false" class="close-btn">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div class="dropdown-body">
            <div v-if="loading" class="state-loading">
              <div class="spinner"></div>
              <span>Loading...</span>
            </div>

            <div v-else-if="!items.length" class="state-empty">
              <i class="fas fa-bell-slash"></i>
              <p>No notifications</p>
              <span class="hint">You're all caught up!</span>
            </div>

            <div
              v-for="item in recentItems"
              :key="item.id"
              class="notif-item"
              :class="{
                'unread': !item.is_read,
                [item.severity || 'info']: true
              }"
              @click="handleItemClick(item)"
            >
              <div class="notif-icon" :class="item.severity || 'info'">
                <i :class="getIcon(item.type)"></i>
              </div>
              <div class="notif-content">
                <div class="notif-title">{{ item.title }}</div>
                <div class="notif-message">{{ truncate(item.message, 60) }}</div>
                <div class="notif-time">{{ timeAgo(item.created_at) }}</div>
              </div>
              <button
                v-if="!item.is_read"
                @click.stop="handleMarkRead(item.id)"
                class="mark-btn"
                title="Mark as read"
              >
                <i class="fas fa-check-circle"></i>
              </button>
            </div>
          </div>

          <div class="dropdown-footer">
            <router-link to="/hr/notifications" class="view-all" @click="isOpen = false">
              View All <i class="fas fa-arrow-right"></i>
            </router-link>
          </div>
        </div>
      </div>

      <!-- User Menu -->
      <div ref="userRef" class="user-wrapper">
        <button @click="toggleUserMenu" class="user-btn">
          <div class="avatar">
            <img v-if="profilePictureUrl" :src="profilePictureUrl" alt="Profile" />
            <span v-else>{{ initials }}</span>
          </div>
          <span class="user-name">{{ fullName }}</span>
          <i class="fas fa-chevron-down" :class="{ rotated: isUserOpen }"></i>
        </button>

        <div v-if="isUserOpen" class="user-dropdown glass-panel">
          <div class="user-info">
            <div class="avatar-lg">
              <img v-if="profilePictureUrl" :src="profilePictureUrl" alt="Profile" />
              <span v-else>{{ initials }}</span>
            </div>
            <div>
              <div class="user-fullname">{{ fullName }}</div>
              <div class="user-role">{{ role }}</div>
            </div>
          </div>
          <hr class="divider" />
          <router-link to="/profile" class="dropdown-item" @click="isUserOpen = false">
            <i class="fas fa-user"></i> Profile
          </router-link>
          <hr class="divider" />
          <button @click="handleLogout" class="dropdown-item logout">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useHRNotificationsStore } from '@/stores/hrNotifications'
import { getProfilePicture } from '@/utils/imageHelper'
import RolePreviewToggle from './RolePreviewToggle.vue'   // 🎭 DEMO TOGGLE
import Swal from 'sweetalert2'

const emit = defineEmits(['toggle-sidebar'])
const router = useRouter()

const authStore = useAuthStore()
const notifStore = useHRNotificationsStore()

const notifRef = ref(null)
const userRef = ref(null)
const isOpen = ref(false)
const isUserOpen = ref(false)
let intervalId = null

// -------- Computed --------
const fullName = computed(() => authStore.user?.full_name || 'User')
const initials = computed(() =>
  fullName.value.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
)
const role = computed(() => {
  const r = authStore.user?.role || 'Staff'
  return r.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
})

const profilePictureUrl = computed(() => {
  const p = authStore.user?.profile_picture
  return p ? getProfilePicture(p) : null
})

const items = computed(() => notifStore.items)
const unreadCount = computed(() => notifStore.unreadCount)
const loading = computed(() => notifStore.loading)
const hasUnread = computed(() => unreadCount.value > 0)
const badgeCount = computed(() => (unreadCount.value > 99 ? '99+' : unreadCount.value))
const recentItems = computed(() => items.value.slice(0, 10))

// -------- Methods --------
const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  isUserOpen.value = false
  if (isOpen.value) fetchNotifications()
}

const toggleUserMenu = () => {
  isUserOpen.value = !isUserOpen.value
  isOpen.value = false
}

const fetchNotifications = async () => {
  await notifStore.fetch(20)
}

const handleMarkRead = async (id) => {
  try { await notifStore.markRead(id) } catch (e) {}
}

const handleMarkAllRead = async () => {
  try { await notifStore.markAllRead() } catch (e) {}
}

const handleItemClick = async (item) => {
  if (!item.is_read) await handleMarkRead(item.id)
}

const handleLogout = async () => {
  isUserOpen.value = false
  const result = await Swal.fire({
    title: 'Logout?',
    text: 'Are you sure you want to logout?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Logout',
    cancelButtonText: 'Cancel'
  })

  if (result.isConfirmed) {
    authStore.logout()
    router.push('/login')
  }
}

const getIcon = (type = 'info') => {
  const map = {
    attendance: 'fas fa-clock',
    alert: 'fas fa-exclamation-triangle',
    reminder: 'fas fa-bell',
    leave: 'fas fa-calendar-alt',
    payroll: 'fas fa-wallet',
    salary: 'fas fa-money-bill-wave',
    success: 'fas fa-check-circle',
    warning: 'fas fa-exclamation-circle',
    info: 'fas fa-info-circle'
  }
  return map[type] || 'fas fa-bell'
}

const timeAgo = (date) => {
  if (!date) return 'Just now'
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago'
  if (diff < 2592000) return Math.floor(diff / 604800) + 'w ago'
  return new Date(date).toLocaleDateString()
}

const truncate = (text, max = 60) =>
  !text ? '' : (text.length > max ? text.substring(0, max) + '...' : text)

const handleClickOutside = (e) => {
  if (notifRef.value && !notifRef.value.contains(e.target)) isOpen.value = false
  if (userRef.value && !userRef.value.contains(e.target)) isUserOpen.value = false
}

// -------- Lifecycle --------
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  fetchNotifications()
  intervalId = setInterval(fetchNotifications, 30000)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (intervalId) clearInterval(intervalId)
})
</script>

<style scoped>
/* ============================================
   NAVBAR — Liquid Glass
   ============================================ */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  height: 64px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-left { display: flex; align-items: center; gap: 1rem; }
.navbar-center { display: flex; align-items: center; }

.brand {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: -0.01em;
}
body.dark-mode .brand { color: #f1f5f9; }

.version {
  font-size: 0.7rem;
  color: #6b7280;
  background: rgba(255,255,255,0.5);
  padding: 0.15rem 0.55rem;
  border-radius: 50px;
  border: 1px solid rgba(255,255,255,0.6);
  backdrop-filter: blur(8px);
}
body.dark-mode .version {
  background: rgba(255,255,255,0.06);
  color: #cbd5e1;
  border-color: rgba(255,255,255,0.12);
}

.navbar-right { display: flex; align-items: center; gap: 1rem; }

.nav-btn {
  background: none;
  border: none;
  color: #4b5563;
  cursor: pointer;
  padding: 0.5rem 0.7rem;
  border-radius: 10px;
  transition: all 0.2s ease;
  font-size: 1.05rem;
}
.nav-btn:hover {
  background: rgba(255,255,255,0.55);
  color: #4f46e5;
  transform: translateY(-1px);
}
body.dark-mode .nav-btn { color: #cbd5e1; }
body.dark-mode .nav-btn:hover {
  background: rgba(124, 58, 237, 0.15);
  color: #a78bfa;
}

/* -------- Notifications -------- */
.notif-wrapper { position: relative; }
.notif-btn { position: relative; }
.notif-btn.has-unread { color: #4f46e5; }
body.dark-mode .notif-btn.has-unread { color: #a78bfa; }

.notif-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  border-radius: 50%;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  min-width: 18px;
  text-align: center;
  line-height: 1.2;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.45);
}

.notif-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 420px;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 18px;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
}
body.dark-mode .dropdown-header { border-bottom-color: rgba(255,255,255,0.08); }

.dropdown-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #1a1a2e;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
body.dark-mode .dropdown-title { color: #f1f5f9; }

.dropdown-actions { display: flex; align-items: center; gap: 0.5rem; }

.link-btn {
  background: none;
  border: none;
  color: #4f46e5;
  font-size: 0.75rem;
  cursor: pointer;
  font-weight: 600;
}
.link-btn:hover { text-decoration: underline; }
body.dark-mode .link-btn { color: #a78bfa; }

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
}
.close-btn:hover { background: rgba(0,0,0,0.05); }
body.dark-mode .close-btn:hover { background: rgba(255,255,255,0.08); }

.dropdown-body { flex: 1; overflow-y: auto; max-height: 350px; }

.state-loading,
.state-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
  color: #6b7280;
  gap: 0.5rem;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0,0,0,0.1);
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
body.dark-mode .spinner {
  border-color: rgba(255,255,255,0.15);
  border-top-color: #a78bfa;
}
@keyframes spin { to { transform: rotate(360deg); } }

.state-empty i { font-size: 2.5rem; color: #d1d5db; margin-bottom: 0.5rem; }
body.dark-mode .state-empty i { color: #475569; }
.state-empty p { margin: 0; font-weight: 500; }
.hint { font-size: 0.8rem; color: #9ca3af; }

.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  cursor: pointer;
  transition: background 0.15s;
}
body.dark-mode .notif-item { border-bottom-color: rgba(255,255,255,0.05); }

.notif-item:hover { background: rgba(255,255,255,0.35); }
body.dark-mode .notif-item:hover { background: rgba(255,255,255,0.04); }

.notif-item.unread { background: rgba(79, 70, 229, 0.06); }
body.dark-mode .notif-item.unread { background: rgba(124, 58, 237, 0.12); }

.notif-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.notif-icon.success { background: #d1fae5; color: #059669; }
.notif-icon.info    { background: #e0e7ff; color: #4f46e5; }
.notif-icon.warning { background: #fef3c7; color: #d97706; }
.notif-icon.error   { background: #fee2e2; color: #dc2626; }

body.dark-mode .notif-icon.success { background: rgba(16,185,129,0.18); color: #34d399; }
body.dark-mode .notif-icon.info    { background: rgba(124,58,237,0.2); color: #a78bfa; }
body.dark-mode .notif-icon.warning { background: rgba(245,158,11,0.18); color: #fbbf24; }
body.dark-mode .notif-icon.error   { background: rgba(239,68,68,0.18); color: #f87171; }

.notif-content { flex: 1; min-width: 0; }

.notif-title {
  font-weight: 600;
  font-size: 0.85rem;
  color: #1f2937;
}
body.dark-mode .notif-title { color: #f1f5f9; }

.notif-message {
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
body.dark-mode .notif-message { color: #94a3b8; }

.notif-time { font-size: 0.65rem; color: #9ca3af; margin-top: 0.15rem; }
body.dark-mode .notif-time { color: #64748b; }

.mark-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  font-size: 0.9rem;
  flex-shrink: 0;
  transition: all 0.15s;
}
.mark-btn:hover { color: #4f46e5; background: rgba(79,70,229,0.1); }
body.dark-mode .mark-btn:hover { color: #a78bfa; background: rgba(124,58,237,0.2); }

.dropdown-footer {
  padding: 0.6rem 1rem;
  border-top: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
}
body.dark-mode .dropdown-footer { border-top-color: rgba(255,255,255,0.08); }

.view-all {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem;
  color: #4f46e5;
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  border-radius: 8px;
  transition: background 0.2s;
}
.view-all:hover { background: rgba(79,70,229,0.08); }
body.dark-mode .view-all { color: #a78bfa; }
body.dark-mode .view-all:hover { background: rgba(124,58,237,0.15); }

/* -------- User Menu -------- */
.user-wrapper { position: relative; }

.user-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.4);
  border: 1px solid rgba(255,255,255,0.6);
  cursor: pointer;
  padding: 0.3rem 0.7rem 0.3rem 0.3rem;
  border-radius: 999px;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}
.user-btn:hover {
  background: rgba(255,255,255,0.65);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}
body.dark-mode .user-btn {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.1);
}
body.dark-mode .user-btn:hover {
  background: rgba(124,58,237,0.15);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(79,70,229,0.3);
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }

.user-name { font-size: 0.85rem; font-weight: 600; color: #1f2937; }
body.dark-mode .user-name { color: #e2e8f0; }

.user-btn .fa-chevron-down {
  font-size: 0.7rem;
  color: #6b7280;
  transition: transform 0.2s;
}
.user-btn .fa-chevron-down.rotated { transform: rotate(180deg); }

.user-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  width: 240px;
  border-radius: 18px;
  overflow: hidden;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
}

.avatar-lg {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1rem;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 2px 10px rgba(79,70,229,0.35);
}
.avatar-lg img { width: 100%; height: 100%; object-fit: cover; }

.user-fullname { font-weight: 600; font-size: 0.9rem; color: #1f2937; }
body.dark-mode .user-fullname { color: #f1f5f9; }

.user-role { font-size: 0.75rem; color: #6b7280; }
body.dark-mode .user-role { color: #94a3b8; }

.divider {
  border: none;
  border-top: 1px solid rgba(0,0,0,0.06);
  margin: 0.15rem 0;
}
body.dark-mode .divider { border-top-color: rgba(255,255,255,0.08); }

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  color: #1f2937;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: background 0.15s;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-align: left;
}
body.dark-mode .dropdown-item { color: #e2e8f0; }

.dropdown-item:hover { background: rgba(79,70,229,0.08); }
body.dark-mode .dropdown-item:hover { background: rgba(124,58,237,0.15); }

.dropdown-item.logout { color: #ef4444; }
.dropdown-item.logout:hover { background: rgba(239,68,68,0.1); }

/* -------- Responsive -------- */
@media (max-width: 768px) {
  .navbar { padding: 0 0.75rem; }
  .user-name { display: none; }
  .notif-dropdown {
    width: calc(100vw - 24px);
    right: -10px;
    max-height: 80vh;
  }
  .brand { font-size: 0.95rem; }
}
</style>