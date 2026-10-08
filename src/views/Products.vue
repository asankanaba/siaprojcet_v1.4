<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="products-container">
          <div class="products-header">
            <div class="header-left">
              <h2><i class="fas fa-boxes"></i> Products Management</h2>
              <span class="product-count">{{ filteredProducts.length }} products</span>
            </div>
            <div class="header-right">
              <button class="btn-request" @click="openRequestModal">
                <i class="fas fa-file-invoice"></i> Request Product
              </button>
              <button v-if="isFinance" class="btn-approvals" @click="openApprovalsModal">
                <i class="fas fa-check-double"></i> Approvals
                <span v-if="pendingApprovals > 0" class="badge-approval">{{ pendingApprovals }}</span>
              </button>
            </div>
          </div>

          <div class="products-toolbar">
            <div class="search-box">
              <i class="fas fa-search"></i>
              <input type="text" v-model="searchQuery" placeholder="Search products..." @input="searchProducts" />
            </div>
            <div class="filters">
              <select v-model="filterCategory" class="form-select" @change="loadProducts">
                <option value="">All Categories</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
              <select v-model="filterStatus" class="form-select" @change="loadProducts">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div class="products-table-wrapper">
            <table class="products-table">
              <thead>
                <tr>
                  <th style="width: 80px;">IMAGE</th>
                  <th>NAME</th>
                  <th>CATEGORY</th>
                  <th>PRICE</th>
                  <th>STOCK</th>
                  <th>STATUS</th>
                  <th style="width: 160px;">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="7" class="text-center">
                    <div class="loading-spinner"><i class="fas fa-spinner spin"></i> Loading products...</div>
                  </td>
                </tr>
                <tr v-else-if="filteredProducts.length === 0">
                  <td colspan="7" class="text-center">
                    <div class="empty-state">
                      <i class="fas fa-box-open"></i>
                      <p>No products found</p>
                      <button class="btn-add-small" @click="openRequestModal">Request your first product</button>
                    </div>
                  </td>
                </tr>
                <tr v-for="product in filteredProducts" :key="product.id">
                  <td>
                    <div class="product-image">
                      <img v-if="getProductImage(product)" :src="getProductImage(product)" :alt="product.name" @error="handleImageError" />
                      <div v-else class="image-placeholder"><i class="fas fa-box"></i></div>
                    </div>
                  </td>
                  <td>
                    <div class="product-info">
                      <span class="product-name">{{ product.name }}</span>
                      <span class="product-barcode" v-if="product.barcode">({{ product.barcode }})</span>
                    </div>
                  </td>
                  <td><span class="category-tag">{{ product.category_name || 'Uncategorized' }}</span></td>
                  <td class="price-cell">₱{{ formatPrice(product.price) }}</td>
                  <td>
                    <span :class="getStockClass(product.stock)">
                      {{ product.stock }}
                      <span v-if="product.stock <= 0" class="badge badge-danger">Out of Stock</span>
                      <span v-else-if="product.stock <= 5" class="badge badge-warning">Low Stock</span>
                    </span>
                  </td>
                  <td><span :class="getStatusClass(product.status)">{{ (product.status || 'ACTIVE').toUpperCase() }}</span></td>
                  <td>
                    <div class="action-buttons">
                      <button @click="editProduct(product)" class="btn-edit" title="Edit Product"><i class="fas fa-edit"></i></button>
                      <button v-if="product.status !== 'archived'" @click="archiveProduct(product.id)" class="btn-archive" title="Archive Product"><i class="fas fa-archive"></i></button>
                      <button v-else @click="restoreProduct(product.id)" class="btn-restore" title="Restore Product"><i class="fas fa-undo"></i></button>
                      <button @click="deleteProductPermanent(product)" class="btn-delete" title="Delete Permanently"><i class="fas fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="products-footer">
            <span>Showing <strong>{{ filteredProducts.length }}</strong> products</span>
            <span class="footer-info">
              <i class="fas fa-circle" style="color: #10b981; font-size: 0.5rem;"></i> Active
              <i class="fas fa-circle" style="color: #f59e0b; font-size: 0.5rem; margin-left: 1rem;"></i> Low Stock
              <i class="fas fa-circle" style="color: #ef4444; font-size: 0.5rem; margin-left: 1rem;"></i> Out of Stock
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Request Product Modal -->
  <div v-if="showRequestModal" class="modal-overlay" @click.self="closeRequestModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-file-invoice" style="color: #F59E0B;"></i> Request New Product</h5>
        <button @click="closeRequestModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Product Name <span class="required">*</span></label>
          <input v-model="requestForm.name" type="text" class="form-control" placeholder="Enter product name" />
        </div>
        <div class="form-group">
          <label>Price <span class="required">*</span></label>
          <input v-model="requestForm.price" type="number" class="form-control" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Stock</label>
          <input v-model="requestForm.stock" type="number" class="form-control" placeholder="0" />
        </div>
        <div class="form-group">
          <label>Category</label>
          <select v-model="requestForm.category_id" class="form-control">
            <option value="">Select Category</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Product Image</label>

          <!-- Primary: upload a file -->
          <div class="image-upload" @click="$refs.requestFileInput.click()">
            <input type="file" ref="requestFileInput" @change="handleRequestImageUpload" accept="image/*" style="display: none;" />
            <div v-if="requestForm.imagePreview && requestForm.imageFile" class="image-preview">
              <img :src="requestForm.imagePreview" alt="Preview" />
              <button @click.stop="removeRequestImage" class="btn-remove-image">✕</button>
            </div>
            <div v-else class="upload-placeholder">
              <i class="fas fa-cloud-upload-alt"></i>
              <p>Click to upload image</p>
              <small>PNG, JPG, JPEG, GIF up to 5MB</small>
            </div>
          </div>

          <!-- Secondary: paste image URL -->
          <div style="margin-top: 0.6rem;">
            <small style="color: #6b7280; display: block; margin-bottom: 0.25rem;">
              — or paste an image URL —
            </small>
            <input
              v-model="requestForm.image_url"
              type="text"
              class="form-control"
              placeholder="https://example.com/image.jpg"
              @input="onRequestUrlInput"
            />
            <div v-if="requestForm.imageUrlPreview" class="image-preview" style="margin-top: 0.5rem;">
              <img :src="requestForm.imageUrlPreview" alt="URL preview" />
              <button @click.stop="clearRequestUrl" class="btn-remove-image">✕</button>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea v-model="requestForm.description" class="form-control" placeholder="Product description" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label>Reason for Request</label>
          <textarea v-model="requestForm.reason" class="form-control" placeholder="Why is this product needed?" rows="2"></textarea>
        </div>
        <div class="form-group">
          <label>Priority</label>
          <select v-model="requestForm.priority" class="form-control">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="info-box">
          <i class="fas fa-info-circle"></i>
          Your request will be sent for approval. You will be notified once approved.
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeRequestModal" class="btn btn-secondary">Cancel</button>
        <button @click="submitRequest" class="btn btn-primary" :disabled="isSavingRequest">
          {{ isSavingRequest ? 'Submitting...' : 'Submit for Approval' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Approvals Modal (Finance Only) -->
  <div v-if="showApprovalsModal" class="modal-overlay" @click.self="closeApprovalsModal">
    <div class="modal-content approvals-modal">
      <div class="modal-header">
        <h5><i class="fas fa-check-double" style="color: #4F46E5;"></i> Product Approvals</h5>
        <button @click="closeApprovalsModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="approvals-filters">
          <select v-model="approvalFilter" class="form-select" @change="loadApprovals">
            <option value="">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div class="approvals-list">
          <div v-if="approvalsLoading" class="text-center">Loading...</div>
          <div v-else-if="filteredApprovals.length === 0" class="text-center">No approval requests found</div>
          <div v-for="approval in filteredApprovals" :key="approval.id" class="approval-item">
            <div class="approval-header">
              <div class="approval-info">
                <h6>{{ approval.product_name }}</h6>
                <span class="approval-price">₱{{ formatPrice(approval.price) }}</span>
              </div>
              <span :class="getApprovalStatusClass(approval.status)">{{ (approval.status || 'PENDING').toUpperCase() }}</span>
            </div>
            <div class="approval-details">
              <p><strong>Requested by:</strong> {{ approval.requested_by_name || 'Unknown' }}</p>
              <p><strong>Description:</strong> {{ approval.description || 'No description' }}</p>
              <p v-if="approval.notes"><strong>Notes:</strong> {{ approval.notes }}</p>
              <p><strong>Date:</strong> {{ formatDate(approval.created_at) }}</p>
            </div>
            <div v-if="approval.status === 'pending'" class="approval-actions">
              <button @click="approveProduct(approval.id)" class="btn-approve"><i class="fas fa-check"></i> Approve</button>
              <button @click="rejectProduct(approval.id)" class="btn-reject"><i class="fas fa-times"></i> Reject</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Edit Product Modal -->
  <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal">
    <div class="modal-content">
      <div class="modal-header">
        <h5><i class="fas fa-edit" style="color: #4F46E5;"></i> Edit Product</h5>
        <button @click="closeEditModal" class="btn-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>Product Name <span class="required">*</span></label>
          <input v-model="editForm.name" type="text" class="form-control" placeholder="Enter product name" />
        </div>
        <div class="form-group">
          <label>Price <span class="required">*</span></label>
          <input v-model="editForm.price" type="number" class="form-control" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Stock</label>
          <div class="stock-readonly">
            <i class="fas fa-lock"></i>
            <span><strong>{{ editForm.stock || 0 }}</strong> units on hand</span>
          </div>
          <small class="field-note">
            <i class="fas fa-info-circle"></i>
            Stock is updated automatically through <strong>Accept Delivery</strong> and POS sales.
          </small>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select v-model="editForm.category_id" class="form-control">
            <option value="">Select Category</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Product Image</label>

          <!-- Primary: file upload -->
          <div class="image-upload" @click="$refs.editFileInput.click()">
            <input type="file" ref="editFileInput" @change="handleEditImageUpload" accept="image/*" style="display: none;" />
            <div v-if="editForm.imagePreview && editForm.imageFile" class="image-preview">
              <img :src="editForm.imagePreview" alt="Preview" />
              <button @click.stop="removeEditImage" class="btn-remove-image">✕</button>
            </div>
            <div v-else-if="editForm.imagePreview" class="image-preview">
              <img :src="editForm.imagePreview" alt="Current" />
              <button @click.stop="removeEditImage" class="btn-remove-image">✕</button>
            </div>
            <div v-else class="upload-placeholder">
              <i class="fas fa-cloud-upload-alt"></i>
              <p>Click to upload new image</p>
              <small>PNG, JPG, JPEG, GIF up to 5MB</small>
            </div>
          </div>

          <!-- Secondary: paste URL -->
          <div style="margin-top: 0.6rem;">
            <small style="color: #6b7280; display: block; margin-bottom: 0.25rem;">
              — or paste an image URL —
            </small>
            <input
              v-model="editForm.image_url"
              type="text"
              class="form-control"
              placeholder="https://example.com/image.jpg"
              @input="onEditUrlInput"
            />
          </div>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea v-model="editForm.description" class="form-control" placeholder="Product description" rows="2"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeEditModal" class="btn btn-secondary">Cancel</button>
        <button @click="saveEditProduct" class="btn btn-primary" :disabled="isSavingEdit">
          {{ isSavingEdit ? 'Saving...' : 'Update Product' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import Sidebar from '@/components/common/Sidebar.vue';
import Navbar from '@/components/common/Navbar.vue';
import api from '@/api/index.js';
import Swal from 'sweetalert2';
import { config } from '@/config.js';

const router = useRouter();
const authStore = useAuthStore();
const API_BASE_URL = config.apiBaseUrl;

const products = ref([]);
const categories = ref([]);
const approvals = ref([]);
const loading = ref(false);
const approvalsLoading = ref(false);
const searchQuery = ref('');
const filterCategory = ref('');
const filterStatus = ref('');
const approvalFilter = ref('');
const showRequestModal = ref(false);
const showApprovalsModal = ref(false);
const showEditModal = ref(false);
const isSavingRequest = ref(false);
const isSavingEdit = ref(false);

const requestForm = ref({
  name: '', price: '', stock: '', category_id: '',
  description: '', reason: '', priority: 'medium',
  imagePreview: '', imageUrlPreview: '', imageFile: null, image_url: ''
});

const editForm = ref({
  id: null, name: '', price: '', stock: '', category_id: '',
  description: '', imagePreview: '', imageFile: null, image_url: ''
});

const isFinance = computed(() => authStore.user?.role === 'finance');
const pendingApprovals = computed(() => approvals.value.filter(a => a.status === 'pending').length);
const filteredApprovals = computed(() => {
  if (!approvalFilter.value) return approvals.value;
  return approvals.value.filter(a => a.status === approvalFilter.value);
});
const filteredProducts = computed(() => {
  let result = products.value;
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(p =>
      p.name.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  }
  return result;
});

const formatPrice = (price) => Number(price).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getProductImage = (product) => {
  if (!product) return '';
  let imageUrl = product.image_url || product.image || '';
  if (!imageUrl) return '';
  imageUrl = imageUrl.replace(/\\/g, '/');
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  if (imageUrl.startsWith('/uploads/')) return `${API_BASE_URL}${imageUrl}`;
  return `${API_BASE_URL}/uploads/products/${imageUrl}`;
};

const handleImageError = (e) => { e.target.style.display = 'none'; };
const getStockClass = (stock) => {
  if (stock <= 0) return 'stock-out';
  if (stock <= 5) return 'stock-low';
  return 'stock-ok';
};
const getStatusClass = (status) => status === 'archived' ? 'status-archived' : 'status-active';
const getApprovalStatusClass = (status) => {
  if (status === 'approved') return 'status-approved';
  if (status === 'rejected') return 'status-rejected';
  return 'status-pending';
};

// ============================================
// REQUEST FORM — image upload + URL fallback
// ============================================
const handleRequestImageUpload = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => { requestForm.value.imagePreview = ev.target.result; };
    reader.readAsDataURL(file);
    requestForm.value.imageFile = file;
    // Clear URL if a file is picked (file wins)
    requestForm.value.image_url = '';
    requestForm.value.imageUrlPreview = '';
  }
};
const removeRequestImage = () => {
  requestForm.value.imagePreview = '';
  requestForm.value.imageFile = null;
};
const onRequestUrlInput = () => {
  const url = (requestForm.value.image_url || '').trim();
  if (url && /^https?:\/\//i.test(url)) {
    requestForm.value.imageUrlPreview = url;
    // If user pasted a URL, clear any picked file (URL wins for this interaction)
    if (requestForm.value.imageFile) {
      requestForm.value.imageFile = null;
      requestForm.value.imagePreview = '';
    }
  } else {
    requestForm.value.imageUrlPreview = '';
  }
};
const clearRequestUrl = () => {
  requestForm.value.image_url = '';
  requestForm.value.imageUrlPreview = '';
};

// ============================================
// EDIT FORM — image upload + URL fallback
// ============================================
const handleEditImageUpload = (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => { editForm.value.imagePreview = ev.target.result; };
    reader.readAsDataURL(file);
    editForm.value.imageFile = file;
    editForm.value.image_url = '';
  }
};
const removeEditImage = () => {
  editForm.value.imagePreview = '';
  editForm.value.imageFile = null;
  editForm.value.image_url = '';
};
const onEditUrlInput = () => {
  const url = (editForm.value.image_url || '').trim();
  if (url && /^https?:\/\//i.test(url)) {
    editForm.value.imagePreview = url;
    if (editForm.value.imageFile) {
      editForm.value.imageFile = null;
    }
  }
};

// ============================================
// LOADERS
// ============================================
const loadProducts = async () => {
  loading.value = true;
  try {
    let url = '/products.php';
    const params = new URLSearchParams();
    if (filterCategory.value) params.append('category', filterCategory.value);
    if (filterStatus.value) params.append('status', filterStatus.value);
    if (searchQuery.value) params.append('search', searchQuery.value);
    if (params.toString()) url += '?' + params.toString();
    const response = await api.get(url);
    if (response.data && Array.isArray(response.data)) products.value = response.data;
  } catch (error) { console.error('Error loading products:', error); }
  finally { loading.value = false; }
};

const loadCategories = async () => {
  try {
    const response = await api.get('/categories.php');
    let list = [];
    if (Array.isArray(response.data)) list = response.data;
    else if (response.data && Array.isArray(response.data.data)) list = response.data.data;
    categories.value = list;
  } catch (error) { console.error('Error loading categories:', error); }
};

const loadApprovals = async () => {
  approvalsLoading.value = true;
  try {
    let url = '/product_approvals.php';
    if (approvalFilter.value) url += `?status=${approvalFilter.value}`;
    const response = await api.get(url);
    if (Array.isArray(response.data)) approvals.value = response.data;
  } catch (error) { console.error('Error loading approvals:', error); }
  finally { approvalsLoading.value = false; }
};

// ============================================
// REQUEST MODAL
// ============================================
const openRequestModal = () => {
  requestForm.value = {
    name: '', price: '', stock: '', category_id: '',
    description: '', reason: '', priority: 'medium',
    imagePreview: '', imageUrlPreview: '', imageFile: null, image_url: ''
  };
  showRequestModal.value = true;
};
const closeRequestModal = () => { showRequestModal.value = false; };

const submitRequest = async () => {
  if (!requestForm.value.name.trim()) {
    await Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Product name is required', confirmButtonColor: '#4F46E5' });
    return;
  }
  if (!requestForm.value.price || parseFloat(requestForm.value.price) <= 0) {
    await Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Price must be greater than 0', confirmButtonColor: '#4F46E5' });
    return;
  }

  isSavingRequest.value = true;
  try {
    const formData = new FormData();
    formData.append('product_name', requestForm.value.name);
    formData.append('description', requestForm.value.description || '');
    formData.append('price', parseFloat(requestForm.value.price));
    formData.append('stock', parseInt(requestForm.value.stock) || 0);
    formData.append('requested_by', authStore.user?.id || 1);
    formData.append('notes', requestForm.value.reason || '');
    formData.append('priority', requestForm.value.priority);

    if (requestForm.value.category_id) {
      formData.append('category_id', requestForm.value.category_id);
    }

    // ✅ Priority: file upload > URL
    if (requestForm.value.imageFile) {
      formData.append('image', requestForm.value.imageFile);
    } else if (requestForm.value.image_url && /^https?:\/\//i.test(requestForm.value.image_url.trim())) {
      formData.append('image_url', requestForm.value.image_url.trim());
    }

    const response = await api.post('/product_approvals.php', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (response.data.success) {
      await Swal.fire({
        icon: 'success', title: 'Request Submitted!',
        text: `Your request for "${requestForm.value.name}" has been submitted for approval.`,
        confirmButtonColor: '#4F46E5', timer: 3000, showConfirmButton: false
      });
      closeRequestModal();
    } else {
      throw new Error(response.data.message || 'Failed to submit request');
    }
  } catch (error) {
    console.error('Error submitting request:', error);
    await Swal.fire({
      icon: 'error', title: 'Error',
      text: error.response?.data?.message || 'Failed to submit request. Please try again.',
      confirmButtonColor: '#4F46E5'
    });
  } finally { isSavingRequest.value = false; }
};

// ============================================
// EDIT MODAL
// ============================================
const editProduct = (product) => {
  editForm.value = {
    id: product.id,
    name: product.name,
    price: product.price || '',
    stock: product.stock || '',
    category_id: product.category_id || '',
    description: product.description || '',
    imagePreview: getProductImage(product),
    imageFile: null,
    image_url: ''
  };
  showEditModal.value = true;
};
const closeEditModal = () => { showEditModal.value = false; };

const saveEditProduct = async () => {
  if (!editForm.value.name.trim()) {
    await Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Product name is required', confirmButtonColor: '#4F46E5' });
    return;
  }
  if (!editForm.value.price || parseFloat(editForm.value.price) <= 0) {
    await Swal.fire({ icon: 'warning', title: 'Validation Error', text: 'Price must be greater than 0', confirmButtonColor: '#4F46E5' });
    return;
  }

  isSavingEdit.value = true;
  try {
    const formData = new FormData();
    formData.append('name', editForm.value.name);
    formData.append('description', editForm.value.description || '');
    formData.append('price', parseFloat(editForm.value.price));

    if (editForm.value.category_id) {
      formData.append('category_id', editForm.value.category_id);
    }

    // ✅ Priority: file upload > URL
    if (editForm.value.imageFile) {
      formData.append('image', editForm.value.imageFile);
    } else if (editForm.value.image_url && /^https?:\/\//i.test(editForm.value.image_url.trim())) {
      formData.append('image_url', editForm.value.image_url.trim());
    }

    const response = await api.post(`/products.php?id=${editForm.value.id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (response.data.success) {
      await Swal.fire({
        icon: 'success', title: 'Updated!', text: 'Product updated successfully.',
        confirmButtonColor: '#4F46E5', timer: 1500, showConfirmButton: false
      });
      closeEditModal();
      await loadProducts();
    }
  } catch (error) {
    console.error('Error updating product:', error);
    await Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update product.', confirmButtonColor: '#4F46E5' });
  } finally { isSavingEdit.value = false; }
};

// ============================================
// APPROVALS
// ============================================
const openApprovalsModal = async () => { showApprovalsModal.value = true; await loadApprovals(); };
const closeApprovalsModal = () => { showApprovalsModal.value = false; };

const approveProduct = async (id) => {
  const result = await Swal.fire({
    title: 'Approve Product?', text: 'Are you sure you want to approve this product?',
    icon: 'question', showCancelButton: true,
    confirmButtonColor: '#10B981', cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Approve', cancelButtonText: 'Cancel'
  });
  if (result.isConfirmed) {
    try {
      const response = await api.put(`/product_approvals.php?id=${id}`, {
        status: 'approved', approved_by: authStore.user?.id || 1
      });
      if (response.data.success) {
        await Swal.fire({ icon: 'success', title: 'Approved!', text: 'Product has been approved.', confirmButtonColor: '#4F46E5', timer: 1500, showConfirmButton: false });
        await loadApprovals();
        await loadProducts();
      }
    } catch (error) {
      console.error('Error approving product:', error);
      await Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to approve product.', confirmButtonColor: '#4F46E5' });
    }
  }
};

const rejectProduct = async (id) => {
  const result = await Swal.fire({
    title: 'Reject Product?', text: 'Are you sure you want to reject this product?',
    icon: 'warning', showCancelButton: true,
    confirmButtonColor: '#EF4444', cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Reject', cancelButtonText: 'Cancel'
  });
  if (result.isConfirmed) {
    try {
      const response = await api.put(`/product_approvals.php?id=${id}`, {
        status: 'rejected', approved_by: authStore.user?.id || 1, notes: 'Rejected by Finance'
      });
      if (response.data.success) {
        await Swal.fire({ icon: 'info', title: 'Rejected', text: 'Product request has been rejected.', confirmButtonColor: '#4F46E5', timer: 1500, showConfirmButton: false });
        await loadApprovals();
      }
    } catch (error) {
      console.error('Error rejecting product:', error);
      await Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to reject product.', confirmButtonColor: '#4F46E5' });
    }
  }
};

// ============================================
// ARCHIVE / RESTORE / DELETE
// ============================================
const archiveProduct = async (id) => {
  const result = await Swal.fire({
    title: 'Archive Product?', text: 'Are you sure you want to archive this product?',
    icon: 'question', showCancelButton: true,
    confirmButtonColor: '#F59E0B', cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Archive', cancelButtonText: 'Cancel'
  });
  if (result.isConfirmed) {
    try {
      await api.put(`/products.php?id=${id}`, { status: 'archived' });
      await loadProducts();
      await Swal.fire({ icon: 'success', title: 'Archived', text: 'Product archived.', confirmButtonColor: '#4F46E5', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error('Error archiving product:', error);
      await Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to archive product.', confirmButtonColor: '#4F46E5' });
    }
  }
};

const restoreProduct = async (id) => {
  const result = await Swal.fire({
    title: 'Restore Product?', text: 'Are you sure you want to restore this product?',
    icon: 'question', showCancelButton: true,
    confirmButtonColor: '#10B981', cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Restore', cancelButtonText: 'Cancel'
  });
  if (result.isConfirmed) {
    try {
      await api.put(`/products.php?id=${id}`, { status: 'active' });
      await loadProducts();
      await Swal.fire({ icon: 'success', title: 'Restored', text: 'Product restored.', confirmButtonColor: '#4F46E5', timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error('Error restoring product:', error);
      await Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to restore product.', confirmButtonColor: '#4F46E5' });
    }
  }
};

const deleteProductPermanent = async (product) => {
  const result = await Swal.fire({
    title: 'Delete Product?',
    html: `
      <p style="color: #ef4444; font-weight: 600;">⚠️ This action cannot be undone!</p>
      <p style="font-size: .85rem; margin-top: .5rem; color: #6b7280;">
        If <strong>${product.name}</strong> has active requests or linked records,
        it will be <strong>archived</strong> instead of deleted.
      </p>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#EF4444',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel'
  });

  if (!result.isConfirmed) return;

  try {
    const response = await api.delete(`/products.php?id=${product.id}`);
    await loadProducts();

    if (response.data?.archived) {
      await Swal.fire({
        icon: 'info',
        title: 'Archived, Not Deleted',
        html: `
          <p>${response.data.message}</p>
          <p style="font-size: .8rem; color: #6b7280; margin-top: .5rem;">
            The product is now hidden from active views but preserved for historical records.
          </p>
        `,
        confirmButtonColor: '#4F46E5'
      });
    } else {
      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: response.data?.message || 'Product deleted permanently.',
        timer: 1500,
        showConfirmButton: false
      });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to delete product.',
      confirmButtonColor: '#4F46E5'
    });
  }
};

