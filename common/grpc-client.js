const reservationProtoPath = require('path').join(__dirname, '../proto/reservation.proto');
const violationProtoPath = require('path').join(__dirname, '../proto/violation.proto');

class GrpcClient {
  constructor() {
    this.authClient = this.createClient(
        authProtoPath, 
        'auth.AuthService', 
        'auth-service:50051'
    );

    this.parkingClient = this.createClient(
        parkingProtoPath, 
        'parking.ParkingService', 
        'parking-service:50052'
    );

    this.reservationWriteClient = this.createClient(
        reservationProtoPath, 
        'reservation.ReservationService', 
        'reservation-service:50053'
    );

    this.reservationViewClient = this.createClient(
        reservationProtoPath, 
        'reservation.ReservationViewService', 
        'reservation-service:50054'
    );

    this.violationClient = this.createClient(
        violationProtoPath, 
        'violation.ViolationService', 
        'violation-service:50055'
    );
  }

  // existing createClient + getService ...

  // Auth
  async validateToken(token) { /* already done */ }
  async login(username, password) { /* call Login */ }

  // Parking
  async getParkingSlots(type, floor) { /* already done */ }

  // Reservation
  async createReservation(payload) {
    return new Promise((resolve, reject) => {
      this.reservationWriteClient.CreateReservation(payload, (err, res) =>
        err ? reject(err) : resolve(res)
      );
    });
  }

  async getMyReservation(user_id) {
    return new Promise((resolve, reject) => {
      this.reservationViewClient.GetMyReservation({ user_id }, (err, res) =>
        err ? reject(err) : resolve(res)
      );
    });
  }

  async listReservations(filter) {
    return new Promise((resolve, reject) => {
      this.reservationViewClient.ListReservations(filter, (err, res) =>
        err ? reject(err) : resolve(res)
      );
    });
  }

  // Violation
  async uploadViolation(payload) {
    return new Promise((resolve, reject) => {
      this.violationClient.UploadViolation(payload, (err, res) =>
        err ? reject(err) : resolve(res)
      );
    });
  }
}

module.exports = new GrpcClient();
