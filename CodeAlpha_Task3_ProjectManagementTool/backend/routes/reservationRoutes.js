const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

// GET my reservations (logged-in user)
router.get('/my', verifyToken, requireRole('student', 'teacher', 'official'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT res.*, sc.travel_date, sc.departure_time, se.seat_number, b.bus_name, rt.route_name
       FROM reservation res
       JOIN schedule sc ON res.schedule_id = sc.schedule_id
       JOIN seat se ON res.seat_id = se.seat_id
       JOIN bus b ON sc.bus_name = b.bus_name
       JOIN route rt ON sc.route_name = rt.route_name
       WHERE res.user_id = ?
       ORDER BY res.reservation_time DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch your reservations.' });
  }
});

// CREATE reservation (book a seat) — the core FCFS booking flow
router.post('/', verifyToken, requireRole('student', 'teacher', 'official'), async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { seat_id, schedule_id } = req.body;
    const userId = req.user.id;

    await connection.beginTransaction();

    // 1. Confirm schedule exists and reservation window is open
    const [scheduleRows] = await connection.query(
      'SELECT * FROM schedule WHERE schedule_id = ? FOR UPDATE',
      [schedule_id]
    );
    if (scheduleRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Schedule not found.' });
    }
    const schedule = scheduleRows[0];

    const now = new Date();
    if (schedule.reservation_open_time && now < new Date(schedule.reservation_open_time)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Reservations are not open yet for this trip.' });
    }
    if (schedule.status !== 'scheduled') {
      await connection.rollback();
      return res.status(400).json({ message: 'This trip is not available for booking.' });
    }

    // 2. Enforce: one seat per user per schedule
    const [already] = await connection.query(
      "SELECT * FROM reservation WHERE user_id = ? AND schedule_id = ? AND reservation_status = 'confirmed'",
      [userId, schedule_id]
    );
    if (already.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'You already have a reservation for this trip.' });
    }

    // 3. Lock the seat row and confirm it is free + gender-compatible
    const [seatRows] = await connection.query('SELECT * FROM seat WHERE seat_id = ? FOR UPDATE', [seat_id]);
    if (seatRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Seat not found.' });
    }
    const seat = seatRows[0];

    const [userRows] = await connection.query('SELECT gender FROM user WHERE user_id = ?', [userId]);
    const userGender = userRows[0].gender;

    if (seat.gender_type !== 'any' && seat.gender_type !== userGender) {
      await connection.rollback();
      return res.status(400).json({ message: `This seat is reserved for ${seat.gender_type} passengers.` });
    }

    const [conflict] = await connection.query(
      "SELECT * FROM reservation WHERE seat_id = ? AND schedule_id = ? AND reservation_status = 'confirmed' FOR UPDATE",
      [seat_id, schedule_id]
    );
    if (conflict.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'This seat was just booked by someone else. Please pick another.' });
    }

    // 4. Determine FCFS order (count of confirmed reservations so far + 1)
    const [countRows] = await connection.query(
      "SELECT COUNT(*) AS cnt FROM reservation WHERE schedule_id = ? AND reservation_status = 'confirmed'",
      [schedule_id]
    );
    const fcfsOrder = countRows[0].cnt + 1;
    const receiptNo = `RCPT-${schedule_id}-${Date.now()}`;

    const [result] = await connection.query(
      'INSERT INTO reservation (user_id, seat_id, schedule_id, reservation_status, receipt_no, fcfs_order) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, seat_id, schedule_id, 'confirmed', receiptNo, fcfsOrder]
    );

    await connection.commit();

    res.status(201).json({
      message: 'Seat reserved successfully!',
      reservation_id: result.insertId,
      receipt_no: receiptNo,
      fcfs_order: fcfsOrder
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to complete reservation.' });
  } finally {
    connection.release();
  }
});

// CANCEL reservation (owner only)
router.put('/:reservation_id/cancel', verifyToken, requireRole('student', 'teacher', 'official'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM reservation WHERE reservation_id = ?', [req.params.reservation_id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Reservation not found.' });
    if (rows[0].user_id !== req.user.id) return res.status(403).json({ message: 'Not your reservation.' });

    await pool.query("UPDATE reservation SET reservation_status = 'cancelled' WHERE reservation_id = ?", [
      req.params.reservation_id
    ]);
    res.json({ message: 'Reservation cancelled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel reservation.' });
  }
});

// GET all reservations for a schedule (admin only)
router.get('/schedule/:schedule_id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT res.*, u.name AS user_name, u.email, se.seat_number
       FROM reservation res
       JOIN user u ON res.user_id = u.user_id
       JOIN seat se ON res.seat_id = se.seat_id
       WHERE res.schedule_id = ?
       ORDER BY res.fcfs_order`,
      [req.params.schedule_id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch reservations.' });
  }
});

module.exports = router;
