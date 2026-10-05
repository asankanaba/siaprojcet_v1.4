<template>
  <div>
    <!-- Search and Filter -->
    <div class="d-flex gap-3 mb-3 flex-wrap">
      <div style="flex:1;min-width:200px;">
        <div class="input-group">
          <span class="input-group-text"><i class="fas fa-search"></i></span>
          <input
            v-model="search"
            type="text"
            class="form-control"
            placeholder="Search products..."
            @input="loadProducts"
          />
        </div>
      </div>
      <div style="min-width:150px;">
        <select v-model="category" class="form-control" @change="loadProducts">
          <option value="">All Categories</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Tax Info Banner -->
    <div class="tax-info-banner" :class="cartStore.tax_type">
      <i class="fas fa-info-circle"></i>
      <span v-if="cartStore.tax_type === 'exclusive'">
        ⚡ Prices shown include <strong>{{ (cartStore.tax_rate * 100).toFixed(1) }}% tax</strong> added to base price
      </span>
      <span v-else>
        ✅ Prices shown already include <strong>{{ (cartStore.tax_rate * 100).toFixed(1) }}% tax</strong>
      </span>
    </div>

    <!-- Product Grid -->
    <div class="product-grid">
      <div
        v-for="product in products"
        :key="product.id"
        class="product-card"
        :class="{ 'stock-limit-reached': product.stock === 0 }"
        @click="addToCart(product)"
      >
        <div class="product-image" style="position:relative;">
          <img
            :src="getProductImage(product)"
            :alt="product.name"
            class="product-img"
            @error="handleImageError"
          />
          <div style="position:absolute;top:0.5rem;right:0.5rem;">
            <span v-if="product.stock === 0" class="badge badge-danger">Out of Stock</span>
            <span v-else-if="product.stock <= product.low_stock_threshold" class="badge badge-warning">Low Stock</span>
          </div>
        </div>
        <div class="product-body">
          <div class="product-name">{{ product.name }}</div>
          <div class="d-flex justify-between align-center">
            <span class="product-price currency-peso">{{ getDisplayPrice(product) }}</span>
            <span class="product-stock" :class="{ 'stock-danger': product.stock <= product.low_stock_threshold && product.stock > 0 }">
              Stock: {{ product.stock }}
            </span>
          </div>
          <div class="product-actions">
            <button
              class="btn btn-primary"
              :class="{ 'btn-out-of-stock': product.stock === 0 }"
              :disabled="product.stock === 0"
              @click.stop="addToCart(product)"
            >
              <i class="fas fa-cart-plus"></i>
              {{ product.stock === 0 ? 'Out of Stock' : 'Add to Cart' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="products.length === 0" class="text-center" style="padding:3rem 0;">
      <i class="fas fa-boxes" style="font-size:3rem;color:var(--border-light);"></i>
      <p class="text-muted mt-3">No products found</p>
      <p class="text-muted" style="font-size:0.85rem;">Try adjusting your search or filters</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useCartStore } from '@/stores/cart'
import api from '@/api/index.js'
import { getImageUrl, PLACEHOLDER } from '@/utils/imageHelper'

const cartStore = useCartStore()
const products = ref([])
const categories = ref([])
const search = ref('')
const category = ref('')

const formatCurrency = (amount) => '₱' + Number(amount).toFixed(2)

// ✅ Uses imageHelper — handles /uploads/, uploads/, bare filenames, full URLs
const getProductImage = (product) => {
  if (!product) return PLACEHOLDER
  return getImageUrl(product.image_url || product.image, 'products')
}

const handleImageError = (event) => {
  event.target.src = PLACEHOLDER
}

const getDisplayPrice = (product) => {
  const basePrice = product.price
  if (cartStore.tax_type === 'exclusive') {
    return formatCurrency(basePrice * (1 + cartStore.tax_rate))
  }
  return formatCurrency(basePrice)
}

const loadProducts = async () => {
  try {
    const params = {}
    if (search.value) params.search = search.value
    if (category.value) params.category = category.value
    const response = await api.get('/products.php', { params })
    products.value = response.data || []
  } catch (error) {
    console.error('Error loading products:', error)
  }
}

const loadCategories = async () => {
  try {
    const response = await api.get('/categories.php')
    categories.value = response.data || []
  } catch (error) {
    console.error('Error loading categories:', error)
  }
}

const addToCart = (product) => {
  if (product.stock <= 0) {
    alert('Product is out of stock!')
    return
  }
  cartStore.addItem(product)
}

onMounted(() => {
  loadProducts()
  loadCategories()
  window.addEventListener('refresh-products', loadProducts)
})

onBeforeUnmount(() => {
  window.removeEventListener('refresh-products', loadProducts)
})
</script>

<style scoped>
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}
@media (max-width: 768px) {
  .product-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
}
.product-card {
  background: white;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}
body.dark-mode .product-card { background: var(--bg-card); border-color: var(--border-dark); }
.product-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-xl); }
.product-image { height: 140px; background: linear-gradient(135deg, #F3F4F6, #E5E7EB); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
body.dark-mode .product-image { background: linear-gradient(135deg, #2D3748, #1A202C); }
.product-img { width: 100%; height: 100%; object-fit: cover; }
.product-body { padding: 0.75rem; }
.product-name { font-weight: 600; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.product-price { font-weight: 700; font-size: 1.1rem; }
.product-stock { font-size: 0.7rem; color: var(--text-muted); }
.product-actions { margin-top: 0.5rem; }
.product-actions .btn { width: 100%; padding: 0.375rem; font-size: 0.8rem; }
.tax-info-banner { background: #EEF2FF; color: #4F46E5; padding: 0.5rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; }
.tax-info-banner.inclusive { background: #D1FAE5; color: #065F46; }
.tax-info-banner.exclusive { background: #FEF3C7; color: #92400E; }
body.dark-mode .tax-info-banner { background: rgba(79,70,229,0.15); color: #818CF8; }
body.dark-mode .tax-info-banner.inclusive { background: rgba(16,185,129,0.15); color: #34D399; }
body.dark-mode .tax-info-banner.exclusive { background: rgba(245,158,11,0.15); color: #FBBF24; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem 1rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-size: 0.85rem; }
.btn-primary { background: var(--primary); color: white; }
.btn-primary:hover:not(:disabled) { background: var(--primary-dark); transform: translateY(-1px); box-shadow: 0 4px 15px rgba(79,70,229,0.3); }
.btn-out-of-stock { background: #9CA3AF !important; cursor: not-allowed !important; }
.btn-out-of-stock:hover { background: #9CA3AF !important; transform: none !important; box-shadow: none !important; }
.badge { display: inline-block; padding: 0.25rem 0.5rem; font-size: 0.65rem; font-weight: 600; border-radius: 9999px; }
.badge-danger { background: #FEE2E2; color: #991B1B; }
.badge-warning { background: #FEF3C7; color: #92400E; }
body.dark-mode .badge-danger { background: rgba(239,68,68,0.2); color: #F87171; }
body.dark-mode .badge-warning { background: rgba(245,158,11,0.2); color: #FBBF24; }
</style>