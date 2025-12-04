const grpcClient = require('../../common/grpc-client');

module.exports = {
  getView: (req, res) => {
    // Render the page with empty results initially
    res.render('admin-reservations', { 
      title: 'Admin View', 
      user: req.user, 
      reservations: [],
      filters: {} 
    });
  },
  
  filterReservations: async (req, res) => {
    const { date, type, floor } = req.query;
    try {
      // Calls the listReservations method in grpc-client (talks to view-reservations-service)
      const reservations = await grpcClient.listReservations(date, type, floor);
      
      res.render('admin-reservations', { 
        title: 'Admin View', 
        user: req.user, 
        reservations,
        filters: { date, type, floor }
      });
    } catch (err) {
      console.error(err);
      res.render('admin-reservations', { 
        title: 'Admin View', 
        user: req.user, 
        error: 'Failed to fetch reservations', 
        reservations: [],
        filters: { date, type, floor }
      });
    }
  }
};