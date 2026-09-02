const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET assigned schedules for the logged-in driver
router.get('/my-schedule', verifyToken, requireRole('driver'), async (req, res) => {
  try {
 const [rows] = await pool.query(
      `SELECT sc.schedule_id, sc.travel_date, sc.departure_time,
              b.bus_name, rt.route_name, rt.start_point, rt.end_point,
              COALESCE(ts.status, 'not_started') AS status
       FROM schedule sc
       JOIN bus b ON sc.bus_name = b.bus_name
       JOIN route rt ON sc.route_name = rt.route_name
       LEFT JOIN trip_status ts ON ts.schedule_id = sc.schedule_id AND ts.driver_id = ?
       WHERE b.driver_id = ?
       ORDER BY sc.travel_date, sc.departure_time`,
      [req.user.id, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch your schedule.' });
  }
});

// CREATE/UPDATE trip status (driver confirms trip started/ongoing/completed, or reports an issue)
router.post('/', verifyToken, requireRole('driver'), async (req, res) => {
  try {
    const { schedule_id, status, issue_report } = req.body;

    const [existing] = await pool.query(
      'SELECT * FROM trip_status WHERE schedule_id = ? AND driver_id = ?',
      [schedule_id, req.user.id]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE trip_status SET status = ?, issue_report = ?, updated_at = NOW() WHERE trip_id = ?',
        [status, issue_report || null, existing[0].trip_id]
      );
      return res.json({ message: 'Trip status updated.' });
    }

    await pool.query(
      'INSERT INTO trip_status (schedule_id, driver_id, status, issue_report) VALUES (?, ?, ?, ?)',
      [schedule_id, req.user.id, status || 'not_started', issue_report || null]
    );
    res.status(201).json({ message: 'Trip status recorded.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update trip status.' });
  }
});

// GET all trip statuses (admin only, for monitoring)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ts.*, d.name AS driver_name, sc.travel_date, sc.departure_time
       FROM trip_status ts
       JOIN driver d ON ts.driver_id = d.driver_id
       JOIN schedule sc ON ts.schedule_id = sc.schedule_id
       ORDER BY ts.updated_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch trip statuses.' });
  }
});

module.exports = router;
