const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Pool } = require('pg');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/reservation.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const reservationProto = grpc.loadPackageDefinition(packageDef).reservation;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://admin:parking@db:5432/parkingdb' });

function mapRow(row) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    parking_id: String(row.parking_id),
    vehicle_plate: row.vehicle_plate,
    vehicle_type: row.vehicle_type,
    date: new Date(row.date).toISOString().slice(0, 10),
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status
  };
}

// RPC: ListReservations (The specific filter requirement)
async function ListReservations(call, callback) {
  const { date, vehicle_type, floor } = call.request;
  console.log(`🔎 Filtering: Date=${date}, Type=${vehicle_type}, Floor=${floor}`);

  try {
    // JOIN allows us to filter reservations based on the parking slot's floor
    const query = `
      SELECT r.* FROM reservations r
      JOIN parking_slots p ON r.parking_id = p.id
      WHERE r.date = $1 
        AND r.vehicle_type = $2 
        AND p.floor = $3
      ORDER BY r.start_time ASC
    `;

    const { rows } = await pool.query(query, [date, vehicle_type, floor]);
    callback(null, { reservations: rows.map(mapRow) });
  } catch (err) {
    console.error('Error listing reservations:', err);
    callback(null, { reservations: [] });
  }
}

// Stubs for other methods to satisfy proto definition
async function GetMyReservation(call, callback) {
    callback(null, { success: false, message: "Use reserve-parking-service" });
}
async function CreateReservation(call, callback) {
    callback(null, { success: false, message: "Read-only service" });
}

function main() {
  const server = new grpc.Server();
  server.addService(reservationProto.ReservationService.service, {
    ListReservations,
    GetMyReservation, 
    CreateReservation
  });
  
  // Note: Port 50054
  server.bindAsync('0.0.0.0:50054', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) return console.error(err);
    console.log(`Reservation VIEW Service running on port ${port}`);
    server.start();
  });
}
main();