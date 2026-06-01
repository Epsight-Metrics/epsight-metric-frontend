const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export async function getReferences() {
  const res = await fetch(`${API_BASE}/reference`, {
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to fetch references');
  return res.json();
}

export async function saveReference(data) {
  const res = await fetch(`${API_BASE}/reference`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to save reference');
  return res.json();
}

export async function saveReferenceFromImage(imageFile, name, cvConfig) {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('name', name);
  formData.append('ppm', cvConfig.pixel_per_mm);
  formData.append('tolerance_mm', cvConfig.tolerance_mm);
  formData.append('contour_thresh', cvConfig.contour_thresh);
  formData.append('min_area', cvConfig.contour_min_area);
  formData.append('min_feature_mm', cvConfig.min_feature_mm);

  const CV_API_URL = import.meta.env.VITE_CV_API_URL || 'http://localhost:8000';
  const res = await fetch(`${CV_API_URL}/save-reference`, {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) throw new Error('Failed to process image');
  return res.json();
}

export async function saveReferenceFromStream(name, cvConfig) {
  const CV_API_URL = import.meta.env.VITE_CV_API_URL || 'http://localhost:8000';
  const res = await fetch(`${CV_API_URL}/save-reference-from-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      ppm: cvConfig.pixel_per_mm,
      tolerance_mm: cvConfig.tolerance_mm,
      contour_thresh: cvConfig.contour_thresh,
      min_area: cvConfig.contour_min_area,
      min_feature_mm: cvConfig.min_feature_mm
    })
  });
  
  if (!res.ok) throw new Error('Failed to capture from stream');
  return res.json();
}

export async function deleteReference(name) {
  const res = await fetch(`${API_BASE}/reference/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to delete reference');
  return res.json();
}

export async function clearAllReferences() {
  const res = await fetch(`${API_BASE}/reference`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to clear references');
  return res.json();
}
