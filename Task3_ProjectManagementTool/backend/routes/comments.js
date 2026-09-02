const express = require('express');
const router = express.Router();
const { query, get, run } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Fetch comments for a task
router.get('/tasks/:taskId/comments', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const comments = await query(
      `SELECT c.*, u.name as user_name, u.avatar as user_avatar 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.task_id = ? 
       ORDER BY c.created_at ASC`,
      [taskId]
    );
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch task comments.' });
  }
});

// Add comment to task
router.post('/tasks/:taskId/comments', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    const task = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ error: 'Task card not found.' });
    }

    const result = await run(
      'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)',
      [taskId, userId, content.trim()]
    );

    const newComment = await get(
      `SELECT c.*, u.name as user_name, u.avatar as user_avatar 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.id = ?`,
      [result.id]
    );

    // Notify task assignees & creator
    const assignees = await query('SELECT user_id FROM task_assignees WHERE task_id = ?', [taskId]);
    const notifyUserIds = new Set(assignees.map(a => a.user_id));
    if (task.created_by) notifyUserIds.add(task.created_by);
    notifyUserIds.delete(userId); // Don't notify self

    const project = await get('SELECT name FROM projects WHERE id = ?', [task.project_id]);

    for (let uId of notifyUserIds) {
      await run(
        'INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)',
        [
          uId,
          'New Comment',
          `${req.user.name} commented on "${task.title}" in ${project ? project.name : 'Project'}`,
          `#task-${taskId}`
        ]
      );

      const io = req.app.get('io');
      if (io) {
        io.emit('user_notification', {
          userId: uId,
          title: 'New Comment',
          message: `${req.user.name} commented on "${task.title}"`
        });
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${task.project_id}`).emit('comment_added', {
        taskId: parseInt(taskId),
        comment: newComment
      });
    }

    res.status(201).json(newComment);
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ error: 'Failed to add comment.' });
  }
});

module.exports = router;
