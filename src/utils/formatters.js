// src/utils/formatters.js
import { config } from '../config'

export const formatCurrency = (amount) => {
  return config.currencySymbol + Number(amount).toFixed(2)
}

export const formatDate = (date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString(config.dateFormat, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const formatPhoneNumber = (phone) => {
  if (!phone) return 'N/A'
  // Format: 0912 345 6789
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
  }
  return phone
}

export const formatRole = (role) => {
  const labels = {
    'super_admin': 'Super Admin',
    'admin': 'Admin',
    'hr': 'HR',
    'finance': 'Finance',
    'cashier': 'Cashier',
    'staff': 'Staff'
  }
  return labels[role] || role
}

export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}