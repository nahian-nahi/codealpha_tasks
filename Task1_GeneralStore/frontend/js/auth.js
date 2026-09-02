// ============================================
// Register / Login forms
// ============================================

function getRedirectTarget() {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') || 'index.html';
}

function showAlert(el, message, type = 'error') {
  el.textContent = message;
  el.className = `alert alert-${type} show`;
}

async function handleRegister(e) {
  e.preventDefault();
  const alertBox = document.getElementById('form-alert');
  const btn = document.getElementById('submit-btn');

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.textContent = 'Creating account…';

  try {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name, email, password }
    });
    setSession(result.token, result.user);
    showAlert(alertBox, 'Account created! Redirecting…', 'success');
    setTimeout(() => { window.location.href = getRedirectTarget(); }, 800);
  } catch (err) {
    showAlert(alertBox, err.message);
    btn.disabled = false;
    btn.textContent = 'Create account';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const alertBox = document.getElementById('form-alert');
  const btn = document.getElementById('submit-btn');

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.textContent = 'Logging in…';

  try {
    const result = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    setSession(result.token, result.user);
    showAlert(alertBox, 'Logged in! Redirecting…', 'success');
    setTimeout(() => { window.location.href = getRedirectTarget(); }, 600);
  } catch (err) {
    showAlert(alertBox, err.message);
    btn.disabled = false;
    btn.textContent = 'Log in';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  // Preserve redirect target across the login/signup switch link
  const switchLink = document.getElementById('switch-link');
  if (switchLink) {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    if (redirect) {
      const url = new URL(switchLink.href, window.location.href);
      url.searchParams.set('redirect', redirect);
      switchLink.href = url.pathname + url.search;
    }
  }
});
