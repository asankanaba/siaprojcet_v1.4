// ============================================
// 📁 stores/hrNotifications.js
// 🔔 Notifications store — JWT-based (no user_id param)
// ============================================
import { defineStore } from 'pinia'
import api from '@/api/index.js'

export const useHRNotificationsStore = defineStore('hrNotifications', {
  state: () => ({
    items: [],
    unreadCount: 0,
    loading: false,
    error: null
  }),

  getters: {
    all: (state) => state.items,
    unread: (state) => state.items.filter(n => !n.is_read),
    recent: (state) => state.items.slice(0, 5),
    hasUnread: (state) => state.unreadCount > 0
  },

  actions: {
    /**
     * Fetch notifications for the current user (JWT identifies them).
     * @param {number} limit
     */
    async fetch(limit = 20) {
      this.loading = true
      this.error = null

      try {
        const { data } = await api.get(`/notifications.php?limit=${limit}`)

        if (data?.success) {
          this.items = data.data || []
          this.unreadCount = data.unread_count || 0
        } else if (Array.isArray(data)) {
          this.items = data
          this.unreadCount = data.filter(n => !n.is_read).length
        } else {
          this.items = []
          this.unreadCount = 0
        }
      } catch (err) {
        this.error = err.message
        // Don't wipe existing items on error — just log
        console.error('[Notifications] Fetch failed:', err?.response?.status, err?.message)
      } finally {
        this.loading = false
      }
    },

    /**
     * Mark one notification as read.
     * @param {number} notificationId
     */
    async markRead(notificationId) {
      try {
        const { data } = await api.put('/notifications.php', {
          notification_id: notificationId
        })

        if (data?.success) {
          const item = this.items.find(n => n.id === notificationId)
          if (item && !item.is_read) {
            item.is_read = 1
            this.unreadCount = Math.max(0, this.unreadCount - 1)
          }
        }
        return data
      } catch (err) {
        console.error('[Notifications] markRead failed:', err)
        throw err
      }
    },

    /**
     * Mark all as read.
     */
    async markAllRead() {
      try {
        const { data } = await api.put('/notifications.php', {})
        if (data?.success) {
          this.items.forEach(n => n.is_read = 1)
          this.unreadCount = 0
        }
        return data
      } catch (err) {
        console.error('[Notifications] markAllRead failed:', err)
        throw err
      }
    },

    /**
     * Delete a notification.
     */
    async remove(notificationId) {
      try {
        const { data } = await api.delete(`/notifications.php?id=${notificationId}`)
        if (data?.success) {
          const idx = this.items.findIndex(n => n.id === notificationId)
          if (idx !== -1) {
            if (!this.items[idx].is_read) {
              this.unreadCount = Math.max(0, this.unreadCount - 1)
            }
            this.items.splice(idx, 1)
          }
        }
        return data
      } catch (err) {
        console.error('[Notifications] remove failed:', err)
        throw err
      }
    },

    /**
     * Send a notification (admin only).
     */
    async send(userId, title, message, type = 'info', severity = 'info') {
      try {
        const { data } = await api.post('/notifications.php', {
          user_id: userId,
          title,
          message,
          type,
          severity
        })
        return data
      } catch (err) {
        console.error('[Notifications] send failed:', err)
        throw err
      }
    },

    reset() {
      this.items = []
      this.unreadCount = 0
      this.loading = false
      this.error = null
    }
  }
})