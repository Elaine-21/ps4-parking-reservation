const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

// const PROTO_PATH = path.join(__dirname, '../common/proto/auth.proto');
const PROTO_PATH = '/app/proto/auth.proto';


const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const authProto = grpc.loadPackageDefinition(packageDef).auth;

// Database connection with better error handling
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://admin:parking@db:5432/parkingdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test database connection
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Helper function to generate user response
function generateUserResponse(user, token) {
  return {
    success: true,
    token,
    user_id: String(user.id),
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    message: 'Login successful'
  };
}

// rpc Login - Enhanced with more fields
async function Login(call, callback) {
  const { username, password } = call.request;
  console.log(`🔐 Login attempt for user: ${username}`);

  try {
    const { rows } = await pool.query(
      'SELECT id, username, first_name, last_name, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    if (!rows.length) {
      console.log(`❌ User not found: ${username}`);
      return callback(null, {
        success: false,
        message: 'Invalid username or password'
      });
    }

    const user = rows[0];

    // Check if password is hashed (bcrypt hash starts with $2b$)
    const isHashed = user.password_hash.startsWith('$2b$');
    
    let passwordValid;
    if (isHashed) {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } else {
      // For development: allow plaintext comparison
      console.warn('⚠️  Using plaintext password comparison - not secure for production!');
      passwordValid = password === user.password_hash;
    }

    if (!passwordValid) {
      console.log(`❌ Invalid password for user: ${username}`);
      return callback(null, { 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Generate JWT token with more user info
    const token = jwt.sign(
      { 
        sub: user.id, 
        username: user.username,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name
      },
      JWT_SECRET,
      { expiresIn: '24h' } // Longer expiry for testing
    );

    console.log(`✅ Successful login for: ${username} (${user.role})`);
    
    callback(null, generateUserResponse(user, token));
  } catch (err) {
    console.error('🚨 Login error:', err);
    callback(null, {
      success: false,
      message: 'Internal server error'
    });
  }
}

// rpc ValidateToken - Enhanced with more info
async function ValidateToken(call, callback) {
  const { token } = call.request;
  console.log('🔍 Validating token...');

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    
    // Get fresh user data from database
    const { rows } = await pool.query(
      'SELECT id, username, first_name, last_name, role FROM users WHERE id = $1',
      [payload.sub]
    );

    if (!rows.length) {
      return callback(null, { 
        valid: false, 
        message: 'User not found' 
      });
    }

    const user = rows[0];
    
    console.log(`✅ Token valid for user: ${user.username}`);
    
    callback(null, {
      valid: true,
      user_id: String(user.id),
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      message: 'Token is valid'
    });
  } catch (e) {
    console.log('❌ Token validation failed:', e.message);
    callback(null, { 
      valid: false, 
      message: e.message 
    });
  }
}

// rpc Logout - Store token in blacklist (optional Redis)
function Logout(call, callback) {
  const { token } = call.request;
  console.log('👋 Logout requested');
  
  // In a production system, you would add token to a blacklist
  // For now, we just acknowledge the logout
  callback(null, { 
    success: true, 
    message: 'Logged out successfully. Please discard the token.' 
  });
}

// rpc GetUserInfo - New endpoint to get user info
async function GetUserInfo(call, callback) {
  const { user_id } = call.request;
  console.log(`📋 GetUserInfo for ID: ${user_id}`);

  try {
    const { rows } = await pool.query(
      'SELECT id, username, first_name, last_name, role, created_at FROM users WHERE id = $1',
      [user_id]
    );

    if (!rows.length) {
      return callback(null, {
        success: false,
        message: 'User not found'
      });
    }

    const user = rows[0];
    
    callback(null, {
      success: true,
      user: {
        id: String(user.id),
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        created_at: user.created_at
      },
      message: 'User info retrieved successfully'
    });
  } catch (err) {
    console.error('🚨 GetUserInfo error:', err);
    callback(null, {
      success: false,
      message: 'Internal server error'
    });
  }
}

// rpc ListUsers - For testing (admin only)
async function ListUsers(call, callback) {
  console.log('📊 ListUsers requested');
  
  try {
    const { rows } = await pool.query(
      'SELECT id, username, first_name, last_name, role, created_at FROM users ORDER BY id'
    );
    
    callback(null, {
      success: true,
      users: rows.map(user => ({
        id: String(user.id),
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        created_at: user.created_at
      })),
      count: rows.length,
      message: 'Users retrieved successfully'
    });
  } catch (err) {
    console.error('🚨 ListUsers error:', err);
    callback(null, {
      success: false,
      message: 'Internal server error'
    });
  }
}

function main() {
  const server = new grpc.Server();
  
  // Register all services
  server.addService(authProto.AuthService.service, {
    Login,
    ValidateToken,
    Logout,
    GetUserInfo,
    ListUsers
  });

  // Add health check
//   server.addService(grpc.health.v1.Health.service, {
//     Check: (call, callback) => {
//       callback(null, { status: 'SERVING' });
//     }
//   });

  server.bindAsync(
    '0.0.0.0:50051',
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('❌ Failed to start gRPC server:', err);
        process.exit(1);
      }
      
      console.log(`✅ Auth gRPC server running on port ${port}`);
      console.log('📡 Available endpoints:');
      console.log('  - Login(username, password)');
      console.log('  - ValidateToken(token)');
      console.log('  - Logout(token)');
      console.log('  - GetUserInfo(user_id)');
      console.log('  - ListUsers()');
      console.log('\n🧪 Test credentials:');
      console.log('  - student1 / password123');
      console.log('  - faculty1 / password123');
      console.log('  - admin1 / password123');
      
      server.start();
    }
  );

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down auth service...');
    server.tryShutdown(() => {
      console.log('✅ Auth service shut down gracefully');
      process.exit(0);
    });
  });
}

main();