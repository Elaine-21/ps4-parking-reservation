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
  const { type, floor } = call.request; // strings, may be empty/undefined

  try {
    let query =
      'SELECT id, slot_number, floor, type, status FROM parking_slots';
    const params = [];
    const conds = [];

    if (type) {
      params.push(type);
      conds.push(`type = $${params.length}`);
    }

    if (floor) {
      params.push(parseInt(floor, 10));
      conds.push(`floor = $${params.length}`);
    }

    if (conds.length > 0) {
      query += ' WHERE ' + conds.join(' AND ');
    }

    query += ' ORDER BY floor, slot_number';

    const { rows } = await pool.query(query, params);

    const slots = rows.map((row) => ({
      id: String(row.id),
      number: row.slot_number,
      floor: String(row.floor),
      type: row.type,
      status: row.status,
    }));

    callback(null, { slots });
  } catch (err) {
    console.error('🚨 GetParkingSlots error:', err);
    callback({
      code: grpc.status.INTERNAL,
      message: 'Failed to fetch parking slots',
    });
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
