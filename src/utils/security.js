import Swal from 'sweetalert2'

// CSRF Protection - Get token from cookie
export const getCSRFToken = () => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/)
  return match ? match[1] : null
}

// Session Management
export const checkSession = () => {
  const session = localStorage.getItem('session_data')
  if (session) {
    try {
      const data = JSON.parse(session)
      const expiry = new Date(data.expiry)
      if (new Date() > expiry) {
        localStorage.removeItem('session_data')
        localStorage.removeItem('user')
        return false
      }
      return true
    } catch (e) {
      return false
    }
  }
  return false
}

// Input Sanitization
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Role-based permission check
export const hasPermission = (userRole, requiredRole) => {
  const roleHierarchy = {
    'super_admin': 5,
    'admin': 4,
    'hr': 3,
    'finance': 3,
    'staff': 2,
    'cashier': 1
  }
  
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[requiredRole] || 0)
}

// Rate Limiting
export const rateLimit = (key, limit = 10, window = 60000) => {
  const now = Date.now()
  const data = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '{"count":0,"reset":0}')
  
  if (now > data.reset) {
    data.count = 0
    data.reset = now + window
  }
  
  data.count++
  localStorage.setItem(`rate_limit_${key}`, JSON.stringify(data))
  
  return data.count <= limit
}

// ============================================
// SWEETALERT FUNCTIONS
// ============================================

// Confirm Dialog
export const showConfirm = async (title, text, icon = 'warning') => {
  return await Swal.fire({
    title: title,
    text: text,
    icon: icon,
    showCancelButton: true,
    confirmButtonColor: '#4F46E5',
    cancelButtonColor: '#EF4444',
    confirmButtonText: 'Yes, confirm!',
    cancelButtonText: 'Cancel'
  })
}

// Success Dialog
export const showSuccess = (title, text) => {
  return Swal.fire({
    title: title,
    text: text,
    icon: 'success',
    confirmButtonColor: '#10B981',
    confirmButtonText: 'OK',
    timer: 3000,
    timerProgressBar: true
  })
}

// Error Dialog
export const showError = (title, text) => {
  return Swal.fire({
    title: title,
    text: text,
    icon: 'error',
    confirmButtonColor: '#EF4444',
    confirmButtonText: 'OK'
  })
}

// Info Dialog
export const showInfo = (title, text) => {
  return Swal.fire({
    title: title,
    text: text,
    icon: 'info',
    confirmButtonColor: '#3B82F6',
    confirmButtonText: 'OK'
  })
}

// Warning Dialog
export const showWarning = (title, text) => {
  return Swal.fire({
    title: title,
    text: text,
    icon: 'warning',
    confirmButtonColor: '#F59E0B',
    confirmButtonText: 'OK'
  })
}

// Loading Dialog
export const showLoading = (title = 'Processing...') => {
  return Swal.fire({
    title: title,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    }
  })
}

// Close Loading
export const closeLoading = () => {
  Swal.close()
}

// Toast Notification
export const showToast = (icon, title, timer = 3000) => {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: timer,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer)
      toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
  })
  
  Toast.fire({
    icon: icon,
    title: title
  })
}

// DataTable initialization helper
export const initDataTable = (tableId, options = {}) => {
  return {
    responsive: true,
    pageLength: 10,
    lengthMenu: [[10, 25, 50, -1], [10, 25, 50, 'All']],
    ...options
  }
}