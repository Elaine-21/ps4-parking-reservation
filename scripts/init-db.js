// scripts/init-db.js or scripts/test-create-user.js

// 1) Set DATABASE_URL first
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://admin:parking@localhost:5432/parkingdb';

// 2) Then require user-service (so Pool sees the correct URL)
const { createUser } = require('../auth-service/user-service');

// (async () => {
//   try {
//     const user = await createUser({
//       username: 'student2',
//       firstName: 'Test',
//       lastName: 'User',
//       password: 'student2_password',
//       role: 'student', // must match your CHECK constraint
//     });

//     console.log('Created user:', user);
//   } catch (err) {
//     console.error('Error creating user:', err);
//   }
// })();


(async () => {
  try {
    const user1 = await createUser({
      username: 'student1',
      firstName: 'student',
      lastName: 'User',
      password: 'student1',
      role: 'student', // must match your CHECK constraint
    });

    const user2 = await createUser({
      username: 'faculty1',
      firstName: 'faculty',
      lastName: 'lastname',
      password: 'faculty1',
      role: 'faculty', // must match your CHECK constraint
    });

    const user3 = await createUser({
      username: 'admin',
      firstName: 'ad',
      lastName: 'min',
      password: 'password123',
      role: 'admin', // must match your CHECK constraint
    });

    console.log('Created user:', user1, user2, user3);
  } catch (err) {
    console.error('Error creating user:', err);
  }
})();
