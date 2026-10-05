import { ref } from 'vue'

export function useLoading() {
  const isLoading = ref(false)
  const error = ref(null)
  const data = ref(null)
  
  const withLoading = async (fn, options = {}) => {
    const { errorMessage = 'Operation failed', showError = true } = options
    
    isLoading.value = true
    error.value = null
    
    try {
      const result = await fn()
      data.value = result
      return { success: true, data: result }
    } catch (err) {
      error.value = err.message || errorMessage
      if (showError) {
        // You can use toast notification here
        console.error('Error:', error.value)
      }
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }
  
  const reset = () => {
    isLoading.value = false
    error.value = null
    data.value = null
  }
  
  return {
    isLoading,
    error,
    data,
    withLoading,
    reset
  }
}

// Debounce utility
export function debounce(fn, delay = 300) {
  let timeoutId = null
  
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}