const searchProducts = () => { loadProducts(); };

onMounted(() => {
  loadProducts();
  loadCategories();
});
</script>

<style scoped>
.app-layout { display: flex; min-height: 100vh; }
.main-content { flex: 1; display: flex; flex-direction: column; }
.page-content { padding: 0; background: #f1f5f9; flex: 1; }
body.dark-mode .page-content { background: #0f172a; }
.products-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }
.products-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.header-left { display: flex; align-items: center; gap: 1rem; }
.header-left h2 { font-size: 1.3rem; font-weight: 700; color: #1a1a2e; margin: 0; }
body.dark-mode .header-left h2 { color: #e2e8f0; }
.product-count { font-size: 0.8rem; color: #6b7280; background: #e5e7eb; padding: 0.2rem 0.6rem; border-radius: 50px; }
body.dark-mode .product-count { background: #374151; color: #9ca3af; }
.header-right { display: flex; gap: 0.5rem; }
.btn-request { background: #F59E0B; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; font-size: 0.9rem; }
.btn-request:hover { background: #D97706; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(245,158,11,0.3); }
.btn-approvals { background: #4F46E5; color: white; border: none; padding: 0.5rem 1.2rem; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s; position: relative; font-size: 0.9rem; }
.btn-approvals:hover { background: #4338CA; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(79,70,229,0.3); }
.badge-approval { background: #ef4444; color: white; border-radius: 50%; padding: 0.1rem 0.4rem; font-size: 0.7rem; font-weight: 700; margin-left: 0.2rem; }
.products-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
.search-box { display: flex; align-items: center; background: white; border-radius: 8px; padding: 0.4rem 0.8rem; border: 2px solid #e5e7eb; flex: 1; min-width: 200px; max-width: 400px; transition: border-color 0.2s; }
body.dark-mode .search-box { background: #1e293b; border-color: #374151; }
.search-box:focus-within { border-color: #4F46E5; }
.search-box i { color: #6b7280; margin-right: 0.5rem; }
body.dark-mode .search-box i { color: #9ca3af; }
.search-box input { border: none; background: transparent; outline: none; width: 100%; font-size: 0.9rem; color: #1f2937; }
body.dark-mode .search-box input { color: #e2e8f0; }
.filters { display: flex; gap: 0.5rem; }
.form-select { padding: 0.4rem 0.8rem; border: 2px solid #e5e7eb; border-radius: 8px; background: white; font-size: 0.9rem; color: #1f2937; cursor: pointer; transition: border-color 0.2s; min-width: 130px; }
body.dark-mode .form-select { background: #1e293b; border-color: #374151; color: #e2e8f0; }
.form-select:focus { outline: none; border-color: #4F46E5; }
.products-table-wrapper { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
body.dark-mode .products-table-wrapper { background: #1e293b; }
.products-table { width: 100%; border-collapse: collapse; }
.products-table th { padding: 0.75rem 1rem; text-align: left; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; color: #6b7280; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
body.dark-mode .products-table th { background: #0f172a; color: #9ca3af; border-bottom-color: #374151; }
.products-table td { padding: 0.75rem 1rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 0.9rem; color: #1f2937; }
body.dark-mode .products-table td { border-bottom-color: #2d3748; color: #e2e8f0; }
.products-table tr:hover td { background: #f9fafb; }
body.dark-mode .products-table tr:hover td { background: #2d3748; }
.product-image { width: 50px; height: 50px; border-radius: 8px; overflow: hidden; background: #f3f4f6; display: flex; align-items: center; justify-content: center; border: 1px solid #e5e7eb; }
body.dark-mode .product-image { background: #2d3748; border-color: #374151; }
.product-image img { width: 100%; height: 100%; object-fit: cover; }
.image-placeholder { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 1.2rem; background: #f3f4f6; }
body.dark-mode .image-placeholder { background: #2d3748; color: #6b7280; }
.status-active { background: #d1fae5; color: #065f46; padding: 0.25rem 0.6rem; border-radius: 50px; font-size: 0.7rem; font-weight: 600; display: inline-block; }
body.dark-mode .status-active { background: #064e3b; color: #6ee7b7; }
.status-archived { background: #f3f4f6; color: #6b7280; padding: 0.25rem 0.6rem; border-radius: 50px; font-size: 0.7rem; font-weight: 600; display: inline-block; }
body.dark-mode .status-archived { background: #374151; color: #9ca3af; }
.stock-ok { color: #10b981; font-weight: 500; }
.stock-low { color: #f59e0b; font-weight: 500; }
.stock-out { color: #ef4444; font-weight: 500; }
.badge { display: inline-block; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.6rem; font-weight: 700; margin-left: 0.25rem; }
.badge-danger { background: #fee2e2; color: #991b1b; }
body.dark-mode .badge-danger { background: #7f1d1d; color: #fca5a5; }
.badge-warning { background: #fef3c7; color: #92400e; }
body.dark-mode .badge-warning { background: #78350f; color: #fcd34d; }
.action-buttons { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.btn-edit { background: none; border: none; color: #4F46E5; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: background 0.2s; }
.btn-edit:hover { background: #eef2ff; }
body.dark-mode .btn-edit:hover { background: #312e81; }
.btn-archive { background: none; border: none; color: #F59E0B; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: background 0.2s; }
.btn-archive:hover { background: #fef3c7; }
body.dark-mode .btn-archive:hover { background: #78350f; }
.btn-restore { background: none; border: none; color: #10B981; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: background 0.2s; }
.btn-restore:hover { background: #d1fae5; }
body.dark-mode .btn-restore:hover { background: #064e3b; }
.btn-delete { background: none; border: none; color: #ef4444; cursor: pointer; padding: 0.3rem; border-radius: 4px; transition: background 0.2s; }
.btn-delete:hover { background: #fee2e2; }
body.dark-mode .btn-delete:hover { background: #7f1d1d; }
.image-upload { border: 2px dashed #e5e7eb; border-radius: 10px; padding: 1rem; text-align: center; cursor: pointer; transition: border-color 0.2s, background 0.2s; position: relative; background: #fafafa; }
body.dark-mode .image-upload { border-color: #374151; background: #1e293b; }
.image-upload:hover { border-color: #4F46E5; background: #f3f4f6; }
body.dark-mode .image-upload:hover { background: #2d3748; }
.image-preview { position: relative; display: inline-block; }
.image-preview img { max-width: 150px; max-height: 150px; border-radius: 8px; object-fit: cover; }
.btn-remove-image { position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
.btn-remove-image:hover { transform: scale(1.1); }
.upload-placeholder { padding: 0.5rem; }
.upload-placeholder i { font-size: 2rem; color: #6b7280; }
body.dark-mode .upload-placeholder i { color: #9ca3af; }
.upload-placeholder p { margin: 0.25rem 0 0 0; color: #6b7280; font-size: 0.85rem; }
body.dark-mode .upload-placeholder p { color: #9ca3af; }
.upload-placeholder small { color: #9ca3af; font-size: 0.7rem; }
body.dark-mode .upload-placeholder small { color: #6b7280; }
.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 1rem; }
.modal-content { background: white; border-radius: 16px; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideDown 0.3s ease; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
body.dark-mode .modal-content { background: #1e293b; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
.approvals-modal { max-width: 600px !important; }
@keyframes slideDown { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
body.dark-mode .modal-header { border-bottom-color: #2d3748; }
.modal-header h5 { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0; }
body.dark-mode .modal-header h5 { color: #e2e8f0; }
.btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6b7280; transition: color 0.2s; }
body.dark-mode .btn-close { color: #9ca3af; }
.btn-close:hover { color: #1f2937; }
body.dark-mode .btn-close:hover { color: #e2e8f0; }
.modal-body { padding: 1.5rem; }
.modal-body .form-group { margin-bottom: 1rem; }
.required { color: #ef4444; }
.form-group label { display: block; font-weight: 600; font-size: 0.85rem; color: #1f2937; margin-bottom: 0.25rem; }
body.dark-mode .form-group label { color: #e2e8f0; }
.form-control { width: 100%; padding: 0.5rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 0.9rem; background: white; color: #1f2937; transition: border-color 0.2s; }
body.dark-mode .form-control { background: #2d3748; border-color: #374151; color: #e2e8f0; }
.form-control:focus { outline: none; border-color: #4F46E5; }
textarea.form-control { resize: vertical; min-height: 60px; font-family: inherit; }
.modal-footer { display: flex; gap: 0.5rem; padding: 1.25rem 1.5rem; border-top: 1px solid #e5e7eb; justify-content: flex-end; }
body.dark-mode .modal-footer { border-top-color: #2d3748; }
.btn { padding: 0.5rem 1.25rem; border: none; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s; }
.btn-secondary { background: #f3f4f6; color: #1f2937; }
body.dark-mode .btn-secondary { background: #2d3748; color: #e2e8f0; }
.btn-secondary:hover { background: #e5e7eb; }
body.dark-mode .btn-secondary:hover { background: #374151; }
.btn-primary { background: #4F46E5; color: white; }
.btn-primary:hover:not(:disabled) { background: #4338CA; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.info-box { background: #e0e7ff; color: #3730a3; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem; }
body.dark-mode .info-box { background: #312e81; color: #818cf8; }
.stock-readonly { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.75rem; border: 2px solid #e5e7eb; border-radius: 8px; background: #f9fafb; color: #6b7280; font-size: 0.9rem; }
.stock-readonly i { color: #9ca3af; }
.stock-readonly strong { color: #1f2937; font-weight: 700; }
body.dark-mode .stock-readonly { background: #0f172a; border-color: #374151; color: #9ca3af; }
body.dark-mode .stock-readonly strong { color: #e2e8f0; }
.field-note { display: flex; align-items: flex-start; gap: 0.35rem; margin-top: 0.35rem; color: #6b7280; font-size: 0.72rem; line-height: 1.4; }
.field-note i { color: #4F46E5; margin-top: 0.15rem; }
body.dark-mode .field-note { color: #9ca3af; }
.approvals-filters { margin-bottom: 1rem; }
.approval-item { background: #f9fafb; border-radius: 10px; padding: 1rem; margin-bottom: 0.75rem; border: 1px solid #e5e7eb; }
body.dark-mode .approval-item { background: #2d3748; border-color: #374151; }
.approval-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.approval-info h6 { margin: 0; font-size: 1rem; font-weight: 600; color: #1a1a2e; }
body.dark-mode .approval-info h6 { color: #e2e8f0; }
.approval-price { font-weight: 600; color: #4F46E5; font-size: 0.9rem; }
.approval-details p { margin: 0.2rem 0; font-size: 0.85rem; color: #6b7280; }
body.dark-mode .approval-details p { color: #9ca3af; }
.approval-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e5e7eb; }
body.dark-mode .approval-actions { border-top-color: #374151; }
.btn-approve { background: #10B981; color: white; border: none; padding: 0.3rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; }
.btn-approve:hover { background: #059669; }
.btn-reject { background: #EF4444; color: white; border: none; padding: 0.3rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.3rem; }
.btn-reject:hover { background: #DC2626; }
.status-approved { background: #d1fae5; color: #065f46; padding: 0.2rem 0.6rem; border-radius: 50px; font-size: 0.7rem; font-weight: 600; }
body.dark-mode .status-approved { background: #064e3b; color: #6ee7b7; }
.status-rejected { background: #fee2e2; color: #991b1b; padding: 0.2rem 0.6rem; border-radius: 50px; font-size: 0.7rem; font-weight: 600; }
body.dark-mode .status-rejected { background: #7f1d1d; color: #fca5a5; }
.status-pending { background: #fef3c7; color: #92400e; padding: 0.2rem 0.6rem; border-radius: 50px; font-size: 0.7rem; font-weight: 600; }
body.dark-mode .status-pending { background: #78350f; color: #fcd34d; }
.loading-spinner { display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #6b7280; padding: 1rem; }
.loading-spinner .spin { animation: spin 1s linear infinite; }
.text-center { text-align: center; padding: 1.5rem; color: #6b7280; }
.empty-state { padding: 2rem; text-align: center; }
.empty-state i { font-size: 2.5rem; color: #d1d5db; display: block; margin-bottom: 0.5rem; }
body.dark-mode .empty-state i { color: #374151; }
.empty-state p { font-size: 1rem; color: #6b7280; margin-bottom: 1rem; }
.btn-add-small { background: #4F46E5; color: white; border: none; padding: 0.4rem 1rem; border-radius: 6px; font-weight: 500; cursor: pointer; font-size: 0.85rem; transition: all 0.2s; }
.btn-add-small:hover { background: #4338CA; }
.products-footer { margin-top: 1rem; padding: 0.75rem 1rem; background: white; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; color: #6b7280; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
body.dark-mode .products-footer { background: #1e293b; color: #9ca3af; }
.products-footer strong { color: #1a1a2e; }
body.dark-mode .products-footer strong { color: #e2e8f0; }
.footer-info { display: flex; align-items: center; gap: 0.5rem; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .products-container { padding: 1rem; }
  .products-header { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
  .header-right { flex-wrap: wrap; width: 100%; }
  .btn-request, .btn-approvals { flex: 1; justify-content: center; }
  .products-toolbar { flex-direction: column; }
  .search-box { max-width: 100%; width: 100%; }
  .filters { width: 100%; }
  .form-select { flex: 1; min-width: auto; }
  .products-table-wrapper { overflow-x: auto; }
  .products-table { font-size: 0.8rem; min-width: 700px; }
  .modal-content { margin: 1rem; max-width: 100%; }
  .approvals-modal { max-width: 100% !important; }
}
</style>