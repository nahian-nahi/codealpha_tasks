// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
  });
});

function redirectByRole(role) {
  if (role === 'admin') window.location.href = '/admin-dashboard.html';
  else if (role === 'driver') window.location.href = '/driver-dashboard.html';
  else window.location.href = '/user-dashboard.html';
}

// If already logged in, skip straight to the right dashboard
const existing = getCurrentUser();
if (existing) redirectByRole(existing.role);

// ---------- USER LOGIN ----------
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('loginMsg');
  try {
    const data = await apiRequest('/auth/login', 'POST', {
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value
    });
    saveSession(data.token, data.user);
    redirectByRole(data.user.role);
  } catch (err) {
    showMsg(msg, err.message);
  }
});

// ---------- USER REGISTER ----------
document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('registerMsg');
  try {
    await apiRequest('/auth/register', 'POST', {
      name: document.getElementById('regName').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value,
      gender: document.getElementById('regGender').value,
      role: document.getElementById('regRole').value,
      phone_no: document.getElementById('regPhone').value
    });
    showMsg(msg, 'Registered! You can log in now.', 'success');
    document.getElementById('registerForm').reset();
  } catch (err) {
    showMsg(msg, err.message);
  }
});

// ---------- ADMIN LOGIN ----------
document.getElementById('adminForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('adminMsg');
  try {
    const data = await apiRequest('/auth/admin/login', 'POST', {
      email: document.getElementById('adminEmail').value,
      password: document.getElementById('adminPassword').value
    });
    saveSession(data.token, data.user);
    redirectByRole('admin');
  } catch (err) {
    showMsg(msg, err.message);
  }
});

// ---------- DRIVER LOGIN ----------
document.getElementById('driverForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('driverMsg');
  try {
    const data = await apiRequest('/auth/driver/login', 'POST', {
      driver_id: document.getElementById('driverId').value,
      contact_no: document.getElementById('driverContact').value
    });
    saveSession(data.token, data.user);
    redirectByRole('driver');
  } catch (err) {
    showMsg(msg, err.message);
  }
});
