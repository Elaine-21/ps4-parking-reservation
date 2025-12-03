const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// Paths to proto files (they’re in the same folder as this file)
const authProtoPath        = path.join(__dirname, 'proto', 'auth.proto');
const parkingProtoPath     = path.join(__dirname, 'proto', 'parking.proto');
const reservationProtoPath = path.join(__dirname, 'proto', 'reservation.proto');
const violationProtoPath   = path.join(__dirname, 'proto', 'violation.proto');

// Service addresses (can be overridden by env)
const AUTH_ADDRESS = process.env.AUTH_SERVICE_URL || 'auth-service:50051';
const PARKING_ADDRESS = process.env.PARKING_SERVICE_URL || 'parking-service:50052';
const RESERVATION_WRITE_ADDRESS = 'reservation-service:50053';
const RESERVATION_VIEW_ADDRESS = 'reservations-view-service:50054';
const VIOLATION_ADDRESS = 'violation-service:50055';

function loadService(protoPath, packageName, serviceName) {
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });

  const loaded = grpc.loadPackageDefinition(packageDefinition);

  const pkg = loaded[packageName];
  if (!pkg) {
    console.error(`❌ Package '${packageName}' not found in proto ${protoPath}`);
    return null;
  }

  const svc = pkg[serviceName];
  if (!svc) {
    console.error(`❌ Service '${packageName}.${serviceName}' not found in proto ${protoPath}`);
    return null;
  }

  return svc;
}

class GrpcClient {
  constructor() {
    // Auth client
    const AuthService = loadService(authProtoPath, 'auth', 'AuthService');
    if (AuthService) {
      this.authClient = new AuthService(
        AUTH_ADDRESS,
        grpc.credentials.createInsecure()
      );
      console.log(`✅ gRPC auth client connected to ${AUTH_ADDRESS}`);
    } else {
      this.authClient = null;
    }

    // Parking client (for later)
    const ParkingService = loadService(parkingProtoPath, 'parking', 'ParkingService');
    if (ParkingService) {
      this.parkingClient = new ParkingService(
        PARKING_ADDRESS,
        grpc.credentials.createInsecure()
      );
      console.log(`✅ gRPC parking client connected to ${PARKING_ADDRESS}`);
    } else {
      this.parkingClient = null;
    }

    // Reservation + Violation (for later – optional now)
    const ReservationService = loadService(
      reservationProtoPath,
      'reservation',
      'ReservationService'
    );
    if (ReservationService) {
      this.reservationWriteClient = new ReservationService(
        RESERVATION_WRITE_ADDRESS,
        grpc.credentials.createInsecure()
      );
      this.reservationViewClient = new ReservationService(
        RESERVATION_VIEW_ADDRESS,
        grpc.credentials.createInsecure()
      );
    }

    const ViolationService = loadService(
      violationProtoPath,
      'violation',
      'ViolationService'
    );
    if (ViolationService) {
      this.violationClient = new ViolationService(
        VIOLATION_ADDRESS,
        grpc.credentials.createInsecure()
      );
    }
  }

  // --- Auth methods ---

  login(username, password) {
    return new Promise((resolve, reject) => {
      if (!this.authClient) {
        return reject(new Error('authClient not initialized'));
      }
      this.authClient.Login({ username, password }, (err, response) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }

  validateToken(token) {
    return new Promise((resolve, reject) => {
      if (!this.authClient) {
        return reject(new Error('authClient not initialized'));
      }
      this.authClient.ValidateToken({ token }, (err, response) => {
        if (err) return reject(err);
        resolve(response);
      });
    });
  }

  // --- Parking methods (for later) ---
  getParkingSlots(type, floor) {
    return new Promise((resolve, reject) => {
      if (!this.parkingClient) {
        return reject(new Error('parkingClient not initialized'));
      }
      this.parkingClient.GetParkingSlots({ type, floor }, (err, response) => {
        if (err) return reject(err);
        resolve(response.slots);
      });
    });
  }

  // Reservation + violation helpers (for later) can stay same style...
}

module.exports = new GrpcClient();

