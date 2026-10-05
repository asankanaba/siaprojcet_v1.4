// src/utils/validators.js
export const validators = {
  isRequired: (value) => !!value || 'This field is required',
  isEmail: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Please enter a valid email',
  isPhone: (value) => /^(\+63|0)\d{10}$/.test(value) || 'Please enter a valid phone number',
  isNumber: (value) => !isNaN(value) || 'Please enter a number',
  minLength: (min) => (value) => value.length >= min || `Minimum ${min} characters required`,
  maxLength: (max) => (value) => value.length <= max || `Maximum ${max} characters allowed`,
  minValue: (min) => (value) => Number(value) >= min || `Minimum value is ${min}`,
  maxValue: (max) => (value) => Number(value) <= max || `Maximum value is ${max}`,
  isPositive: (value) => Number(value) > 0 || 'Value must be positive',
  isInRange: (min, max) => (value) => {
    const num = Number(value)
    return (num >= min && num <= max) || `Value must be between ${min} and ${max}`
  },
  isStrongPassword: (value) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    return regex.test(value) || 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
  },
  isMatch: (compareValue) => (value) => value === compareValue || 'Passwords do not match'
}

export const validateForm = (formData, rules) => {
  const errors = {}
  let isValid = true
  
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = formData[field]
    for (const rule of fieldRules) {
      const result = rule(value)
      if (result !== true) {
        errors[field] = result
        isValid = false
        break
      }
    }
  }
  
  return { isValid, errors }
}