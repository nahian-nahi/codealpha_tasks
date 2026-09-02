const currentAdmin = requireRole(['admin']);

function showTab(name, evt) {
  ['overview', 'buses', 'drivers', 'routes', 'schedules'].forEach(t => {
    document.getElementById(`tab-${t}`).style.display = t === name ? 'block' : 'none';
  });
  document.querySelectorAll('.topbar nav a').forEach(a => a.classList.remove('active'));
  evt?.target?.classList.add('active');

  if (name === 'overview') loadOverview();
  if (name === 'buses') { loadBuses(); loadDriversForSelect(); }
  if (name === 'drivers') loadDrivers();
  if (name === 'routes') loadRoutes();
  if (name === 'schedules') { loadSchedules(); loadBusesForSelect(); loadRoutesForSelect(); }
}

// ---------- OVERVIEW ----------
async function loadOverview() {
  try {
    const s = await apiRequest('/stats/overview');
    document.getElementById('statUsers').textContent = s.totalUsers;
    document.getElementById('statBuses').textContent = s.totalBuses;
    document.getElementById('statDrivers').textContent = s.totalDrivers;
    document.getElementById('statBookings').textContent = s.totalBookings;

    const sys = await apiRequest('/admin/system-status');
    const pill = document.getElementById('systemStatusPill');
    pill.textContent = sys.enabled ? 'Enabled' : 'Disabled';
    pill.className = `status-pill status-${sys.enabled ? 'active' : 'inactive'}`;
  } catch (err) {
    console.error(err);
  }
}

document.getElementById('toggleSystemBtn').addEventListener('click', async () => {
  const pill = document.getElementById('systemStatusPill');
  const currentlyEnabled = pill.textContent === 'Enabled';
  try {
    const res = await apiRequest('/admin/system-status', 'PUT', { enabled: !currentlyEnabled });
    pill.textContent = res.enabled ? 'Enabled' : 'Disabled';
    pill.className = `status-pill status-${res.enabled ? 'active' : 'inactive'}`;
  } catch (err) {
    alert(err.message);
  }
});

// ---------- BUSES ----------
async function loadBuses() {
  try {
    const buses = await apiRequest('/buses');
    const body = document.getElementById('busBody');
    body.innerHTML = '';
    buses.forEach(b => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${b.bus_name}</td><td>${b.number_plate}</td><td>${b.total_seats}</td>
        <td><span class="status-pill status-${b.status}">${b.status}</span></td>
        <td><button class="btn btn-danger btn-small" onclick="deleteBus('${b.bus_name}')">Delete</button></td>`;
      body.appendChild(tr);
    });
  } catch (err) { console.error(err); }
}

async function loadDriversForSelect() {
  try {
    const drivers = await apiRequest('/drivers');
    const sel = document.getElementById('busDriver');
    sel.innerHTML = '<option value="">— none —</option>';
    drivers.forEach(d => sel.innerHTML += `<option value="${d.driver_id}">${d.name} (#${d.driver_id})</option>`);
  } catch (err) { console.error(err); }
}

document.getElementById('busForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('busMsg');
  try {
    await apiRequest('/buses', 'POST', {
      bus_name: document.getElementById('busName').value,
      number_plate: document.getElementById('busPlate').value,
      total_seats: document.getElementById('busSeats').value,
      driver_id: document.getElementById('busDriver').value || null
    });
    showMsg(msg, 'Bus added.', 'success');
    document.getElementById('busForm').reset();
    loadBuses();
  } catch (err) { showMsg(msg, err.message); }
});

async function deleteBus(name) {
  if (!confirm(`Delete bus "${name}"?`)) return;
  try { await apiRequest(`/buses/${name}`, 'DELETE'); loadBuses(); }
  catch (err) { alert(err.message); }
}

// ---------- DRIVERS ----------
async function loadDrivers() {
  try {
    const drivers = await apiRequest('/drivers');
    const body = document.getElementById('driverBody');
    body.innerHTML = '';
    drivers.forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${d.driver_id}</td><td>${d.name}</td><td>${d.contact_no}</td>
        <td><span class="status-pill status-${d.status}">${d.status}</span></td>
        <td><button class="btn btn-danger btn-small" onclick="deleteDriver(${d.driver_id})">Delete</button></td>`;
      body.appendChild(tr);
    });
  } catch (err) { console.error(err); }
}

document.getElementById('driverForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('driverMsg');
  try {
    await apiRequest('/drivers', 'POST', {
      name: document.getElementById('driverName').value,
      contact_no: document.getElementById('driverContact').value,
      license_no: document.getElementById('driverLicense').value,
      address: document.getElementById('driverAddress').value
    });
    showMsg(msg, 'Driver added.', 'success');
    document.getElementById('driverForm').reset();
    loadDrivers();
  } catch (err) { showMsg(msg, err.message); }
});

async function deleteDriver(id) {
  if (!confirm('Remove this driver?')) return;
  try { await apiRequest(`/drivers/${id}`, 'DELETE'); loadDrivers(); }
  catch (err) { alert(err.message); }
}

// ---------- ROUTES ----------
async function loadRoutes() {
  try {
    const routes = await apiRequest('/routes');
    const body = document.getElementById('routeBody');
    body.innerHTML = '';
    routes.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.route_name}</td><td>${r.start_point}</td><td>${r.end_point}</td>
        <td><button class="btn btn-danger btn-small" onclick="deleteRoute('${r.route_name}')">Delete</button></td>`;
      body.appendChild(tr);
    });
  } catch (err) { console.error(err); }
}

