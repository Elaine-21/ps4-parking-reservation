const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Paths to proto files
const authProtoPath        = path.join(__dirname, 'proto', 'auth.proto');
const parkingProtoPath     = path.join(__dirname, 'proto', 'parking.proto');
const reservationProtoPath = path.join(__dirname, 'proto', 'reservation.proto');
const violationProtoPath   = path.join(__dirname, 'proto', 'violation.proto');

// Service addresses
const AUTH_ADDRESS = process.env.AUTH_SERVICE_URL || 'auth-service:50051';
const PARKING_ADDRESS = process.env.PARKING_SERVICE_URL || 'parking-service:50052';
const RESERVATION_WRITE_ADDRESS = process.env.RESERVATION_SERVICE_URL || 'reservation-service:50053';
const RESERVATION_VIEW_ADDRESS = process.env.RESERVATIONS_VIEW_SERVICE_URL || 'reservations-view-service:50054';
const VIOLATION_ADDRESS = process.env.VIOLATION_SERVICE_URL || 'violation-service:50055';

function loadService(protoPath, packageName, serviceName) {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
  });
  return grpc.loadPackageDefinition(packageDefinition)[packageName][serviceName];
}

class GrpcClient {
  constructor() {
    // 1. Auth Client
    const AuthService = loadService(authProtoPath, 'auth', 'AuthService');
    this.authClient = new AuthService(AUTH_ADDRESS, grpc.credentials.createInsecure());

    // 2. Parking Client
    const ParkingService = loadService(parkingProtoPath, 'parking', 'ParkingService');
    this.parkingClient = new ParkingService(PARKING_ADDRESS, grpc.credentials.createInsecure());

    // 3. Reservation Clients (Write & View)
    const ReservationService = loadService(reservationProtoPath, 'reservation', 'ReservationService');
    this.reservationWriteClient = new ReservationService(RESERVATION_WRITE_ADDRESS, grpc.credentials.createInsecure());
    this.reservationViewClient = new ReservationService(RESERVATION_VIEW_ADDRESS, grpc.credentials.createInsecure());

    // 4. Violation Client
    const ViolationService = loadService(violationProtoPath, 'violation', 'ViolationService');
    this.violationClient = new ViolationService(VIOLATION_ADDRESS, grpc.credentials.createInsecure());
  }

  // --- Auth ---
  login(username, password) {
    return new Promise((resolve) => this.authClient.Login({ username, password }, (err, res) => resolve(err ? { success: false, message: err.message } : res)));
  }
  validateToken(token) {
    return new Promise((resolve) => this.authClient.ValidateToken({ token }, (err, res) => resolve(err ? { valid: false } : res)));
  }
  getUserInfo(user_id) {
    return new Promise((resolve) => this.authClient.GetUserInfo({ user_id }, (err, res) => resolve(err ? { success: false } : res)));
  }

  // --- Parking ---
  getParkingSlots(type, floor) {
    return new Promise((resolve) => this.parkingClient.GetParkingSlots({ type, floor }, (err, res) => resolve(res ? res.slots : [])));
  }

  // --- Reservations ---
  createReservation(payload) {
    return new Promise((resolve) => this.reservationWriteClient.CreateReservation(payload, (err, res) => resolve(err ? { success: false, message: err.message } : res)));
  }

  // NEW: Filter reservations by Date + Vehicle + Floor (Service 50054)
  listReservations(date, vehicle_type, floor) {
    return new Promise((resolve, reject) => {
      const payload = { date, vehicle_type, floor };
      this.reservationViewClient.ListReservations(payload, (err, res) => {
        if (err) return reject(err);
        resolve(res.reservations || []);
      });
    });
  }

  // --- Violations ---
  // NEW: Upload a violation (Service 50055)
  uploadViolation(payload) {
    return new Promise((resolve, reject) => {
      this.violationClient.UploadViolation(payload, (err, res) => err ? reject(err) : resolve(res));
    });
  }
}

module.exports = new GrpcClient();