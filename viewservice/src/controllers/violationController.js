const grpcClient = require('../../common/grpc-client');

module.exports = {
  getUpload: (req, res) => {
    res.render('upload-violation', { title: 'Report Violation', user: req.user });
  },

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
            // Show success on dashboard or reload page
            res.render('upload-violation', { 
              title: 'Report Violation', 
              user: req.user, 
              success: `Violation recorded! ID: ${result.violation.id}` 
            });
        } else {
            res.render('upload-violation', { 
              title: 'Report Violation', 
              user: req.user, 
              error: 'Failed to upload: ' + result.message 
            });
        }
    } catch (err) {
        console.error(err);
        res.render('upload-violation', { title: 'Report Violation', user: req.user, error: 'System error' });
    }
  }
};