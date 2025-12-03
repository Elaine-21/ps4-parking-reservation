// controllers/viewParkingController.js
const grpcClient = require('../../common/grpc-client');

const viewParkingController = {
  getParkingSlots: async (req, res) => {
    try {
      const user = req.user;

      // fetch slots from your grpc client (assume it returns an array)
      const parkingSlots = await grpcClient.getParkingSlots();

      // Example expected slot shape:
      // { id: 'slot1', floor: 1, number: 'A1', status: 'available' }

      // Group by floor
      const groupedByFloor = parkingSlots.reduce((acc, slot) => {
        const floorKey = String(slot.floor ?? 'Unknown');
        if (!acc[floorKey]) acc[floorKey] = [];
        acc[floorKey].push(slot);
        return acc;
      }, {});

      res.render('view-parking', {
        title: 'Parking Slots',
        user,
        parkingSlots,
        groupedByFloor
      });
    } catch (err) {
      console.error('Error fetching parking slots:', err);
      res.render('dashboard', {
        title: 'Dashboard - Parking System',
        user: req.user,
        error: 'Failed to load parking slots. Try again later.'
      });
    }
  }
};

module.exports = viewParkingController;
