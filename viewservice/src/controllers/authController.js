// const grpcClient = require('../common/grpc-client');
const grpcClient = require('../../common/grpc-client');

const authController = {
  // GET /login
  getLogin: (req, res) => {
    // If already logged in, redirect to dashboard
    if (req.cookies.token) {
      return res.redirect('/dashboard');
    }
    res.render('login', { 
      title: 'Login - Parking System',
      error: req.query.error || null
    });
  },

  // POST /login
  postLogin: async (req, res) => {
    const { username, password } = req.body;

    try {
      const response = await grpcClient.login(username, password);

      if (!response.success) {
        return res.render('login', {
          title: 'Login - Parking System',
          error: response.message || 'Invalid credentials'
        });
      }

      // Set cookie with token
      res.cookie('token', response.token, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      // Store user info in session (optional)
      // if (response.user) {
        // res.cookie('user_id', response.user_id, { 
        //   maxAge: 24 * 60 * 60 * 1000 
        // });
      // }

      // Redirect to dashboard with success message
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      res.render('login', {
        title: 'Login - Parking System',
        error: 'Authentication service unavailable. Please try again later.'
      });
    }
  },

  // GET /logout
  logout: (req, res) => {
    // Clear all auth cookies
    res.clearCookie('token');
    res.clearCookie('user_id');
    
    // Optionally call gRPC logout endpoint
    // grpcClient.logout(req.cookies.token).catch(console.error);
    
    res.redirect('/login');
  },

  // GET /register (if needed)
  getRegister: (req, res) => {
    res.render('register', {
      title: 'Register - Parking System'
    });
  }
};

module.exports = authController;