const readline = require('readline');
const { testLogin, testValidateToken, testGetUserInfo, testListUsers } = require('./test-auth');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function showMenu() {
  console.log('\n=== 🧪 Auth Service CLI Tester ===');
  console.log('1. Login');
  console.log('2. Validate Token');
  console.log('3. Get User Info');
  console.log('4. List All Users');
  console.log('5. Run All Tests');
  console.log('0. Exit');
  
  rl.question('\nSelect option: ', async (choice) => {
    switch (choice) {
      case '1':
        await handleLogin();
        break;
      case '2':
        await handleValidate();
        break;
      case '3':
        await handleUserInfo();
        break;
      case '4':
        await handleListUsers();
        break;
      case '5':
        await runAllTests();
        break;
      case '0':
        console.log('👋 Goodbye!');
        rl.close();
        return;
      default:
        console.log('❌ Invalid option');
    }
    
    showMenu();
  });
}

async function handleLogin() {
  rl.question('Username: ', async (username) => {
    rl.question('Password: ', async (password) => {
      console.log('\n🔐 Logging in...');
      try {
        const response = await testLogin(username, password);
        console.log('\n📊 Response:');
        console.log(JSON.stringify(response, null, 2));
        
        if (response.success) {
          // Save token for later use
          global.lastToken = response.token;
          global.lastUserId = response.user_id;
          console.log(`\n💾 Token saved for future tests`);
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    });
  });
}

async function handleValidate() {
  if (!global.lastToken) {
    rl.question('Enter token: ', async (token) => {
      await validateToken(token);
    });
  } else {
    console.log(`Using saved token: ${global.lastToken.substring(0, 30)}...`);
    rl.question('Use saved token? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        await validateToken(global.lastToken);
      } else {
        rl.question('Enter token: ', async (token) => {
          await validateToken(token);
        });
      }
    });
  }
}

async function validateToken(token) {
  console.log('\n🔍 Validating token...');
  try {
    const response = await testValidateToken(token);
    console.log('\n📊 Response:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function handleUserInfo() {
  if (!global.lastUserId) {
    rl.question('Enter user ID: ', async (userId) => {
      await getUserInfo(userId);
    });
  } else {
    console.log(`Last user ID: ${global.lastUserId}`);
    rl.question('Use last user ID? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y') {
        await getUserInfo(global.lastUserId);
      } else {
        rl.question('Enter user ID: ', async (userId) => {
          await getUserInfo(userId);
        });
      }
    });
  }
}

async function getUserInfo(userId) {
  console.log(`\n📋 Getting info for user ${userId}...`);
  try {
    const response = await testGetUserInfo(userId);
    console.log('\n📊 Response:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function handleListUsers() {
  console.log('\n📊 Listing all users...');
  try {
    const response = await testListUsers();
    console.log('\n📊 Response:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runAllTests() {
  console.log('\n🧪 Running all tests...\n');
  const { runTests } = require('./test-auth');
  await runTests();
}

// Start the CLI
console.log('🚀 Auth Service CLI Tester');
console.log('Make sure auth service is running on localhost:50051\n');
showMenu();