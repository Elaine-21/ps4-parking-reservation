const express = require('express');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Load proto for REST proxy
const PROTO_PATH = path.join(__dirname, '../common/proto/auth.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const authProto = grpc.loadPackageDefinition(packageDef).auth;

// Create gRPC client for REST proxy
const authClient = new authProto.AuthService(
  process.env.AUTH_SERVICE_URL || 'auth-service:50051',
  grpc.credentials.createInsecure()
);

// Helper function for gRPC calls
function grpcCall(method, request) {
  return new Promise((resolve, reject) => {
    authClient[method](request, (error, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(response);
      }
    });
  });
}

// REST endpoints that proxy to gRPC

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'auth-rest-proxy',
    timestamp: new Date().toISOString()
  });
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`🔐 REST Login request for: ${username}`);
    
    const response = await grpcCall('Login', { username, password });
    res.json(response);
  } catch (error) {
    console.error('Login proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service unavailable'
    });
  }
});

// Validate token endpoint
app.post('/api/validate', async (req, res) => {
  try {
    const { token } = req.body;
    console.log('🔍 REST Validate token request');
    
    const response = await grpcCall('ValidateToken', { token });
    res.json(response);
  } catch (error) {
    console.error('Validate token proxy error:', error);
    res.status(500).json({
      valid: false,
      message: 'Token validation service unavailable'
    });
  }
});

// Logout endpoint
app.post('/api/logout', async (req, res) => {
  try {
    const { token } = req.body;
    console.log('👋 REST Logout request');
    
    const response = await grpcCall('Logout', { token });
    res.json(response);
  } catch (error) {
    console.error('Logout proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout service unavailable'
    });
  }
});

// Get user info
app.get('/api/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 REST Get user info for ID: ${id}`);
    
    const response = await grpcCall('GetUserInfo', { user_id: id });
    res.json(response);
  } catch (error) {
    console.error('Get user info proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'User service unavailable'
    });
  }
});

// List users
app.get('/api/users', async (req, res) => {
  try {
    console.log('📊 REST List users request');
    
    const response = await grpcCall('ListUsers', {});
    res.json(response);
  } catch (error) {
    console.error('List users proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'User service unavailable'
    });
  }
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Viewservice REST proxy running on port ${PORT}`);
  console.log(`📡 Proxying to auth service at: ${process.env.AUTH_SERVICE_URL || 'auth-service:50051'}`);
  console.log(`🌐 Frontend available at: http://localhost:${PORT}`);
});