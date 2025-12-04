const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

// Import controllers
const authController = require('./controllers/authController');
const dashboardController = require('./controllers/dashboardController');
const viewParkingController = require('./controllers/viewParkingController');
const reserveParkingController = require('./controllers/reserveParkingController');

// Import middleware
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Static files
app.use('/static', express.static(path.join(__dirname, '../static')));

// Parse requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Make user info available in all views
app.use((req, res, next) => {
  res.locals.user = null;
  res.locals.error = null;
  res.locals.success = null;
  next();
});

// Routes
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/login', authController.getLogin);
app.post('/login', authController.postLogin);
app.get('/logout', authController.logout);

// Protected routes
app.get('/dashboard', authMiddleware.requireAuth, dashboardController.getDashboard);
app.get('/view-parking', authMiddleware.requireAuth, viewParkingController.getParkingSlots);
app.get('/reserve-parking', authMiddleware.requireAuth, reserveParkingController.getReservation);
app.post('/postReserve', authMiddleware.requireAuth, reserveParkingController.postReserve);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', { 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { 
    message: 'Page not found' 
  });
});

app.listen(PORT, () => {
  console.log(`✅ Viewservice running on port ${PORT}`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}/dashboard`);
});