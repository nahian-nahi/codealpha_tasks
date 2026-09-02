const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');

// All order routes require the user to be logged in
router.use(requireAuth);

// ---------- POST /api/orders ----------
// body: { items: [{ product_id, quantity }], shipping_address }
router.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { items, shipping_address } = req.body;
    const userId = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    await connection.beginTransaction();

    let total = 0;
    const validatedItems = [];

    // Validate stock and compute total using live DB prices (never trust client-sent prices)
    for (const item of items) {
      const [rows] = await connection.query(
        'SELECT * FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );
      if (rows.length === 0) {
        throw new Error(`Product ${item.product_id} not found.`);
      }
      const product = rows[0];
      const qty = parseInt(item.quantity, 10);

      if (qty < 1) {
        throw new Error(`Invalid quantity for ${product.name}.`);
      }
      if (product.stock < qty) {
        throw new Error(`Not enough stock for "${product.name}". Only ${product.stock} left.`);
      }

      total += parseFloat(product.price) * qty;
      validatedItems.push({ product, qty });
    }

    // Create the order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total, status, shipping_address) VALUES (?, ?, ?, ?)',
      [userId, total.toFixed(2), 'pending', shipping_address || null]
    );
    const orderId = orderResult.insertId;

    // Insert order items and decrement stock
    for (const { product, qty } of validatedItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [orderId, product.id, product.name, qty, product.price]
      );
      await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [qty, product.id]
      );
    }

    await connection.commit();

    res.status(201).json({
      message: 'Order placed successfully.',
      order_id: orderId,
      total: total.toFixed(2)
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Server error while placing order.' });
  } finally {
    connection.release();
  }
});

// ---------- GET /api/orders ----------
// Returns the logged-in user's order history
router.get('/', async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching orders.' });
  }
});

// ---------- GET /api/orders/:id ----------
// Returns one order with its line items (only if it belongs to the logged-in user)
router.get('/:id', async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const [items] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [req.params.id]
    );

    res.json({ ...orders[0], items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching order.' });
  }
});

module.exports = router;
