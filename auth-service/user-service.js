// auth-service/userService.js
const { Pool } = require('pg');
const { hashPassword } = require('./src/password-util');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createUser({ username, firstName, lastName, password, role }) {
  const client = await pool.connect();
  try {
    const passwordHash = await hashPassword(password);

    const result = await client.query(
      `
      INSERT INTO users (username, first_name, last_name, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, first_name, last_name, role, created_at;
      `,
      [username, firstName, lastName, passwordHash, role]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

module.exports = {
  createUser,
};
