// Shared helper for talking to the backend API.
// Change API_BASE if your backend runs somewhere other than localhost:5000
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function getCurrentUser() {
  const raw = localStorage.getItem('currentUser');
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('currentUser', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('currentUser');
}

function logout() {
  clearSession();
  window.location.href = '/index.html';
}

// Wraps fetch() with the JSON headers + auth token + basic error handling.
async function apiRequest(path, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

// Redirect helper: guards a page so only a given role can view it.
function requireRole(allowedRoles) {
  const user = getCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    window.location.href = '/index.html';
  }
  return user;
}

function showMsg(el, text, type = 'error') {
  el.textContent = text;
  el.className = `msg show ${type}`;
}
