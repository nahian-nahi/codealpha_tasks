const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// Simple in-memory flag for enabling/disabling the whole reservation system.
// (Good enough for a student project; for production you'd store this in the DB.)
let reservationSystemEnabled = true;

// GET current admin's profile
router.get('/profile', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT admin_id, name, email, cuet_card_no, contact_no FROM admin WHERE admin_id = ?',
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch profile.' });
  }
});

// UPDATE current admin's profile
router.put('/profile', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, cuet_card_no, contact_no } = req.body;
    await pool.query(
      'UPDATE admin SET name = ?, cuet_card_no = ?, contact_no = ? WHERE admin_id = ?',
      [name, cuet_card_no, contact_no, req.user.id]
    );
    res.json({ message: 'Profile updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update profile.' });
  }
});

// GET reservation system status (public - any logged-in user can check)
router.get('/system-status', verifyToken, (req, res) => {
  res.json({ enabled: reservationSystemEnabled });
});

// TOGGLE reservation system on/off (admin only)
router.put('/system-status', verifyToken, requireRole('admin'), (req, res) => {
  const { enabled } = req.body;
  reservationSystemEnabled = !!enabled;
  res.json({ message: `Reservation system ${enabled ? 'enabled' : 'disabled'}.`, enabled: reservationSystemEnabled });
});

module.exports = router;
