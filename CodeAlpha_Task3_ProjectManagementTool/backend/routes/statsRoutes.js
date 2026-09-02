const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET overall dashboard stats (admin only)
router.get('/overview', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM user');
    const [[{ totalBuses }]] = await pool.query('SELECT COUNT(*) AS totalBuses FROM bus');
    const [[{ totalDrivers }]] = await pool.query('SELECT COUNT(*) AS totalDrivers FROM driver');
    const [[{ totalBookings }]] = await pool.query(
      "SELECT COUNT(*) AS totalBookings FROM reservation WHERE reservation_status = 'confirmed'"
    );

    res.json({ totalUsers, totalBuses, totalDrivers, totalBookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch overview stats.' });
  }
});

// GET stats for a specific schedule (bookings, occupancy) - also writes a snapshot row
router.get('/schedule/:schedule_id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { schedule_id } = req.params;

    const [[{ totalBookings }]] = await pool.query(
      "SELECT COUNT(*) AS totalBookings FROM reservation WHERE schedule_id = ? AND reservation_status = 'confirmed'",
      [schedule_id]
    );

    await pool.query(
      'INSERT INTO reservation_stats (schedule_id, total_bookings) VALUES (?, ?)',
      [schedule_id, totalBookings]
    );

    res.json({ schedule_id, totalBookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch schedule stats.' });
  }
});

module.exports = router;
