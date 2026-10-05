export const config = {
  // Automatically switches between local and online
  apiBaseUrl: import.meta.env.PROD 
    ? '/api'  // Production: uses Netlify proxy
    : (import.meta.env.VITE_API_URL || 'http://localhost/smart-pos-api'), // Development: localhost
  
  imageBaseUrl: import.meta.env.PROD
    ? '/api/uploads/products/'  // Production: uses proxy
    : (import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/uploads/products/`  // Development with custom URL
        : 'http://localhost/smart-pos-api/uploads/products/'), // Development default
  
  currency: 'P',
  taxRate: 0.12,
  defaultTaxType: 'inclusive',
  defaultLowStockThreshold: 5,
  currencySymbol: '₱',
  dateFormat: 'en-PH',
  maxFilesize: 2 * 1024 * 1024,
  sessionTimeout: 3600000,
  maxRetries: 3,
  retryDelay: 1000
}