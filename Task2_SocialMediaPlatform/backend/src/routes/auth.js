const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Register User
router.post('/register', async (req, res) => {
  const { username, email, password, display_name, bio, avatar_url } = req.body;

  if (!username || !email || !password || !display_name) {
    return res.status(400).json({ error: 'Username, email, password, and display name are required' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters' });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const defaultAvatar = avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`;
    const defaultCover = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80';

    const sql = `
      INSERT INTO users (username, email, password_hash, display_name, bio, avatar_url, cover_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [cleanUsername, email.toLowerCase(), password_hash, display_name, bio || '', defaultAvatar, defaultCover], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: 'Database error creating user' });
      }

      const userId = this.lastID;
      const token = jwt.sign({ id: userId, username: cleanUsername }, JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        message: 'Account created successfully ✨',
        token,
        user: {
          id: userId,
          username: cleanUsername,
          email,
          display_name,
          bio: bio || '',
          avatar_url: defaultAvatar,
          cover_url: defaultCover
        }
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login User
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Please provide username and password' });
  }

  const cleanUsername = username.trim().toLowerCase();

  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [cleanUsername, cleanUsername], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Welcome back! 💖',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        cover_url: user.cover_url,
        is_verified: user.is_verified
      }
    });
  });
});

// Get Current Logged In User details
router.get('/me', authenticateToken, (req, res) => {
  db.get('SELECT id, username, email, display_name, bio, avatar_url, cover_url, is_verified, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  });
});

// Get list of demo users for one-click instant login
router.get('/demo-users', (req, res) => {
  db.all('SELECT id, username, display_name, avatar_url, bio FROM users LIMIT 10', [], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve demo users' });
    }
    res.json({ users });
  });
});

module.exports = router;
