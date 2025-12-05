// This just test the authentication service gRPC endpoints without ui.
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../../common/proto/auth.proto');
// const PROTO_PATH = '/app/proto/auth.proto';
// const packageDef = protoLoader.loadSync(PROTO_PATH);
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,          
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const authProto = grpc.loadPackageDefinition(packageDef).auth;

const client = new authProto.AuthService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

async function testLogin(username, password) {
  return new Promise((resolve, reject) => {
    client.Login({ username, password }, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

async function testValidateToken(token) {
  return new Promise((resolve, reject) => {
    client.ValidateToken({ token }, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

async function testGetUserInfo(userId) {
  return new Promise((resolve, reject) => {
    client.GetUserInfo({ user_id: userId }, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

async function testListUsers() {
  return new Promise((resolve, reject) => {
    client.ListUsers({}, (err, response) => {
      if (err) reject(err);
      else resolve(response);
    });
  });
}

async function runTests() {
  console.log('Starting Auth Service Tests\n');
  
  try {
    // Test 1: Login with student
    console.log('1. Testing Login (admin)...');
    const loginResponse = await testLogin('admin', 'password123');
    
    if (loginResponse.success) {
      console.log('Login successful!');
      console.log(`   Token: ${loginResponse.token.substring(0, 30)}...`);
      console.log(`   User: ${loginResponse.username} (${loginResponse.role})`);
      
      // Test 2: Validate token
      console.log('\n2. Testing ValidateToken...');
      const validateResponse = await testValidateToken(loginResponse.token);
      
      if (validateResponse.valid) {
        console.log('Token is valid!');
        console.log(`   User ID: ${validateResponse.user_id}`);
        console.log(`   Role: ${validateResponse.role}`);
        
        // Test 3: Get user info
        console.log('\n3. Testing GetUserInfo...');
        const userInfo = await testGetUserInfo(validateResponse.user_id);
        
        if (userInfo.success) {
          console.log('User info retrieved!');
          console.log(`   Name: ${userInfo.user.first_name} ${userInfo.user.last_name}`);
        } else {
          console.log('GetUserInfo failed:', userInfo.message);
        }
      } else {
        console.log('Token validation failed:', validateResponse.message);
      }
      
      // Test 4: List users (admin function)
      console.log('\n4. Testing ListUsers...');
      const usersList = await testListUsers();
      
      if (usersList.success) {
        console.log(`Retrieved ${usersList.count} users`);
        usersList.users.forEach(user => {
          console.log(`   - ${user.username} (${user.role})`);
        });
      } else {
        console.log('❌ ListUsers failed:', usersList.message);
      }
      
    } else {
      console.log('❌ Login failed:', loginResponse.message);
    }
    
  } catch (error) {
    console.error('🚨 Test error:', error.message);
  }
  
  console.log('\n🧪 Tests completed!');
}

// Run tests if called directly
if (require.main === module) {
  // Wait a bit for server to start
  setTimeout(() => {
    runTests();
  }, 2000);
}

module.exports = {
  testLogin,
  testValidateToken,
  testGetUserInfo,
  testListUsers,
  runTests
};