<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="error-code">404</div>
      <h1>Page Not Found</h1>
      <p>The page you are looking for does not exist or has been moved.</p>
      <div class="actions">
        <router-link to="/dashboard" class="btn btn-primary">
          <i class="fas fa-home"></i> Go to Dashboard
        </router-link>
        <button @click="goBack" class="btn btn-secondary">
          <i class="fas fa-arrow-left"></i> Go Back
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  router.back();
};
</script>

<style scoped>
.not-found-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 1rem;
}

body.dark-mode .not-found-container {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
}

.not-found-content {
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-radius: 24px;
  padding: 3rem 4rem;
  max-width: 500px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

body.dark-mode .not-found-content {
  background: rgba(26,26,46,0.95);
}

.error-code {
  font-size: 6rem;
  font-weight: 800;
  color: #4F46E5;
  line-height: 1;
  margin-bottom: 0.5rem;
}

body.dark-mode .error-code {
  color: #818cf8;
}

.not-found-content h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 0.5rem 0;
}

body.dark-mode .not-found-content h1 {
  color: #e2e8f0;
}

.not-found-content p {
  color: #6b7280;
  margin-bottom: 2rem;
}

body.dark-mode .not-found-content p {
  color: #9ca3af;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #4F46E5;
  color: white;
}

.btn-primary:hover {
  background: #4338CA;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(79,70,229,0.3);
}

.btn-secondary {
  background: #f3f4f6;
  color: #1f2937;
}

body.dark-mode .btn-secondary {
  background: #2d3748;
  color: #e2e8f0;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

body.dark-mode .btn-secondary:hover {
  background: #374151;
}
</style>