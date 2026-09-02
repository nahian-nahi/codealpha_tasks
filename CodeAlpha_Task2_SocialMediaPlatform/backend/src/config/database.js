const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, '../../social_app.db');
const db = new sqlite3.Database(dbPath);

// Helper promise wrappers for sqlite3
function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function initDb() {
  try {
    await runAsync('PRAGMA foreign_keys = ON');

    // Create Users Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        bio TEXT DEFAULT '',
        avatar_url TEXT DEFAULT '',
        cover_url TEXT DEFAULT '',
        is_verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Posts Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create Comments Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create Likes Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create Follows Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS follows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create Notifications Table
    await runAsync(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        post_id INTEGER,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    const userCount = await getAsync('SELECT COUNT(*) AS count FROM users');
    if (userCount.count === 0) {
      console.log('Seeding initial Barbie Social Network database...');
      await seedDatabase();
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
}

async function seedDatabase() {
  const defaultPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      username: 'barbie_president',
      email: 'president@barbie.com',
      password_hash: defaultPassword,
      display_name: 'President Barbie 👑',
      bio: 'Leading with style, elegance & pink power. Empowering dreamers everywhere! ✨💖 #BarbieWorld',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=1200&q=80',
      is_verified: 1
    },
    {
      username: 'ken_official',
      email: 'ken@barbie.com',
      password_hash: defaultPassword,
      display_name: 'Ken 🏄‍♂️',
      bio: 'My job is just Beach. Shredding waves, rollerblading & living the dream with Barbie! 🌊✨',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      is_verified: 1
    },
    {
      username: 'fashion_barbie',
      email: 'fashion@barbie.com',
      password_hash: defaultPassword,
      display_name: 'Fashionista Barbie 👠',
      bio: 'High couture, pink runways & endless sparkle. Outfit of the day forever! 🛍️✨ #OOTD',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80',
      is_verified: 1
    },
    {
      username: 'dev_barbie',
      email: 'dev@barbie.com',
      password_hash: defaultPassword,
      display_name: 'Code Queen Barbie 💻',
      bio: 'Building the dream backend in high heels 💖 Full-stack developer, mechanical keyboard collector & AI builder! ⚡',
      avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
      cover_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      is_verified: 1
    }
  ];

  for (const u of users) {
    await runAsync(
      `INSERT INTO users (username, email, password_hash, display_name, bio, avatar_url, cover_url, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.username, u.email, u.password_hash, u.display_name, u.bio, u.avatar_url, u.cover_url, u.is_verified]
    );
  }

  // Initial Posts
  const posts = [
    {
      user_id: 1, // President Barbie
      content: 'Welcome to BarbieGram! 💖 A space for ambition, creativity, and unconditional support. You can be ANYTHING you want to be! What are you building today? ✨🎀',
      image_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1000&q=80'
    },
    {
      user_id: 4, // Dev Barbie
      content: 'Shipped a brand new real-time social platform using Node.js & SQLite with a custom Barbie pink glassmorphic UI! 🚀💖 Clean code & pink aesthetics are a match made in heaven. #WomenInTech #FullStack',
      image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1000&q=80'
    },
    {
      user_id: 2, // Ken
      content: 'Catching the sunset waves at Beach 🌊 Malibu vibes with the crew! Who wants to come beaching later? 🏄‍♂️☀️',
      image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80'
    },
    {
      user_id: 3, // Fashion Barbie
      content: 'Pink suit or pink ballgown? Why not both! Fashion is about self-expression and having fun! 💖👑 Styled this look for Paris Fashion Week. What do you think?',
      image_url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80'
    }
  ];

  for (const p of posts) {
    await runAsync(
      `INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)`,
      [p.user_id, p.content, p.image_url]
    );
  }

  // Initial Follows
  const follows = [
    [2, 1], [2, 3],
    [1, 2], [1, 4],
    [4, 1], [4, 2], [4, 3],
    [3, 1], [3, 4]
  ];

  for (const f of follows) {
    await runAsync(`INSERT INTO follows (follower_id, following_id) VALUES (?, ?)`, f);
  }

  // Initial Likes
  const likes = [
    [1, 1], [2, 1], [3, 1], [4, 1],
    [1, 2], [2, 2], [3, 2],
    [1, 3], [4, 3],
    [1, 4], [2, 4], [3, 4]
  ];
  for (const l of likes) {
    await runAsync(`INSERT INTO likes (post_id, user_id) VALUES (?, ?)`, l);
  }

  // Initial Comments
  const comments = [
    { post_id: 1, user_id: 2, content: 'You inspire us all Every single day, Barbie! ❤️' },
    { post_id: 1, user_id: 4, content: 'So proud to be part of this world! ✨💖' },
    { post_id: 2, user_id: 1, content: 'This platform looks absolutely stunning, Dev Barbie! 👑' },
    { post_id: 2, user_id: 3, content: 'The dark glam pink theme is to die for! 😍' },
    { post_id: 3, user_id: 1, content: 'Beach looks amazing today, Ken! 🌊' }
  ];
  for (const c of comments) {
    await runAsync(
      `INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`,
      [c.post_id, c.user_id, c.content]
    );
  }

  console.log('Barbie Social Network database seeded successfully!');
}

initDb();

module.exports = db;
