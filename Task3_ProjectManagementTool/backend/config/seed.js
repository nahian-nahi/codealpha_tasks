const bcrypt = require('bcryptjs');
const { query, get, run } = require('./db');

const seedDatabase = async () => {
  try {
    const existingUsers = await query('SELECT COUNT(*) as count FROM users');
    if (existingUsers[0].count > 0) {
      console.log('Database already contains data. Skipping seed.');
      return;
    }

    console.log('Seeding database with sample projects and users...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // 1. Users
    const u1 = await run(
      'INSERT INTO users (name, email, password, avatar) VALUES (?, ?, ?, ?)',
      ['Alex Rivera', 'alex@example.com', hashedPassword, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150']
    );
    const u2 = await run(
      'INSERT INTO users (name, email, password, avatar) VALUES (?, ?, ?, ?)',
      ['Sarah Chen', 'sarah@example.com', hashedPassword, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150']
    );
    const u3 = await run(
      'INSERT INTO users (name, email, password, avatar) VALUES (?, ?, ?, ?)',
      ['Mike Vance', 'mike@example.com', hashedPassword, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150']
    );

    const alexId = u1.id;
    const sarahId = u2.id;
    const mikeId = u3.id;

    // 2. Project 1: NextGen E-Commerce
    const p1 = await run(
      'INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)',
      [
        'NextGen E-Commerce Platform',
        'Building a modern multi-tenant e-commerce suite with real-time checkout and analytics.',
        '#6366f1',
        alexId
      ]
    );
    const proj1Id = p1.id;

    // Members
    await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [proj1Id, alexId, 'owner']);
    await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [proj1Id, sarahId, 'admin']);
    await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [proj1Id, mikeId, 'member']);

    // Columns
    const colBacklog = await run('INSERT INTO columns (project_id, name, position) VALUES (?, ?, ?)', [proj1Id, 'Backlog', 0]);
    const colToDo = await run('INSERT INTO columns (project_id, name, position) VALUES (?, ?, ?)', [proj1Id, 'To Do', 1]);
    const colInProg = await run('INSERT INTO columns (project_id, name, position) VALUES (?, ?, ?)', [proj1Id, 'In Progress', 2]);
    const colReview = await run('INSERT INTO columns (project_id, name, position) VALUES (?, ?, ?)', [proj1Id, 'In Review', 3]);
    const colDone = await run('INSERT INTO columns (project_id, name, position) VALUES (?, ?, ?)', [proj1Id, 'Done', 4]);

    // Tasks for Project 1
    const t1 = await run(
      'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        colInProg.id,
        proj1Id,
        'Design Responsive Product Catalog',
        'Create Figma wireframes and implement CSS grid layout for high-density product grid with filters and search.',
        'high',
        '2026-09-10',
        0,
        alexId
      ]
    );

    const t2 = await run(
      'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        colToDo.id,
        proj1Id,
        'Implement OAuth & JWT Auth Service',
        'Set up secure user authentication, token refresh rotation, and protected API middleware routes.',
        'urgent',
        '2026-09-08',
        0,
        mikeId
      ]
    );

    const t3 = await run(
      'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        colInProg.id,
        proj1Id,
        'Set up Socket.io for Live Collaborative Sync',
        'Connect WebSockets for real-time task card updates, comment push notifications, and live status badges.',
        'medium',
        '2026-09-15',
        1,
        sarahId
      ]
    );

    const t4 = await run(
      'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        colDone.id,
        proj1Id,
        'Initial Database Schema & Migration Setup',
        'Configured SQLite database structure, relational tables, and foreign keys.',
        'low',
        '2026-09-01',
        0,
        alexId
      ]
    );

    // Assignees
    await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [t1.id, alexId]);
    await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [t1.id, sarahId]);
    await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [t2.id, mikeId]);
    await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [t3.id, sarahId]);
    await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [t3.id, mikeId]);

    // Checklists for t1
    await run('INSERT INTO checklists (task_id, title, completed, position) VALUES (?, ?, ?, ?)', [t1.id, 'Mobile view breakpoints', 1, 0]);
    await run('INSERT INTO checklists (task_id, title, completed, position) VALUES (?, ?, ?, ?)', [t1.id, 'Product image zoom effect', 1, 1]);
    await run('INSERT INTO checklists (task_id, title, completed, position) VALUES (?, ?, ?, ?)', [t1.id, 'Category filter sidebar', 0, 2]);

    // Checklists for t2
    await run('INSERT INTO checklists (task_id, title, completed, position) VALUES (?, ?, ?, ?)', [t2.id, 'JWT signing & validation', 1, 0]);
    await run('INSERT INTO checklists (task_id, title, completed, position) VALUES (?, ?, ?, ?)', [t2.id, 'Password hashing with bcrypt', 1, 1]);
    await run('INSERT INTO checklists (task_id, title, completed, position) VALUES (?, ?, ?, ?)', [t2.id, 'Token expiration handling', 0, 2]);

    // Comments
    await run('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)', [
      t1.id,
      sarahId,
      'I updated the CSS variables for dark mode! Check out the product card preview.'
    ]);
    await run('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)', [
      t1.id,
      alexId,
      'Awesome work Sarah! The hover effects feel super slick.'
    ]);
    await run('INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)', [
      t2.id,
      mikeId,
      'Auth endpoints are tested. Working on token middleware integration now.'
    ]);

    // Notifications
    await run('INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)', [
      alexId,
      'New Comment',
      'Sarah Chen commented on "Design Responsive Product Catalog"',
      '#task-' + t1.id
    ]);
    await run('INSERT INTO notifications (user_id, title, message, link) VALUES (?, ?, ?, ?)', [
      sarahId,
      'Task Assigned',
      'Alex Rivera assigned you to "Design Responsive Product Catalog"',
      '#task-' + t1.id
    ]);

    // 3. Project 2: Mobile App Launch v2.0
    const p2 = await run(
      'INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)',
      [
        'Mobile App Launch v2.0',
        'Cross-platform iOS and Android rollout with push notifications and offline caching.',
        '#10b981',
        sarahId
      ]
    );
    const proj2Id = p2.id;

    await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [proj2Id, sarahId, 'owner']);
    await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [proj2Id, alexId, 'member']);
    await run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [proj2Id, mikeId, 'member']);

    const c1 = await run('INSERT INTO columns (project_id, name, position) VALUES (?, ?, ?)', [proj2Id, 'Planning', 0]);
    const c2 = await run('INSERT INTO columns (project_id, name, position) VALUES (?, ?, ?)', [proj2Id, 'In Development', 1]);
    const c3 = await run('INSERT INTO columns (project_id, name, position) VALUES (?, ?, ?)', [proj2Id, 'QA & Testing', 2]);

    const tMobile1 = await run(
      'INSERT INTO tasks (column_id, project_id, title, description, priority, due_date, position, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [c2.id, proj2Id, 'APNS & FCM Push Gateway', 'Configure Apple Push Notification and Firebase Cloud Messaging tokens.', 'high', '2026-09-18', 0, mikeId]
    );
    await run('INSERT INTO task_assignees (task_id, user_id) VALUES (?, ?)', [tMobile1.id, mikeId]);

    console.log('Database seeded successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  }
};

module.exports = { seedDatabase };
