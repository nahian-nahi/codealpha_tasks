const mysql = require('mysql2/promise');
require('dotenv').config();

// Connection pool - reused across all queries for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Quick check on startup so connection issues fail loudly and early
pool.getConnection()
  .then((conn) => {
    console.log('✅ Connected to MySQL database');
    conn.release();
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MySQL:', err.message);
    console.error('   Check your .env file and make sure MySQL is running.');
  });

module.exports = pool;
