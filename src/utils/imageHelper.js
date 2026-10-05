// ============================================
// 📁 src/utils/imageHelper.js
// 🖼️ Serves images through /api/image.php (proven working)
// ============================================

// Root of smart-pos-api (no /api suffix)
const API_ROOT = (() => {
  const media = import.meta.env.VITE_MEDIA_BASE_URL;
  if (media) return media.replace(/\/$/, '');

  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase) return apiBase.replace(/\/api\/?$/, '').replace(/\/$/, '');

  return 'http://localhost/smart-pos-api';
})();

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#f3f4f6"/>
  <text x="100" y="105" font-family="sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle">No Image</text>
</svg>
`);

export function getImageUrl(path, folder = 'products') {
  // No image → placeholder
  if (!path || typeof path !== 'string') return PLACEHOLDER;
  const trimmed = path.trim();
  if (!trimmed) return PLACEHOLDER;

  // External URLs pass through unchanged
  if (/^https?:/i.test(trimmed)) return trimmed;

  // Extract just the filename from any path form
  const filename = trimmed.replace(/\\/g, '/').split('/').pop();

  // Route through the working PHP proxy
  return `${API_ROOT}/api/image.php?t=${folder}&f=${encodeURIComponent(filename)}`;
}

export function getProfilePicture(path) {
  if (!path || typeof path !== 'string') return PLACEHOLDER;
  const trimmed = path.trim();
  if (!trimmed) return PLACEHOLDER;
  if (/^https?:/i.test(trimmed)) return trimmed;

  const filename = trimmed.replace(/\\/g, '/').split('/').pop();
  return `${API_ROOT}/api/image.php?t=profiles&f=${encodeURIComponent(filename)}`;
}

export { API_ROOT, PLACEHOLDER };
export default getImageUrl;