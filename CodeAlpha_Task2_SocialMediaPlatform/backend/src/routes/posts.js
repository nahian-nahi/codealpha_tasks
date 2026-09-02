const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

// Get Instagram/Facebook Stories Feed
router.get('/stories/list', (req, res) => {
  const stories = [
    {
      id: 1,
      username: 'barbie_president',
      display_name: 'President Barbie 👑',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      media_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
      caption: 'Leading with style & pink power! 💖✨',
      has_story: true,
      is_seen: false
    },
    {
      id: 2,
      username: 'ken_official',
      display_name: 'Ken 🏄‍♂️',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      media_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
      caption: 'Beach vibes all day! 🌊☀️',
      has_story: true,
      is_seen: false
    },
    {
      id: 3,
      username: 'fashion_barbie',
      display_name: 'Fashionista Barbie 👠',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      media_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
      caption: 'Paris Fashion Week OOTD 🛍️💖',
      has_story: true,
      is_seen: false
    },
    {
      id: 4,
      username: 'dev_barbie',
      display_name: 'Code Queen Barbie 💻',
      avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
      media_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
      caption: 'Building awesome UI with Node.js & Glassmorphism ⚡',
      has_story: true,
      is_seen: false
    }
  ];
  res.json({ stories });
});

// Get Posts Feed (All / For You / Following / User Specific)
router.get('/', optionalAuthenticateToken, (req, res) => {
  const currentUserId = req.user ? req.user.id : 0;
  const feedType = req.query.feed || 'for_you'; // 'for_you', 'following', or 'user'
  const targetUsername = req.query.username;

  let query = `
    SELECT 
      p.id, p.content, p.image_url, p.created_at,
      u.id AS user_id, u.username, u.display_name, u.avatar_url, u.is_verified,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked
    FROM posts p
    JOIN users u ON p.user_id = u.id
  `;

  const params = [currentUserId];

  if (feedType === 'following' && currentUserId > 0) {
    query += ` WHERE p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ?) OR p.user_id = ? `;
    params.push(currentUserId, currentUserId);
  } else if (feedType === 'user' && targetUsername) {
    query += ` WHERE u.username = ? `;
    params.push(targetUsername.toLowerCase());
  }

  query += ` ORDER BY p.created_at DESC LIMIT 30 `;

  db.all(query, params, (err, posts) => {
    if (err) {
      console.error('Error fetching posts:', err);
      return res.status(500).json({ error: 'Database query error fetching posts' });
    }

    const formattedPosts = posts.map(post => ({
      ...post,
      is_liked: Boolean(post.is_liked)
    }));

    res.json({ posts: formattedPosts });
  });
});

// Get Single Post Detail
router.get('/:id', optionalAuthenticateToken, (req, res) => {
  const postId = req.params.id;
  const currentUserId = req.user ? req.user.id : 0;

  const sql = `
    SELECT 
      p.id, p.content, p.image_url, p.created_at,
      u.id AS user_id, u.username, u.display_name, u.avatar_url, u.is_verified,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS likes_count,
      (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comments_count,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) AS is_liked
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
  `;

  db.get(sql, [currentUserId, postId], (err, post) => {
    if (err || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    post.is_liked = Boolean(post.is_liked);
    res.json({ post });
  });
});

// Create Post
router.post('/', authenticateToken, (req, res) => {
  const { content, image_url } = req.body;
  const userId = req.user.id;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Post content cannot be empty' });
  }

  const sql = `
    INSERT INTO posts (user_id, content, image_url)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [userId, content.trim(), image_url || ''], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to publish post' });
    }

    const newPostId = this.lastID;

    // Retrieve newly created post with author information
    const getSql = `
      SELECT 
        p.id, p.content, p.image_url, p.created_at,
        u.id AS user_id, u.username, u.display_name, u.avatar_url, u.is_verified,
        0 AS likes_count, 0 AS comments_count, 0 AS is_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `;

    db.get(getSql, [newPostId], (gErr, newPost) => {
      res.status(201).json({
        message: 'Post published ✨',
        post: newPost
      });
    });
  });
});

// Delete Post
router.delete('/:id', authenticateToken, (req, res) => {
  const postId = req.params.id;
  const userId = req.user.id;

  db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (err, post) => {
    if (err || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    db.run('DELETE FROM posts WHERE id = ?', [postId], (delErr) => {
      if (delErr) {
        return res.status(500).json({ error: 'Failed to delete post' });
      }
      res.json({ message: 'Post deleted successfully' });
    });
  });
});

// Toggle Like on Post
router.post('/:id/like', authenticateToken, (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const userId = req.user.id;

  db.get('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [postId, userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error checking like state' });
    }

    if (row) {
      // Unlike
      db.run('DELETE FROM likes WHERE id = ?', [row.id], (delErr) => {
        if (delErr) return res.status(500).json({ error: 'Failed to unlike' });

        db.get('SELECT COUNT(*) AS likes_count FROM likes WHERE post_id = ?', [postId], (cErr, result) => {
          res.json({ is_liked: false, likes_count: result ? result.likes_count : 0 });
        });
      });
    } else {
      // Like
      db.run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, userId], function (insErr) {
        if (insErr) return res.status(500).json({ error: 'Failed to like post' });

        // Get post author to send notification
        db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (pErr, post) => {
          if (post && post.user_id !== userId) {
            db.run('INSERT INTO notifications (user_id, sender_id, type, post_id) VALUES (?, ?, ?, ?)', [post.user_id, userId, 'like', postId]);
          }
        });

        db.get('SELECT COUNT(*) AS likes_count FROM likes WHERE post_id = ?', [postId], (cErr, result) => {
          res.json({ is_liked: true, likes_count: result ? result.likes_count : 0 });
        });
      });
    }
  });
});

module.exports = router;
