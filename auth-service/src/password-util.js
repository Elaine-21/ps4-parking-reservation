// auth/password.js
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// Hash a plain-text password
async function hashPassword(plainPassword) {
  if (!plainPassword) {
    throw new Error('Password is required');
  }
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

// Compare a plain-text password with a stored hash
async function verifyPassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) {
    return false;
  }
  return bcrypt.compare(plainPassword, passwordHash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
