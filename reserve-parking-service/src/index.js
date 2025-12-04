const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Pool } = require('pg');
const path = require('path');

const PROTO_PATH = '/app/proto/reservation.proto';
//const PROTO_PATH = path.join(__dirname, '../proto/parking.proto');


const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const reservationProto = grpc.loadPackageDefinition(packageDef).reservation;

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://admin:parking@db:5432/parkingdb',
});

function mapReservationRow(row) {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    parking_id: String(row.parking_id),
    plate_number: row.vehicle_plate,
    vehicle_type: row.vehicle_type,
    date: row.date.toISOString().slice(0, 10),      // YYYY-MM-DD
    start_time: row.start_time.toString().slice(0, 5), // HH:MM
    end_time: row.end_time.toString().slice(0, 5),
    status: row.status
  };
}

// Simple CreateReservation implementation
async function CreateReservation(call, callback) {
  // const { user_id, parking_id, plate_number, date, start_time, end_time } =
  //   call.request;
  const { user_id, parking_id, plate_number, vehicle_type, date, start_time, end_time } = call.request;

  try {
    const insert = `
      INSERT INTO reservations
        (user_id, parking_id, vehicle_plate, vehicle_type, date, start_time, end_time, status)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING *
    `;

    const { rows } = await pool.query(insert, [
      user_id,
      parking_id,
      plate_number,
      vehicle_type,
      date,
      start_time,
      end_time,
    ]);

    const reservation = mapReservationRow(rows[0]);

    callback(null, {
      success: true,
      message: 'Reservation created successfully',
      reservation
    });
  } catch (err) {
    console.error('🚨 CreateReservation error:', err);
    callback(null, {
      success: false,
      message: 'Failed to create reservation'
    });
  }
}

async function GetMyReservation(call, callback) {
  const { user_id } = call.request;

  try {
    const { rows } = await pool.query(
      `
      SELECT *
      FROM reservations
      WHERE user_id = $1
      ORDER BY date DESC, start_time DESC
      LIMIT 1
      `,
      [user_id]
    );

    if (!rows.length) {
      return callback(null, {
        success: false,
        message: 'No reservations found',
        reservation: null
      });
    }

    const reservation = mapReservationRow(rows[0]);

    callback(null, {
      success: true,
      message: 'Reservation found',
      reservation
    });
  } catch (err) {
    console.error('🚨 GetMyReservation error:', err);
    callback(null, {
      success: false,
      message: 'Failed to get reservation'
    });
  }
}

async function ListReservations(call, callback) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM reservations ORDER BY date DESC, start_time DESC LIMIT 100'
    );

    const reservations = rows.map(mapReservationRow);

    callback(null, { reservations });
  } catch (err) {
    console.error('🚨 ListReservations error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to list reservations'
    });
  }
}

function main() {
  const server = new grpc.Server();
  server.addService(reservationProto.ReservationService.service, {
    CreateReservation,
    GetMyReservation,
    ListReservations
  });

  server.bindAsync(
    '0.0.0.0:50053',
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('Failed to bind gRPC server:', err);
        process.exit(1);
      }
      console.log(`Reservation service running on port ${port}`);
      server.start();
    }
  );
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down ReservationService...');
    server.tryShutdown(() => {
      console.log('✅ ReservationService shut down gracefully');
      process.exit(0);
    });
  });
}

main();
