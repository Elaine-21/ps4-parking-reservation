const grpcClient = require('../../common/grpc-client');

const viewParkingController = {
    getReservation:async (req, res) => {
        try {
            const user = req.user;
            const selectedSlotId = req.params.slotId;

        res.render('reserve-parking', {
            title: 'Reservation',
            user,
            selectedSlotId
        });
        }catch (err) {
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
            date,
            startTime,
            endTime
        } = req.body;

        // For now, assume vehicle_type 'car' or extend your form to include it
        const payload = {
            user_id: String(user.id),
            parking_id: String(slotId),
            plate_number: plateNumber,
            vehicle_type: 'car',
            date,
            start_time: startTime,
            end_time: endTime
        };

        const result = await grpcClient.createReservation(payload);

        if (!result.success) {
            return res.render('reserve-parking', {
            title: 'Reserve Parking Slot',
            user,
            selectedSlotId: slotId,
            error: result.message || 'Failed to create reservation'
            });
        }

        // Success → maybe show dashboard with message
        res.redirect('/dashboard');
        } catch (err) {
        console.error('postReserve error:', err);
        res.render('reserve-parking', {
            title: 'Reserve Parking Slot',
            user: req.user,
            selectedSlotId: req.body.slotId,
            error: 'Unexpected error while creating reservation'
        });
        }
    }
};



module.exports = viewParkingController;