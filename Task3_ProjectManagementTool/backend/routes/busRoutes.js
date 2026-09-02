const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET all buses (any logged-in user)
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bus');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch buses.' });
  }
});

// GET single bus
router.get('/:bus_name', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM bus WHERE bus_name = ?', [req.params.bus_name]);
    if (rows.length === 0) return res.status(404).json({ message: 'Bus not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch bus.' });
  }
});

// CREATE bus (admin only)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { bus_name, number_plate, total_seats, status, driver_id } = req.body;
    await pool.query(
      'INSERT INTO bus (bus_name, number_plate, total_seats, status, admin_id, driver_id) VALUES (?, ?, ?, ?, ?, ?)',
      [bus_name, number_plate, total_seats, status || 'active', req.user.id, driver_id || null]
    );
    res.status(201).json({ message: 'Bus created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create bus.' });
  }
});

// UPDATE bus (admin only)
router.put('/:bus_name', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { number_plate, total_seats, status, driver_id } = req.body;
    await pool.query(
      'UPDATE bus SET number_plate = ?, total_seats = ?, status = ?, driver_id = ? WHERE bus_name = ?',
      [number_plate, total_seats, status, driver_id || null, req.params.bus_name]
    );
    res.json({ message: 'Bus updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update bus.' });
  }
});

// DELETE bus (admin only)
router.delete('/:bus_name', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM bus WHERE bus_name = ?', [req.params.bus_name]);
    res.json({ message: 'Bus deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete bus.' });
  }
});

module.exports = router;