document.getElementById('routeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('routeMsg');
  try {
    await apiRequest('/routes', 'POST', {
      route_name: document.getElementById('routeName').value,
      start_point: document.getElementById('routeStart').value,
      end_point: document.getElementById('routeEnd').value,
      boarding_location: document.getElementById('routeBoarding').value,
      getting_off_location: document.getElementById('routeOff').value
    });
    showMsg(msg, 'Route added.', 'success');
    document.getElementById('routeForm').reset();
    loadRoutes();
  } catch (err) { showMsg(msg, err.message); }
});

async function deleteRoute(name) {
  if (!confirm(`Delete route "${name}"?`)) return;
  try { await apiRequest(`/routes/${name}`, 'DELETE'); loadRoutes(); }
  catch (err) { alert(err.message); }
}

// ---------- SCHEDULES ----------
async function loadBusesForSelect() {
  const buses = await apiRequest('/buses');
  const sel = document.getElementById('schedBus');
  sel.innerHTML = buses.map(b => `<option value="${b.bus_name}">${b.bus_name}</option>`).join('');
}

async function loadRoutesForSelect() {
  const routes = await apiRequest('/routes');
  const sel = document.getElementById('schedRoute');
  sel.innerHTML = routes.map(r => `<option value="${r.route_name}">${r.route_name}</option>`).join('');
}

async function loadSchedules() {
  try {
    const rows = await apiRequest('/schedules');
    const body = document.getElementById('scheduleBody');
    body.innerHTML = '';
    rows.forEach(s => {
      const tr = document.createElement('tr');
     tr.innerHTML = `
        <td>${s.bus_name}</td><td>${s.route_name}</td>
        <td>${new Date(s.travel_date).toLocaleDateString()}</td><td>${s.departure_time}</td>
        <td><span class="status-pill status-${s.status}">${s.status}</span></td>
        <td>
          <button class="btn btn-amber btn-small" onclick="generateStats(${s.schedule_id})">Generate Stats</button>
          <button class="btn btn-danger btn-small" onclick="deleteSchedule(${s.schedule_id})">Delete</button>
        </td>`;
      body.appendChild(tr);
    });
  } catch (err) { console.error(err); }
}

document.getElementById('scheduleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = document.getElementById('scheduleMsg');
  try {
    await apiRequest('/schedules', 'POST', {
      bus_name: document.getElementById('schedBus').value,
      route_name: document.getElementById('schedRoute').value,
      travel_date: document.getElementById('schedDate').value,
      departure_time: document.getElementById('schedTime').value
    });
    showMsg(msg, 'Schedule added. Seats generated automatically.', 'success');
    document.getElementById('scheduleForm').reset();
    loadSchedules();
  } catch (err) { showMsg(msg, err.message); }
});

async function deleteSchedule(id) {
  if (!confirm('Delete this schedule?')) return;
  try { await apiRequest(`/schedules/${id}`, 'DELETE'); loadSchedules(); }
  catch (err) { alert(err.message); }
}
async function generateStats(scheduleId) {
  try {
    const res = await apiRequest(`/stats/schedule/${scheduleId}`);
    alert(`Stats generated for schedule #${scheduleId}: ${res.totalBookings} confirmed booking(s). Saved to reservation_stats table.`);
  } catch (err) {
    alert(err.message);
  }
}
loadOverview();
