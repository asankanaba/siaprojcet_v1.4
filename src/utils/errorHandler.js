// src/utils/errorHandler.js
import { ref } from 'vue'

export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  console.error('API Error:', error)
  
  if (error.response) {
    // Server responded with error
    return error.response.data?.message || error.response.statusText || defaultMessage
  } else if (error.request) {
    // Request made but no response
    return 'Network error - please check your internet connection'
  } else {
    // Something else happened
    return error.message || defaultMessage
  }
}

export const formatError = (error) => {
  if (typeof error === 'string') return error
  if (error.response) return handleApiError(error)
  if (error.message) return error.message
  return 'An unknown error occurred'
}

export class AppError extends Error {
  constructor(message, status = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.details = details
  }
}

export const createErrorHandler = (toast) => {
  return (error) => {
    const message = formatError(error)
    
    if (toast) {
      toast.error(message)
    } else {
      console.error(message)
    }
    
    return message
  }
}