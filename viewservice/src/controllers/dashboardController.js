const grpcClient = require('../../common/grpc-client');

const dashboardController = {
  // GET /dashboard
  getDashboard: async (req, res) => {
    try {
      const user = req.user;
      
      // Get user info
    //   const userInfo = await grpcClient.getUserInfo(userId);
      
      // Get user's current reservations (implement this in your reservation service)
      // const reservations = await grpcClient.getMyReservations(userId);
      
      // Get available parking slots
    //   const parkingSlots = await grpcClient.getParkingSlots();
      
     res.render('dashboard', {
        title: 'Dashboard - Parking System',
        user,
        currentDate: new Date().toLocaleDateString(),
        currentTime: new Date().toLocaleTimeString(),
        // parkingSlots: [] // placeholder
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.render('dashboard', {
        title: 'Dashboard - Parking System',
        user: req.user,
        error: 'Unable to load dashboard data'
      });
    }
  },

  // GET /dashboard/profile
  getProfile: async (req, res) => {
    try {
      const userInfo = await grpcClient.getUserInfo(req.user.id);
      
      res.render('profile', {
        title: 'My Profile - Parking System',
        user: req.user,
        userDetails: userInfo.success ? userInfo.user : null
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.redirect('dashboard');
    }
  }
};

module.exports = dashboardController;