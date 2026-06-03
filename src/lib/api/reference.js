import { api } from './client.js';

const CV_API_URL = import.meta.env.VITE_CV_API_URL || 'http://localhost:8000';

// ✅ Backend References API (auto-inject Bearer token via client.js)

export async function getReferences() {
  return api.get('/reference');
}

export async function saveReference(data) {
  return api.post('/reference', data);
}

export async function deleteReference(name) {
  return api.delete(`/reference/${encodeURIComponent(name)}`);
}

export async function clearAllReferences() {
  return api.delete('/reference');
}

// ✅ CV API References (direct fetch to CV program)

export async function saveReferenceFromImage(imageFile, name, cvConfig) {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('name', name);
  formData.append('ppm', cvConfig.pixel_per_mm ?? cvConfig.pixelPerMm);
  formData.append('tolerance_mm', cvConfig.tolerance_mm ?? cvConfig.toleranceMm);
  formData.append('contour_thresh', cvConfig.contour_thresh ?? cvConfig.contourThresh);
  formData.append('min_area', cvConfig.contour_min_area ?? cvConfig.contourMinArea);
  formData.append('min_feature_mm', cvConfig.min_feature_mm ?? cvConfig.minFeatureMm);

  const res = await fetch(`${CV_API_URL}/save-reference`, {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) throw new Error('Failed to process image');
  return res.json();
}

export async function saveReferenceFromStream(name, cvConfig) {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('ppm', cvConfig.pixel_per_mm ?? cvConfig.pixelPerMm);
  formData.append('tolerance_mm', cvConfig.tolerance_mm ?? cvConfig.toleranceMm);
  formData.append('contour_thresh', cvConfig.contour_thresh ?? cvConfig.contourThresh);
  formData.append('min_area', cvConfig.contour_min_area ?? cvConfig.contourMinArea);
  formData.append('min_feature_mm', cvConfig.min_feature_mm ?? cvConfig.minFeatureMm);

  const res = await fetch(`${CV_API_URL}/save-reference-from-stream`, {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) throw new Error('Failed to capture from stream');
  return res.json();
}
