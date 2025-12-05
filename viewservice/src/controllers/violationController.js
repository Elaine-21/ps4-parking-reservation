const grpcClient = require('../../common/grpc-client');

module.exports = {
  // GET: Show the form
  getUpload: async (req, res) => {
    try {
      const allSlots = await grpcClient.getParkingSlots(null, null);
      res.render('upload-violation', { 
        title: 'Report Violation', 
        user: req.user,
        parkingSlots: allSlots
      });
    } catch (err) {
      console.error("Error loading violation page:", err);
      res.render('upload-violation', { 
        title: 'Report Violation', 
        user: req.user,
        parkingSlots: [],
        error: "Could not load parking slots"
      });
    }
  },

  // POST: Handle the submission
  postUpload: async (req, res) => {
    const { patronId, plateNumber, violationType, amount, location } = req.body;
    
    const payload = {
      staff_id: req.user.id,
      patron_id: patronId,
      plate_number: plateNumber,
      type: violationType,
      amount: parseFloat(amount || 0),
      location: location,
      date: new Date().toISOString().slice(0,10),
      time: new Date().toTimeString().slice(0,5)
    };

    try {
        const result = await grpcClient.uploadViolation(payload);
        if (result.success) {
            // FIX IS HERE: We MUST pass currentDate and currentTime to prevent dashboard crash
            res.render('dashboard', { 
              title: 'Dashboard',
              user: req.user,
              success: `Violation Report #${result.violation.id} submitted successfully.`,
              currentDate: new Date().toLocaleDateString(), // <--- ADDED
              currentTime: new Date().toLocaleTimeString()  // <--- ADDED
            });
        } else {
            const allSlots = await grpcClient.getParkingSlots(null, null);
            res.render('upload-violation', { 
              title: 'Report Violation', 
              user: req.user, 
              parkingSlots: allSlots,
              error: 'Failed to upload: ' + result.message 
            });
        }
    } catch (err) {
        console.error("Violation Upload Error:", err);
        const allSlots = await grpcClient.getParkingSlots(null, null);
        res.render('upload-violation', { 
          title: 'Report Violation', 
          user: req.user, 
          parkingSlots: allSlots,
          error: 'System error: Unable to contact Violation Service.' 
        });
    }
  }
};