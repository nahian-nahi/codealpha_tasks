const currentDriver = requireRole(['driver']);
document.getElementById('driverBadge').textContent = `${currentDriver.name} · driver`;

async function loadTrips() {
  try {
    const trips = await apiRequest('/trip-status/my-schedule');
    const body = document.getElementById('tripBody');
    body.innerHTML = '';
    document.getElementById('tripEmpty').style.display = trips.length ? 'none' : 'block';

    trips.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.bus_name}</td>
        <td>${t.route_name} (${t.start_point} → ${t.end_point})</td>
        <td>${new Date(t.travel_date).toLocaleDateString()}</td>
        <td>${t.departure_time}</td>
        <td><span class="status-pill status-${t.status}">${t.status}</span></td>
        <td>
         <select id="statusSel-${t.schedule_id}">
            <option value="not_started" ${t.status === 'not_started' ? 'selected' : ''}>Not started</option>
            <option value="ongoing" ${t.status === 'ongoing' ? 'selected' : ''}>Ongoing</option>
            <option value="completed" ${t.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
          <button class="btn btn-amber btn-small" onclick="updateStatus(${t.schedule_id})" style="margin-top:6px;">Save</button>
          <button class="btn btn-danger btn-small" onclick="reportIssue(${t.schedule_id})" style="margin-top:6px;">Report Issue</button>
        </td>
      `;
      body.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function updateStatus(scheduleId) {
  const status = document.getElementById(`statusSel-${scheduleId}`).value;
  try {
    await apiRequest('/trip-status', 'POST', { schedule_id: scheduleId, status });
    loadTrips();
  } catch (err) {
    alert(err.message);
  }
}

async function reportIssue(scheduleId) {
  const issue = prompt('Describe the issue with the bus:');
  if (!issue) return;
  try {
    await apiRequest('/trip-status', 'POST', { schedule_id: scheduleId, status: 'ongoing', issue_report: issue });
    alert('Issue reported to admin.');
    loadTrips();
  } catch (err) {
    alert(err.message);
  }
}

loadTrips();
