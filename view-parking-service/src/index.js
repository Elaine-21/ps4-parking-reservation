const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Pool } = require('pg');
const path = require('path');

// Proto path – we will mount ./common/proto to /app/proto in docker-compose
const PROTO_PATH = path.join(__dirname, '../proto/parking.proto');
// const PROTO_PATH = '/app/proto/auth.proto';

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const parkingProto = grpc.loadPackageDefinition(packageDef).parking;

// Postgres pool
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://admin:parking@localhost:5432/parkingdb',
});

// Quick connection test
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ ParkingService DB connection failed:', err.message);
  } else {
    console.log('✅ ParkingService DB connected');
  }
});

// gRPC: GetParkingSlots
async function GetParkingSlots(call, callback) {
  const { type, floor } = call.request;

  try {
    // DYNAMIC QUERY:
    // This checks if the current time falls between any reservation's start and end time.
    // '::time' ensures we compare time-to-time correctly.
    
    let query = `
      SELECT 
        p.id, 
        p.slot_number, 
        p.floor, 
        p.type,
        CASE 
          WHEN p.status = 'Maintenance' THEN 'Maintenance'
          WHEN EXISTS (
            SELECT 1 FROM reservations r 
            WHERE r.parking_id = p.id 
            AND r.status = 'Active'
            AND r.date = CURRENT_DATE 
            AND LOCALTIME BETWEEN r.start_time AND r.end_time
          ) THEN 'Occupied'
          ELSE p.status 
        END as calculated_status
      FROM parking_slots p
    `;

    const params = [];
    const wheres = [];

    if (type) {
      params.push(type);
      wheres.push(`p.type = $${params.length}`);
    }
    if (floor) {
      params.push(floor);
      wheres.push(`p.floor = $${params.length}`);
    }

    if (wheres.length > 0) {
      query += ' WHERE ' + wheres.join(' AND ');
    }

    query += ' ORDER BY p.floor, p.slot_number ASC';

    const { rows } = await pool.query(query, params);

    const slots = rows.map((row) => ({
      id: String(row.id),
      slot_number: row.slot_number,
      floor: String(row.floor),
      type: row.type,
      status: row.calculated_status // This will now be 'Occupied' if reserved right now
    }));

    callback(null, { slots });
  } catch (err) {
    console.error('🚨 GetParkingSlots error:', err);
    callback(null, { slots: [] });
  }
}

// gRPC: UpdateSlotStatus (for later)
async function UpdateSlotStatus(call, callback) {
  const { slotId, status } = call.request;

  try {
    const { rowCount } = await pool.query(
      'UPDATE parking_slots SET status = $1 WHERE id = $2',
      [status, slotId]
    );

    if (rowCount === 0) {
      return callback(null, {
        success: false,
        message: 'Slot not found',
      });
    }

    callback(null, {
      success: true,
      message: 'Slot status updated',
    });
  } catch (err) {
    console.error('🚨 UpdateSlotStatus error:', err);
    callback(null, {
      success: false,
      message: 'Failed to update slot',
    });
  }
}

function main() {
  const server = new grpc.Server();

  server.addService(parkingProto.ParkingService.service, {
    GetParkingSlots,
    UpdateSlotStatus,
  });

  const PORT = process.env.GRPC_PORT || '0.0.0.0:50052';

  server.bindAsync(
    PORT,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error('❌ Failed to start Parking gRPC server:', err);
        process.exit(1);
      }

      console.log(`✅ Parking gRPC server running on port ${port}`);
      server.start();
    }
  );

  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down ParkingService...');
    server.tryShutdown(() => {
      console.log('✅ ParkingService shut down gracefully');
      process.exit(0);
    });
  });
}

main();
