const express = require('express');
const router = express.Router();
const { query, get, run } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Create task card
router.post('/projects/:projectId/tasks', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { column_id, title, description, priority, due_date, assignees } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim() || !column_id) {
      return res.status(400).json({ error: 'Task title and target column are required.' });
    }

    // Get max position in column
    const maxPos = await get('SELECT MAX(position) as max_pos FROM tasks WHERE column_id = ?', [column_id]);
    const nextPos = (maxPos && maxPos.max_pos !== null) ? maxPos.max_pos + 1 : 0;

    const taskResult = await run(
      `INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [column_id, projectId, title.trim(), description || '', priority || 'medium', due_date || null, nextPos, userId]
    );

    const taskId = taskResult.id;

    // Handle initial assignees if provided
    if (Array.isArray(assignees) && assignees.length > 0) {
      for (let uId of assignees) {
        await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [taskId, uId]);

        // Send notification
        if (uId !== userId) {
          const project = await get('SELECT name FROM projects WHERE id = ?', [projectId]);
          await run(
            'INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)',
            [uId, 'Assigned to Task', `${req.user.name} assigned you to "${title.trim()}" in ${project.name}`, `#task-${taskId}`]
          );

          const io = req.app.get('io');
          if (io) {
            io.emit('user_notification', {
              userId: uId,
              title: 'Assigned to Task',
              message: `${req.user.name} assigned you to "${title.trim()}" in ${project.name}`
            });
          }
        }
      }
    }

    // Fetch newly created task with full info
    const newTask = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    newTask.assignees = await query(
      `SELECT u.id, u.name, u.email, u.avatar FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?`,
      [taskId]
    );
    newTask.checklist_total = 0;
    newTask.checklist_completed = 0;
    newTask.comment_count = 0;

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('task_created', newTask);
    }

    res.status(201).json(newTask);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task card.' });
  }
});

// Get task details (with assignees, checklist, comments, creator)
router.get('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await get('SELECT t.*, u.name as creator_name FROM tasks t JOIN users u ON t.created_by = u.id WHERE t.id = ?', [taskId]);

    if (!task) {
      return res.status(404).json({ error: 'Task card not found.' });
    }

    // Assignees
    task.assignees = await query(
      `SELECT u.id, u.name, u.email, u.avatar FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?`,
      [taskId]
    );

    // Checklists
    task.checklists = await query('SELECT * FROM checklists WHERE task_id = ? ORDER BY position ASC, id ASC', [taskId]);

    // Comments
    task.comments = await query(
      `SELECT c.*, u.name as user_name, u.avatar as user_avatar 
       FROM comments c 
       JOIN users u ON c.user_id = u.id 
       WHERE c.task_id = ? 
       ORDER BY c.created_at ASC`,
      [taskId]
    );

    res.json(task);
  } catch (err) {
    console.error('Get task details error:', err);
    res.status(500).json({ error: 'Failed to fetch task details.' });
  }
});

