<template>
  <div class="app-layout">
    <Sidebar />
    <div class="main-content">
      <Navbar />
      <div class="page-content">
        <div class="detail-container">
          <h2>Payroll Detail</h2>
          <p>Coming soon...</p>
          <router-link to="/hr/payroll" class="btn-back">
            <i class="fas fa-arrow-left"></i> Back to Payroll
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Sidebar from '@/components/common/Sidebar.vue'
import Navbar from '@/components/common/Navbar.vue'
</script>

<style scoped>
.detail-container {
  padding: 2rem;
}
.btn-back {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #4F46E5;
  color: white;
  border-radius: 8px;
  text-decoration: none;
}
</style>