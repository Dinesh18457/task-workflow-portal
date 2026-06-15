const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

export function getAuthUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function setAuth(auth) {
  localStorage.setItem('token', auth.token);
  localStorage.setItem(
    'user',
    JSON.stringify({
      userId: auth.userId,
      username: auth.username,
      role: auth.role,
    })
  );
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  register: (body) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  registerUser: (body) =>
    request('/users/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getTasks: (status) =>
    request(status ? `/tasks?status=${status}` : '/tasks'),
  getTask: (id) => request(`/tasks/${id}`),
  createTask: (body) =>
    request('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id, body) =>
    request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  updateStatus: (id, status, note) =>
    request(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),
  updateFilePath: (id, filePath) =>
    request(`/tasks/${id}/file-path`, {
      method: 'PATCH',
      body: JSON.stringify({ filePath }),
    }),
  openTaskFile: (id) =>
    request(`/tasks/${id}/open-file`, {
      method: 'POST',
    }),
  getWorkspaceFiles: () =>
    request('/workspace/files'),
  reviewTask: (id, approved, comments) =>
    request(`/tasks/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ approved, comments }),
    }),
  deleteTask: (id) => request(`/tasks/${id}`, { method: 'DELETE' }),
  getHistory: (id) => request(`/tasks/${id}/history`),
  getUsers: () => request('/users'),
};