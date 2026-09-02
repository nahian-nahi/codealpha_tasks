const express = require('express');
const router = express.Router();
const { query, get, run } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Get all projects for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const projects = await query(
      `SELECT p.*, pm.role, u.name as owner_name 
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       JOIN users u ON p.owner_id = u.id
       WHERE pm.user_id = ?
       ORDER BY p.created_at DESC`,
      [userId]
    );

    // Attach count of members and tasks
    for (let p of projects) {
      const memberCount = await get('SELECT COUNT(*) as count FROM project_members WHERE project_id = ?', [p.id]);
      const taskCount = await get('SELECT COUNT(*) as count FROM tasks WHERE project_id = ?', [p.id]);
      p.member_count = memberCount.count;
      p.task_count = taskCount.count;
    }

    res.json(projects);
  } catch (err) {
    console.error('Fetch projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects.' });
  }
});

// Create a new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, color } = req.body;
    const ownerId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required.' });
    }

    const projResult = await run(
      'INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)',
      [name.trim(), description || '', color || '#3b82f6', ownerId]
    );

    const projectId = projResult.id;

    // Add owner to project_members
    await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [projectId, ownerId, 'owner']);

    // Create default columns
    const defaultCols = ['To Do', 'In Progress', 'In Review', 'Done'];
    for (let i = 0; i < defaultCols.length; i++) {
      await run('INSERT INTO columns (project_id, name, position) VALUES (?, ?, ?)', [projectId, defaultCols[i], i]);
    }

    const project = await get(
      `SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?`,
      [projectId]
    );

    const io = req.app.get('io');
    if (io) {
      io.emit('project_created', project);
    }

    res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Failed to create project.' });
  }
});

// Get single project details (with columns, tasks, members)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.id;

    // Check membership
    const membership = await get('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    if (!membership) {
      return res.status(403).json({ error: 'You do not have access to this project.' });
    }

    const project = await get(
      `SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?`,
      [projectId]
    );

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    // Members
    const members = await query(
      `SELECT u.id, u.name, u.email, u.avatar, pm.role 
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ?`,
      [projectId]
    );

    // Columns
    const columns = await query('SELECT * FROM columns WHERE project_id = ? ORDER BY position ASC', [projectId]);

    // Tasks for project
    const tasks = await query('SELECT * FROM tasks WHERE project_id = ? ORDER BY position ASC', [projectId]);

    for (let t of tasks) {
      // Assignees
      t.assignees = await query(
        `SELECT u.id, u.name, u.email, u.avatar 
         FROM task_assignees ta 
         JOIN users u ON ta.user_id = u.id 
         WHERE ta.task_id = ?`,
        [t.id]
      );

      // Checklist stats
      const checklistStats = await get(
        `SELECT COUNT(*) as total, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed 
         FROM checklists WHERE task_id = ?`,
        [t.id]
      );
      t.checklist_total = checklistStats.total || 0;
      t.checklist_completed = checklistStats.completed || 0;

      // Comment count
      const commentCount = await get('SELECT COUNT(*) as count FROM comments WHERE task_id = ?', [t.id]);
      t.comment_count = commentCount.count;
    }

    project.user_role = membership.role;
    project.members = members;
    project.columns = columns;
    project.tasks = tasks;

    res.json(project);
  } catch (err) {
    console.error('Get project details error:', err);
    res.status(500).json({ error: 'Failed to fetch project details.' });
  }
});

// Update project
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { name, description, color } = req.body;

    const membership = await get('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, req.user.id]);
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Only owners or admins can edit project settings.' });
    }

    await run(
      'UPDATE projects SET name = ?, description = ?, color = ? WHERE id = ?',
      [name, description, color, projectId]
    );

    const updatedProject = await get('SELECT * FROM projects WHERE id = ?', [projectId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('project_updated', updatedProject);
    }

    res.json(updatedProject);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update project.' });
  }
});

// Add member to project
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const { userId, role } = req.body;

    const membership = await get('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, req.user.id]);
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Only project owners or admins can add members.' });
    }

    const existing = await get('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, userId]);
    if (existing) {
      return res.status(400).json({ error: 'User is already a member of this project.' });
    }

    await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [projectId, userId, role || 'member']);

    const newMember = await get(
      `SELECT u.id, u.name, u.email, u.avatar, pm.role 
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = ? AND pm.user_id = ?`,
      [projectId, userId]
    );

    // Create notification for added user
    const project = await get('SELECT name FROM projects WHERE id = ?', [projectId]);
    await run(
      'INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)',
      [userId, 'Added to Project', `${req.user.name} added you to project "${project.name}"`, `#project-${projectId}`]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('member_added', { projectId, member: newMember });
      io.emit('user_notification', { userId, title: 'Added to Project', message: `${req.user.name} added you to project "${project.name}"` });
    }

    res.status(201).json(newMember);
  } catch (err) {
    console.error('Add member error:', err);
    res.status(500).json({ error: 'Failed to add project member.' });
  }
});

// Delete project
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const projectId = req.params.id;
    const membership = await get('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, req.user.id]);
    if (!membership || membership.role !== 'owner') {
      return res.status(403).json({ error: 'Only the project owner can delete this project.' });
    }

    await run('DELETE FROM projects WHERE id = ?', [projectId]);

    const io = req.app.get('io');
    if (io) {
      io.to(`project_${projectId}`).emit('project_deleted', { projectId });
    }

    res.json({ message: 'Project deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete project.' });
  }
});

module.exports = router;
