const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET all routes
router.get('/', verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM route');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch routes.' });
  }
});

// CREATE route (admin only)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { route_name, start_point, end_point, boarding_location, getting_off_location } = req.body;
    await pool.query(
      'INSERT INTO route (route_name, start_point, end_point, boarding_location, getting_off_location) VALUES (?, ?, ?, ?, ?)',
      [route_name, start_point, end_point, boarding_location, getting_off_location]
    );
    res.status(201).json({ message: 'Route created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to create route.' });
  }
});

// UPDATE route (admin only)
router.put('/:route_name', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { start_point, end_point, boarding_location, getting_off_location } = req.body;
    await pool.query(
      'UPDATE route SET start_point = ?, end_point = ?, boarding_location = ?, getting_off_location = ? WHERE route_name = ?',
      [start_point, end_point, boarding_location, getting_off_location, req.params.route_name]
    );
    res.json({ message: 'Route updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update route.' });
  }
});

// DELETE route (admin only)
router.delete('/:route_name', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM route WHERE route_name = ?', [req.params.route_name]);
    res.json({ message: 'Route deleted.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete route.' });
  }
});

module.exports = router;