// Update task attributes (title, description, priority, due_date)
router.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, priority, due_date } = req.body;

    const existing = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await run(
      `UPDATE tasks 
       SET title = ?, description = ?, priority = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [
        title !== undefined ? title.trim() : existing.title,
        description !== undefined ? description : existing.description,
        priority || existing.priority,
        due_date !== undefined ? due_date : existing.due_date,
        taskId
      ]
    );

    const updatedTask = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    updatedTask.assignees = await query(
      `SELECT u.id, u.name, u.email, u.avatar FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?`,
      [taskId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${existing.project_id}`).emit('task_updated', updatedTask);
    }

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// Move task between columns or update position
router.put('/tasks/:id/move', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { column_id, position } = req.body;

    const existing = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const targetColumnId = column_id !== undefined ? column_id : existing.column_id;
    const targetPos = position !== undefined ? position : 0;

    await run(
      'UPDATE tasks SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [targetColumnId, targetPos, taskId]
    );

    const updatedTask = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    updatedTask.assignees = await query(
      `SELECT u.id, u.name, u.email, u.avatar FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?`,
      [taskId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${existing.project_id}`).emit('task_moved', {
        taskId: parseInt(taskId),
        fromColumnId: existing.column_id,
        toColumnId: targetColumnId,
        position: targetPos,
        task: updatedTask,
        movedBy: req.user.name
      });
    }

    res.json(updatedTask);
  } catch (err) {
    console.error('Move task error:', err);
    res.status(500).json({ error: 'Failed to move task.' });
  }
});

// Assign user to task
router.post('/tasks/:id/assignees', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { userId } = req.body;

    const task = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const existingAssignee = await get('SELECT * FROM task_assignees WHERE task_id = ? AND user_id = ?', [taskId, userId]);
    if (!existingAssignee) {
      await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [taskId, userId]);
    }

    const assignees = await query(
      `SELECT u.id, u.name, u.email, u.avatar FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?`,
      [taskId]
    );

    // Notify user
    if (userId !== req.user.id) {
      const project = await get('SELECT name FROM projects WHERE id = ?', [task.project_id]);
      await run(
        'INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)',
        [userId, 'Assigned to Task', `${req.user.name} assigned you to task "${task.title}" in ${project.name}`, `#task-${taskId}`]
      );

      const io = req.app.get('io');
      if (io) {
        io.emit('user_notification', {
          userId,
          title: 'Assigned to Task',
          message: `${req.user.name} assigned you to task "${task.title}" in ${project.name}`
        });
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${task.project_id}`).emit('task_assignees_updated', { taskId: parseInt(taskId), assignees });
    }

    res.json(assignees);
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign user to task.' });
  }
});

// Remove assignee from task
router.delete('/tasks/:id/assignees/:userId', authenticateToken, async (req, res) => {
  try {
    const { id: taskId, userId } = req.params;
    const task = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    await run('DELETE FROM task_assignees WHERE task_id = ? AND user_id = ?', [taskId, userId]);

    const assignees = await query(
      `SELECT u.id, u.name, u.email, u.avatar FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?`,
      [taskId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${task.project_id}`).emit('task_assignees_updated', { taskId: parseInt(taskId), assignees });
    }

    res.json(assignees);
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove assignee.' });
  }
});

// Checklist CRUD
router.post('/tasks/:id/checklists', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Checklist item title is required.' });
    }

    const task = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    const maxPos = await get('SELECT MAX(position) as max_pos FROM checklists WHERE task_id = ?', [taskId]);
    const nextPos = (maxPos && maxPos.max_pos !== null) ? maxPos.max_pos + 1 : 0;

    const result = await run(
      'INSERT INTO checklists (task_id, title, completed, position) VALUES (?, ?, 0, ?)',
      [taskId, title.trim(), nextPos]
    );

    const item = { id: result.id, task_id: parseInt(taskId), title: title.trim(), completed: 0, position: nextPos };

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${task.project_id}`).emit('checklist_updated', { taskId: parseInt(taskId) });
    }

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add checklist item.' });
  }
});

router.put('/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const checklistId = req.params.id;
    const { title, completed } = req.body;

    const item = await get('SELECT * FROM checklists WHERE id = ?', [checklistId]);
    if (!item) return res.status(404).json({ error: 'Checklist item not found.' });

    const task = await get('SELECT * FROM tasks WHERE id = ?', [item.task_id]);

    const newTitle = title !== undefined ? title.trim() : item.title;
    const newCompleted = completed !== undefined ? (completed ? 1 : 0) : item.completed;

    await run('UPDATE checklists SET title = ?, completed = ? WHERE id = ?', [newTitle, newCompleted, checklistId]);

    const updatedItem = { ...item, title: newTitle, completed: newCompleted };

    const io = req.app.get('io');
    if (io && task) {
      io.to(`project_${task.project_id}`).emit('checklist_updated', { taskId: item.task_id });
    }

    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update checklist item.' });
  }
});

router.delete('/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const checklistId = req.params.id;
    const item = await get('SELECT * FROM checklists WHERE id = ?', [checklistId]);
    if (!item) return res.status(404).json({ error: 'Checklist item not found.' });

    const task = await get('SELECT * FROM tasks WHERE id = ?', [item.task_id]);

    await run('DELETE FROM checklists WHERE id = ?', [checklistId]);

    const io = req.app.get('io');
    if (io && task) {
      io.to(`project_${task.project_id}`).emit('checklist_updated', { taskId: item.task_id });
    }

    res.json({ message: 'Checklist item deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete checklist item.' });
  }
});

// Delete task card
router.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) return res.status(404).json({ error: 'Task not found.' });

    await run('DELETE FROM tasks WHERE id = ?', [taskId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${task.project_id}`).emit('task_deleted', { taskId: parseInt(taskId), columnId: task.column_id });
    }

    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

module.exports = router;
