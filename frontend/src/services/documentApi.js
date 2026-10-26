const API_BASE = '/api';

async function ensureSuccess(response) {
  if (response.ok) return response;

  const payload = await response.json().catch(() => null);
  const message = payload?.error?.message || 'Não foi possível concluir a solicitação.';
  throw new Error(message);
}

function userHeaders(userId) {
  return { 'X-User-Id': userId };
}

export async function listDocuments(userId) {
  const response = await ensureSuccess(await fetch(`${API_BASE}/documents`, {
    headers: userHeaders(userId),
  }));
  return response.json();
}

export async function uploadDocument(userId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await ensureSuccess(await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: userHeaders(userId),
    body: formData,
  }));
  return response.json();
}

export async function downloadDocument(userId, item) {
  const response = await ensureSuccess(await fetch(
    `${API_BASE}/documents/${encodeURIComponent(item.id)}/download`,
    { headers: userHeaders(userId) },
  ));
  const objectUrl = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = item.originalName;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}