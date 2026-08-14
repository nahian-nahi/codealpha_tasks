// ============================================
// Shared helpers used by every page
// ============================================

const API_BASE = '/api';

// ---- Auth token helpers ----
function getToken() { return localStorage.getItem('token'); }
function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
function isLoggedIn() { return !!getToken(); }

// ---- Generic fetch wrapper ----
async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

// ---- Cart (stored client-side in localStorage, keyed by product id) ----
function getCart() {
  const raw = localStorage.getItem('cart');
  return raw ? JSON.parse(raw) : [];
}
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}
function addToCart(product, qty) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image_url: product.image_url,
      qty
    });
  }
  saveCart(cart);
}
function removeFromCart(productId) {
  saveCart(getCart().filter(item => item.id !== productId));
}
function updateCartQty(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.qty = qty;
    saveCart(cart.filter(i => i.qty > 0));
  }
}
function cartCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}
function cartTotal() {
  return getCart().reduce((sum, item) => sum + item.qty * item.price, 0);
}
function clearCart() {
  localStorage.removeItem('cart');
  updateCartBadge();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  badge.textContent = cartCount();
  badge.classList.remove('bump');
  void badge.offsetWidth; // restart animation
  badge.classList.add('bump');
}

function money(n) {
  return `$${parseFloat(n).toFixed(2)}`;
}

// ---- Shared header rendering (login state) ----
function renderHeaderAuthState() {
  const userChip = document.getElementById('user-chip');
  if (!userChip) return;
  const user = getUser();
  if (user) {
    userChip.innerHTML = `<span class="user-chip">Hi, ${escapeHtml(user.name)}</span> · <a href="orders.html">Orders</a> · <a href="#" id="logout-link">Log out</a>`;
    const logoutLink = document.getElementById('logout-link');
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearSession();
      window.location.href = 'index.html';
    });
  } else {
    userChip.innerHTML = `<a href="login.html">Log in</a> · <a href="register.html">Sign up</a>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Dark / light mode ----
function getPreferredTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  // Fall back to the OS-level preference on first visit
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.classList.remove('spin');
    void btn.offsetWidth;
    btn.classList.add('spin');
  }
}

// Apply theme immediately (before DOMContentLoaded) to avoid a flash of the wrong theme
applyTheme(getPreferredTheme());

// Run on every page load
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  renderHeaderAuthState();
  applyTheme(getPreferredTheme()); // sets the correct icon once the button exists in the DOM
  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
});
