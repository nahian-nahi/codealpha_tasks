const currentUser = requireRole(['student', 'teacher', 'official']);
document.getElementById('userNameBadge').textContent = `${currentUser.name} · ${currentUser.role}`;

let selectedSeatId = null;
let selectedScheduleId = null;

function showSection(name) {
  document.getElementById('section-trips').style.display = name === 'trips' ? 'block' : 'none';
  document.getElementById('section-mine').style.display = name === 'mine' ? 'block' : 'none';
  document.getElementById('seatCard').style.display = 'none';
  document.querySelectorAll('.topbar nav a').forEach(a => a.classList.remove('active'));
  event?.target?.classList.add('active');
  if (name === 'mine') loadMyReservations();
}

async function loadTrips() {
  try {
    const trips = await apiRequest('/schedules');
    const body = document.getElementById('tripsBody');
    body.innerHTML = '';
    document.getElementById('tripsEmpty').style.display = trips.length ? 'none' : 'block';

    trips.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.bus_name}</td>
        <td>${t.route_name} (${t.start_point} → ${t.end_point})</td>
        <td>${new Date(t.travel_date).toLocaleDateString()}</td>
        <td>${t.departure_time}</td>
        <td><span class="status-pill status-${t.status}">${t.status}</span></td>
        <td><button class="btn btn-amber btn-small" onclick="openSeatMap(${t.schedule_id}, '${t.bus_name}')">View Seats</button></td>
      `;
      body.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function openSeatMap(scheduleId, busName) {
  selectedScheduleId = scheduleId;
  selectedSeatId = null;
  document.getElementById('seatCard').style.display = 'block';
  document.getElementById('seatCardTitle').textContent = `Seat Map — ${busName}`;
  document.getElementById('confirmSeatBtn').disabled = true;
  document.getElementById('seatMsg').className = 'msg';
  document.getElementById('seatCard').scrollIntoView({ behavior: 'smooth' });

  try {
    const seats = await apiRequest(`/seats/bus/${busName}/schedule/${scheduleId}`);
    const map = document.getElementById('seatMap');
    map.innerHTML = '';
    seats.forEach(s => {
      const btn = document.createElement('button');
      const isBooked = s.seat_status === 'booked';
      btn.className = `seat ${s.gender_type}${isBooked ? ' booked' : ''}`;
      btn.textContent = s.seat_number;
      btn.disabled = isBooked;
      btn.onclick = () => selectSeat(s.seat_id, btn);
      map.appendChild(btn);
    });
  } catch (err) {
    console.error(err);
  }
}

function selectSeat(seatId, btn) {
  document.querySelectorAll('.seat').forEach(s => s.classList.remove('selected'));
  btn.classList.add('selected');
  selectedSeatId = seatId;
  document.getElementById('confirmSeatBtn').disabled = false;
}

document.getElementById('confirmSeatBtn').addEventListener('click', async () => {
  const msg = document.getElementById('seatMsg');
  try {
    const data = await apiRequest('/reservations', 'POST', {
      seat_id: selectedSeatId,
      schedule_id: selectedScheduleId
    });
    showMsg(msg, `Booked! Receipt: ${data.receipt_no} (FCFS #${data.fcfs_order})`, 'success');
    openSeatMap(selectedScheduleId, document.getElementById('seatCardTitle').textContent.split('— ')[1]);
  } catch (err) {
    showMsg(msg, err.message);
  }
});

async function loadMyReservations() {
  try {
    const rows = await apiRequest('/reservations/my');
    const body = document.getElementById('myBody');
    body.innerHTML = '';
    document.getElementById('myEmpty').style.display = rows.length ? 'none' : 'block';

    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.bus_name}</td>
        <td>${r.route_name}</td>
        <td>${new Date(r.travel_date).toLocaleDateString()}</td>
        <td>${r.departure_time}</td>
        <td>${r.seat_number}</td>
        <td>${r.receipt_no}</td>
        <td><span class="status-pill status-${r.reservation_status}">${r.reservation_status}</span></td>
        <td>${r.reservation_status === 'confirmed'
          ? `<button class="btn btn-danger btn-small" onclick="cancelReservation(${r.reservation_id})">Cancel</button>`
          : ''}</td>
      `;
      body.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
  }
}

async function cancelReservation(id) {
  if (!confirm('Cancel this reservation?')) return;
  try {
    await apiRequest(`/reservations/${id}/cancel`, 'PUT');
    loadMyReservations();
  } catch (err) {
    alert(err.message);
  }
}

loadTrips();
