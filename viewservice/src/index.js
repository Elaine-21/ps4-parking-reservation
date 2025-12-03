const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Reuse your shared gRPC client
// const grpcClient = require('../common/grpc-client');
const grpcClient = require('../common/grpc-client');  

const app = express();
const PORT = process.env.PORT || 3000;

// static files (css/js/images)
app.use('/static', express.static(path.join(__dirname, '../static')));

// parse form data and cookies
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// helper: auth middleware
async function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect('/login');
  }

  try {
    const result = await grpcClient.validateToken(token);
    if (!result.valid) {
      return res.redirect('/login');
    }

    // attach user info for later use
    req.user = {
      id: result.user_id,
      role: result.role
    };

    next();
  } catch (err) {
    console.error('ValidateToken error:', err);
    return res.redirect('/login');
  }
}

// routes

// home: redirect to login or dashboard
app.get('/', async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect('/login');
  }

  try {
    const result = await grpcClient.validateToken(token);
    if (result.valid) {
      return res.redirect('/dashboard');
    }
    return res.redirect('/login');
  } catch {
    return res.redirect('/login');
  }
});

// GET login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../html', 'login.html'));
});

// POST login -> call gRPC AuthService.Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const resp = await grpcClient.login(username, password);

    if (!resp.success) {
      console.log('Login failed:', resp.message);
      return res.redirect('/login');
    }

    res.cookie('token', resp.token, {
      httpOnly: true,
      maxAge: 60 * 60 * 1000
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.redirect('/login');
  }
});


// dashboard: protected route
app.get('/dashboard', requireAuth, (req, res) => {
  // later you can render dynamic HTML; for now just send a static file
  res.sendFile(path.join(__dirname, '../html', 'dashboard.html'));
});

// logout
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`Viewservice listening on 0.0.0.0:${PORT}`);
});
