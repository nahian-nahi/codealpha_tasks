const express = require('express');
const router = express.Router();
const { query, get, run } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Create column for a project
router.post('/projects/:projectId/columns', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Column name is required.' });
    }

    const maxPos = await get('SELECT MAX(position) as max_pos FROM columns WHERE project_id = ?', [projectId]);
    const nextPos = (maxPos && maxPos.max_pos !== null) ? maxPos.max_pos + 1 : 0;

    const result = await run(
      'INSERT INTO columns (project_id, name, position) VALUES (?, ?, ?)',
      [projectId, name.trim(), nextPos]
    );

    const newCol = { id: result.id, project_id: parseInt(projectId), name: name.trim(), position: nextPos };

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('column_created', newCol);
    }

    res.status(201).json(newCol);
  } catch (err) {
    console.error('Create column error:', err);
    res.status(500).json({ error: 'Failed to create column.' });
  }
});

// Update column (rename / reorder)
router.put('/columns/:id', authenticateToken, async (req, res) => {
  try {
    const columnId = req.params.id;
    const { name, position } = req.body;

    const col = await get('SELECT * FROM columns WHERE id = ?', [columnId]);
    if (!col) {
      return res.status(404).json({ error: 'Column not found.' });
    }

    const updatedName = name !== undefined ? name.trim() : col.name;
    const updatedPos = position !== undefined ? position : col.position;

    await run('UPDATE columns SET name = ?, position = ? WHERE id = ?', [updatedName, updatedPos, columnId]);

    const updatedCol = { ...col, name: updatedName, position: updatedPos };

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${col.project_id}`).emit('column_updated', updatedCol);
    }

    res.json(updatedCol);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update column.' });
  }
});

// Delete column
router.delete('/columns/:id', authenticateToken, async (req, res) => {
  try {
    const columnId = req.params.id;
    const col = await get('SELECT * FROM columns WHERE id = ?', [columnId]);
    if (!col) {
      return res.status(404).json({ error: 'Column not found.' });
    }

    await run('DELETE FROM columns WHERE id = ?', [columnId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${col.project_id}`).emit('column_deleted', { columnId: parseInt(columnId) });
    }

    res.json({ message: 'Column deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete column.' });
  }
});

module.exports = router;
