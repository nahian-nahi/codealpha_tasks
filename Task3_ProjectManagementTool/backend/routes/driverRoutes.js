const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET all drivers (admin only)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM driver');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch drivers.' });
  }
});

// GET single driver (admin or the driver themselves)
router.get('/:driver_id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && String(req.user.id) !== req.params.driver_id) {
      return res.status(403).json({ message: 'Not allowed.' });
    }
    const [rows] = await pool.query('SELECT * FROM driver WHERE driver_id = ?', [req.params.driver_id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Driver not found.' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch driver.' });
  }
});

// CREATE driver (admin only)
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, contact_no, license_no, address, status } = req.body;
    const [result] = await pool.query(
      'INSERT INTO driver (name, contact_no, license_no, address, status, admin_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, contact_no, license_no, address, status || 'active', req.user.id]
    );
    res.status(201).json({ message: 'Driver added.', driver_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add driver.' });
  }
});

// UPDATE driver (admin only)
router.put('/:driver_id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, contact_no, license_no, address, status } = req.body;
    await pool.query(
      'UPDATE driver SET name = ?, contact_no = ?, license_no = ?, address = ?, status = ? WHERE driver_id = ?',
      [name, contact_no, license_no, address, status, req.params.driver_id]
    );
    res.json({ message: 'Driver updated.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update driver.' });
  }
});

// DELETE driver (admin only)
router.delete('/:driver_id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM driver WHERE driver_id = ?', [req.params.driver_id]);
    res.json({ message: 'Driver removed.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to remove driver.' });
  }
});

module.exports = router;
