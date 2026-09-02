const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, optionalAuthenticateToken } = require('../middleware/auth');

// Get Comments for a Post
router.get('/post/:postId', optionalAuthenticateToken, (req, res) => {
  const postId = req.params.postId;

  const sql = `
    SELECT 
      c.id, c.content, c.created_at, c.post_id,
      u.id AS user_id, u.username, u.display_name, u.avatar_url, u.is_verified
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `;

  db.all(sql, [postId], (err, comments) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch comments' });
    }
    res.json({ comments });
  });
});

// Add Comment to Post
router.post('/post/:postId', authenticateToken, (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.id;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment content cannot be empty' });
  }

  const sql = `
    INSERT INTO comments (post_id, user_id, content)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [postId, userId, content.trim()], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to add comment' });
    }

    const commentId = this.lastID;

    // Send notification to post author
    db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (pErr, post) => {
      if (post && post.user_id !== userId) {
        db.run('INSERT INTO notifications (user_id, sender_id, type, post_id) VALUES (?, ?, ?, ?)', [post.user_id, userId, 'comment', postId]);
      }
    });

    // Fetch newly created comment with author details
    const getSql = `
      SELECT 
        c.id, c.content, c.created_at, c.post_id,
        u.id AS user_id, u.username, u.display_name, u.avatar_url, u.is_verified
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `;

    db.get(getSql, [commentId], (gErr, newComment) => {
      // Get updated comment count
      db.get('SELECT COUNT(*) AS count FROM comments WHERE post_id = ?', [postId], (cErr, cResult) => {
        res.status(201).json({
          message: 'Comment added ✨',
          comment: newComment,
          comments_count: cResult ? cResult.count : 0
        });
      });
    });
  });
});

// Delete Comment
router.delete('/:id', authenticateToken, (req, res) => {
  const commentId = req.params.id;
  const userId = req.user.id;

  db.get('SELECT user_id, post_id FROM comments WHERE id = ?', [commentId], (err, comment) => {
    if (err || !comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    db.run('DELETE FROM comments WHERE id = ?', [commentId], (delErr) => {
      if (delErr) {
        return res.status(500).json({ error: 'Failed to delete comment' });
      }

      db.get('SELECT COUNT(*) AS count FROM comments WHERE post_id = ?', [comment.post_id], (cErr, cResult) => {
        res.json({ message: 'Comment deleted', comments_count: cResult ? cResult.count : 0 });
      });
    });
  });
});

module.exports = router;
