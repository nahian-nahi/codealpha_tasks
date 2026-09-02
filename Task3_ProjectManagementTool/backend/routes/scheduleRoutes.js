const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET all schedules, with bus/route info joined
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, b.total_seats, r.start_point, r.end_point
      FROM schedule s
      JOIN bus b ON s.bus_name = b.bus_name
      JOIN route r ON s.route_name = r.route_name
      ORDER BY s.travel_date, s.departure_time
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch schedules.' });
  }
});

// GET single schedule
router.get('/:schedule_id', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM schedule WHERE schedule_id = ?', [req.params.schedule_id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Schedule not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch schedule.' });
  }
});

// CREATE schedule (admin only)
// Business rule: seats open 2 hours before departure; for morning trips (before 12 PM) they open at 12:00 AM.
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { bus_name, route_name, departure_time, travel_date } = req.body;

    const [hourStr] = departure_time.split(':');
    const departureHour = parseInt(hourStr, 10);

    let reservationOpenTime;
    if (departureHour < 12) {
      // Morning trip: opens at midnight of travel date
      reservationOpenTime = `${travel_date} 00:00:00`;
    } else {
      // Opens 2 hours before departure
      const departureDateTime = new Date(`${travel_date}T${departure_time}`);
      departureDateTime.setHours(departureDateTime.getHours() - 2);
      reservationOpenTime = departureDateTime.toISOString().slice(0, 19).replace('T', ' ');
    }

    const [result] = await pool.query(
      'INSERT INTO schedule (bus_name, route_name, admin_id, departure_time, travel_date, reservation_open_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [bus_name, route_name, req.user.id, departure_time, travel_date, reservationOpenTime, 'scheduled']
    );

    // Auto-generate seats for this bus if they don't already exist
    const [bus] = await pool.query('SELECT total_seats FROM bus WHERE bus_name = ?', [bus_name]);
    const [existingSeats] = await pool.query('SELECT COUNT(*) AS cnt FROM seat WHERE bus_name = ?', [bus_name]);

    if (bus.length && existingSeats[0].cnt === 0) {
      const totalSeats = bus[0].total_seats;
      const values = [];
      for (let i = 1; i <= totalSeats; i++) {
        values.push([bus_name, `S${i}`, 'available', 'any']);
      }
      await pool.query(
        'INSERT INTO seat (bus_name, seat_number, seat_status, gender_type) VALUES ?',
        [values]
      );
    }

    res.status(201).json({ message: 'Schedule created.', schedule_id: result.insertId, reservation_open_time: reservationOpenTime });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create schedule.' });
  }
});

// UPDATE schedule (admin only)
router.put('/:schedule_id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { departure_time, travel_date, status } = req.body;
    await pool.query(
      'UPDATE schedule SET departure_time = ?, travel_date = ?, status = ? WHERE schedule_id = ?',
      [departure_time, travel_date, status, req.params.schedule_id]
    );
    res.json({ message: 'Schedule updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update schedule.' });
  }
});

// DELETE schedule (admin only)
router.delete('/:schedule_id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM schedule WHERE schedule_id = ?', [req.params.schedule_id]);
    res.json({ message: 'Schedule deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete schedule.' });
  }
});

module.exports = router;