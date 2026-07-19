const BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function login(username, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return request('/auth/logout', { method: 'POST' });
}

export function fetchJobs() {
  return request('/jobs');
}

export function fetchJob(id) {
  return request(`/jobs/${id}`);
}

export function fetchJobHistory(id) {
  return request(`/jobs/${id}/history`);
}

export function createJob(formData) {
  console.log('[API] createJob: sending POST /api/jobs');
  return fetch('/api/jobs', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then(async r => {
    console.log('[API] createJob response status:', r.status, r.statusText);
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      console.error('[API] createJob failed:', r.status, body);
      throw new Error(body.error || `Request failed (${r.status})`);
    }
    const data = await r.json();
    console.log('[API] createJob success:', data);
    return data;
  });
}

export function startJob(id) {
  return request(`/jobs/${id}/start`, { method: 'PATCH' });
}

export function submitJob(id, formData) {
  return fetch(`/api/jobs/${id}/submit`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.error); });
    return r.json();
  });
}

export function markDone(id) {
  return request(`/jobs/${id}/mark-done`, { method: 'PATCH' });
}

export function requestRedo(id, comment) {
  return request(`/jobs/${id}/request-redo`, {
    method: 'PATCH',
    body: JSON.stringify({ comment }),
  });
}

export function getDownloadUrl(jobId, fileId, type) {
  return `/api/jobs/${jobId}/${type}/${fileId}/download`;
}

export function reopenJob(id) {
  return request(`/jobs/${id}/reopen`, { method: 'PATCH' });
}

export function deleteTranslatedFile(jobId, fileId) {
  return request(`/jobs/${jobId}/translated/${fileId}`, { method: 'DELETE' });
}

export function getViewUrl(jobId, fileId) {
  return `/api/jobs/${jobId}/source/${fileId}/view`;
}

export function deleteJob(id) {
  return request(`/jobs/${id}`, { method: 'DELETE' });
}

export function updateJob(id, data) {
  return request(`/jobs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteSourceFile(jobId, fileId) {
  return request(`/jobs/${jobId}/source/${fileId}`, { method: 'DELETE' });
}

export function addSourceFiles(jobId, formData) {
  return fetch(`/api/jobs/${jobId}/sources`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  }).then(r => {
    if (!r.ok) return r.json().then(e => { throw new Error(e.error); });
    return r.json();
  });
}
