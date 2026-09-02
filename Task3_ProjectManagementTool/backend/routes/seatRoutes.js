const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET all seats for a bus, with live booking status for a given schedule
router.get('/bus/:bus_name/schedule/:schedule_id', verifyToken, async (req, res) => {
  try {
    const { bus_name, schedule_id } = req.params;
    const [rows] = await pool.query(
    `SELECT s.seat_id, s.seat_number,
              CASE WHEN r.reservation_id IS NOT NULL AND r.reservation_status = 'confirmed'
                   THEN 'booked' ELSE 'available' END AS seat_status,
              -- Before booking: show the seat's own restriction (set by admin, defaults to 'any').
              -- After booking: show the actual booker's gender, for THIS trip only.
              CASE WHEN r.reservation_id IS NOT NULL AND r.reservation_status = 'confirmed'
                   THEN u.gender ELSE s.gender_type END AS gender_type
       FROM seat s
       LEFT JOIN reservation r
         ON r.seat_id = s.seat_id AND r.schedule_id = ? AND r.reservation_status = 'confirmed'
       LEFT JOIN user u ON r.user_id = u.user_id
       WHERE s.bus_name = ?
       ORDER BY s.seat_id`,
      [schedule_id, bus_name]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch seats.' });
  }
});

// UPDATE seat gender restriction / color (admin only)
router.put('/:seat_id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { gender_type } = req.body;
    await pool.query('UPDATE seat SET gender_type = ? WHERE seat_id = ?', [
      gender_type,
      req.params.seat_id
    ]);
    res.json({ message: 'Seat updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update seat.' });
  }
});

module.exports = router;
