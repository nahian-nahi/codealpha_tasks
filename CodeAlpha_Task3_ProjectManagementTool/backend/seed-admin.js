// Run this once to create your first Admin account:
//   node seed-admin.js
//
// Edit the values below first, then run it. It hashes the password properly
// (the sample row in schema.sql has a placeholder hash that won't work for login).

const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const ADMIN = {
  name: 'System Admin',
  email: 'admin@cuet.ac.bd',
  password: 'admin123',       // change this
  cuet_card_no: 'CUET-ADM-001',
  contact_no: '01700000000'
};

async function run() {
  try {
    const hashed = await bcrypt.hash(ADMIN.password, 10);

    // Replace the placeholder seed row's password if it exists, otherwise insert fresh
    const [existing] = await pool.query('SELECT admin_id FROM admin WHERE email = ?', [ADMIN.email]);

    if (existing.length > 0) {
      await pool.query('UPDATE admin SET password = ? WHERE email = ?', [hashed, ADMIN.email]);
      console.log(`Updated password for existing admin: ${ADMIN.email}`);
    } else {
      await pool.query(
        'INSERT INTO admin (name, email, password, cuet_card_no, contact_no) VALUES (?, ?, ?, ?, ?)',
        [ADMIN.name, ADMIN.email, hashed, ADMIN.cuet_card_no, ADMIN.contact_no]
      );
      console.log(`Created admin: ${ADMIN.email}`);
    }

    console.log(`Login with email "${ADMIN.email}" and password "${ADMIN.password}"`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin:', err.message);
    process.exit(1);
  }
}

run();
