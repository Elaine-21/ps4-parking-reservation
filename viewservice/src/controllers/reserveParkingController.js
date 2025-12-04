const grpcClient = require('../../common/grpc-client');

const viewParkingController = {
    getReservation: async (req, res) => {
        try {
            const user = req.user;
            const selectedSlotId = req.query.slotId || null;
            let initialVehicleType = '';
            const allSlots = await grpcClient.getParkingSlots(null, null);

            // Only keep slots that are reservable (Available)
            const parkingSlots = allSlots.filter(slot =>
                (slot.status || '').toLowerCase() === 'available'
            );

            if (selectedSlotId) {
                const selectedSlot = parkingSlots.find(
                    s => String(s.id) === String(selectedSlotId)
                );
                if (selectedSlot) {
                    initialVehicleType = selectedSlot.type;
                }
            }

            res.render('reserve-parking', {
                title: 'Reservation',
                user,
                selectedSlotId,
                parkingSlots,
                initialVehicleType
            });
        } catch (err) {
            console.error('Error loading reservation page:', err);
            res.render('dashboard', {
                title: 'Dashboard - Parking System',
                user: req.user,
                error: 'Failed to load reservation page. Try again later.'
            });
        }
    },

    postReserve: async (req, res) => {
        try {
            const user = req.user;
            const {
                slotId,
                plateNumber,
                vehicleType,
                date,
                startTime,
                endTime
            } = req.body;

            const payload = {
                user_id: String(user.id),
                parking_id: String(slotId),
                plate_number: plateNumber,
                vehicle_type: vehicleType,
                date,
                start_time: startTime,
                end_time: endTime
            };

            const result = await grpcClient.createReservation(payload);

            if (!result.success) {
                const allSlots = await grpcClient.getParkingSlots(null, null);
                const parkingSlots = allSlots.filter(slot =>
                    (slot.status || '').toLowerCase() === 'available'
                );

                return res.status(400).render('reserve-parking', {
                    title: 'Reserve Parking Slot',
                    user,
                    selectedSlotId: slotId,
                    parkingSlots,
                    initialVehicleType: vehicleType,
                    error: result.message || 'Failed to create reservation'
                });
            }

            // Success → back to dashboard
            res.redirect('/dashboard');
        } catch (err) {
            console.error('❌ postReserve CRITICAL error:', err);
            
            try {
                // Attempt to reload slots so the form looks correct even on error
                const allSlots = await grpcClient.getParkingSlots(null, null);
                const parkingSlots = allSlots.filter(slot =>
                    (slot.status || '').toLowerCase() === 'available'
                );

                return res.status(500).render('reserve-parking', {
                    title: 'Reserve Parking Slot',
                    user: req.user,
                    selectedSlotId: req.body.slotId,
                    parkingSlots,
                    initialVehicleType: req.body.vehicleType,
                    // FIX IS HERE: We now show the real error message
                    error: 'System Error: ' + err.message 
                });
            } catch (err2) {
                console.error('postReserve secondary error:', err2);
                return res.status(500).send('Unexpected error: ' + err.message);
            }
        }
    }
};

module.exports = viewParkingController;