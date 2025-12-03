const grpcClient = require('../../common/grpc-client');
// const grpcClient = require('../common/grpc-client');


const authMiddleware = {
  // Middleware to require authentication
  requireAuth: async (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
      return res.redirect('/login');
    }

    try {
      const result = await grpcClient.validateToken(token);
      
      if (!result.valid) {
        res.clearCookie('token');
        return res.redirect('/login');
      }

      // Attach user info to request
      req.user = {
        id: result.user_id,
        username: result.username,
        firstName: result.first_name,
        lastName: result.last_name,
        role: result.role,
        fullName: `${result.first_name} ${result.last_name}`
      };

      // Make user info available in views
      res.locals.user = req.user;
      
      next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      res.clearCookie('token');
      return res.redirect('/login');
    }
  },

  // Middleware to check specific roles
  requireRole: (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.redirect('/login');
      }
      
      if (!roles.includes(req.user.role)) {
        return res.status(403).render('error', {
          message: 'Access denied. You do not have permission to view this page.'
        });
      }
      
      next();
    };
  },

  // Optional authentication - attaches user if logged in
  optionalAuth: async (req, res, next) => {
    const token = req.cookies.token;
    
    if (token) {
      try {
        const result = await grpcClient.validateToken(token);
        
        if (result.valid) {
          req.user = {
            id: result.user_id,
            username: result.username,
            firstName: result.first_name,
            lastName: result.last_name,
            role: result.role,
            fullName: `${result.first_name} ${result.last_name}`
          };
          res.locals.user = req.user;
        }
      } catch (err) {
        console.error('Optional auth error:', err);
      }
    }
    
    next();
  }
};

module.exports = authMiddleware;