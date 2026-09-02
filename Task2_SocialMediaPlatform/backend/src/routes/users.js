const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

// Get User Profile by Username
router.get('/profile/:username', optionalAuthenticateToken, (req, res) => {
  const username = req.params.username.toLowerCase();
  const currentUserId = req.user ? req.user.id : null;

  const userSql = `
    SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url, u.cover_url, u.is_verified, u.created_at,
      (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts_count,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) AS following_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) AS is_following
    FROM users u
    WHERE u.username = ?
  `;

  db.get(userSql, [currentUserId || 0, username], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database query error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    user.is_following = Boolean(user.is_following);
    res.json({ user });
  });
});

// Update Profile
router.put('/profile', authenticateToken, (req, res) => {
  const { display_name, bio, avatar_url, cover_url } = req.body;
  const userId = req.user.id;

  const sql = `
    UPDATE users
    SET display_name = COALESCE(?, display_name),
        bio = COALESCE(?, bio),
        avatar_url = COALESCE(?, avatar_url),
        cover_url = COALESCE(?, cover_url)
    WHERE id = ?
  `;

  db.run(sql, [display_name, bio, avatar_url, cover_url, userId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    res.json({ message: 'Profile updated successfully ✨' });
  });
});

// Follow / Unfollow User Toggle
router.post('/:id/follow', authenticateToken, (req, res) => {
  const targetUserId = parseInt(req.params.id, 10);
  const followerId = req.user.id;

  if (targetUserId === followerId) {
    return res.status(400).json({ error: 'You cannot follow yourself' });
  }

  // Check existing follow relationship
  db.get('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, targetUserId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error checking follow state' });
    }

    if (row) {
      // Unfollow
      db.run('DELETE FROM follows WHERE id = ?', [row.id], (delErr) => {
        if (delErr) return res.status(500).json({ error: 'Failed to unfollow user' });
        
        // Return updated follower count
        db.get('SELECT COUNT(*) AS followers_count FROM follows WHERE following_id = ?', [targetUserId], (cErr, result) => {
          res.json({ is_following: false, followers_count: result ? result.followers_count : 0, message: 'Unfollowed user' });
        });
      });
    } else {
      // Follow
      db.run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [followerId, targetUserId], function (insErr) {
        if (insErr) return res.status(500).json({ error: 'Failed to follow user' });

        // Add Notification
        db.run('INSERT INTO notifications (user_id, sender_id, type) VALUES (?, ?, ?)', [targetUserId, followerId, 'follow']);

        db.get('SELECT COUNT(*) AS followers_count FROM follows WHERE following_id = ?', [targetUserId], (cErr, result) => {
          res.json({ is_following: true, followers_count: result ? result.followers_count : 0, message: 'Followed user ✨' });
        });
      });
    }
  });
});

// Get Suggested Users to Follow
router.get('/suggestions/list', optionalAuthenticateToken, (req, res) => {
  const currentUserId = req.user ? req.user.id : 0;

  const sql = `
    SELECT u.id, u.username, u.display_name, u.avatar_url, u.bio, u.is_verified,
      (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND following_id = u.id) AS is_following
    FROM users u
    WHERE u.id != ?
    ORDER BY RANDOM()
    LIMIT 5
  `;

  db.all(sql, [currentUserId, currentUserId], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error fetching suggestions' });
    }
    const formatted = users.map(u => ({ ...u, is_following: Boolean(u.is_following) }));
    res.json({ suggestions: formatted });
  });
});

// Search Users
router.get('/search', (req, res) => {
  const query = req.query.q ? `%${req.query.q.trim()}%` : '';

  if (!query) {
    return res.json({ users: [] });
  }

  const sql = `
    SELECT id, username, display_name, avatar_url, bio, is_verified
    FROM users
    WHERE username LIKE ? OR display_name LIKE ?
    LIMIT 10
  `;

  db.all(sql, [query, query], (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Search error' });
    }
    res.json({ users });
  });
});

module.exports = router;
