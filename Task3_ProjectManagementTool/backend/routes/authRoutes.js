const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

const TOKEN_EXPIRY = '8h';

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// ---------- USER REGISTER (student / teacher / official) ----------
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, gender, role, phone_no } = req.body;

    if (!name || !email || !password || !gender || !role) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    if (!['student', 'teacher', 'official'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const [existing] = await pool.query('SELECT user_id FROM user WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Email is already registered.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO user (name, email, password, gender, role, phone_no) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, hashed, gender, role, phone_no || null]
    );

    res.status(201).json({ message: 'Registration successful.', user_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ---------- USER LOGIN ----------
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM user WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = makeToken({ id: user.user_id, name: user.name, role: user.role, userType: 'user' });
    res.json({
      message: 'Login successful.',
      token,
      user: { id: user.user_id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ---------- ADMIN LOGIN ----------
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM admin WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = makeToken({ id: admin.admin_id, name: admin.name, role: 'admin', userType: 'admin' });
    res.json({
      message: 'Login successful.',
      token,
      user: { id: admin.admin_id, name: admin.name, email: admin.email, role: 'admin' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ---------- DRIVER LOGIN (by driver_id + contact_no as simple credential) ----------
router.post('/driver/login', async (req, res) => {
  try {
    const { driver_id, contact_no } = req.body;
    const [rows] = await pool.query(
      'SELECT * FROM driver WHERE driver_id = ? AND contact_no = ?',
      [driver_id, contact_no]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid driver ID or contact number.' });
    }

    const driver = rows[0];
    const token = makeToken({ id: driver.driver_id, name: driver.name, role: 'driver', userType: 'driver' });
    res.json({
      message: 'Login successful.',
      token,
      user: { id: driver.driver_id, name: driver.name, role: 'driver' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

module.exports = router;
