const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Pool } = require('pg');
const path = require('path');

// 1. Load the Proto file
const PROTO_PATH = path.join(__dirname, '../proto/parking.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const parkingProto = grpc.loadPackageDefinition(packageDef).parking;

// 2. Connect to Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://admin:parking@db:5432/parkingdb',
});

// 3. gRPC Method: GetParkingSlots
async function GetParkingSlots(call, callback) {
  const { type, floor } = call.request;

  try {
    // SMART QUERY:
    // It checks if the current time falls inside an active reservation window.
    // If yes, it overrides the status to 'Occupied'.
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

    // Add filters if provided
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

    // Sort nicely by floor then slot
    query += ' ORDER BY p.floor, p.slot_number ASC';

    const { rows } = await pool.query(query, params);

    // Map DB results to Proto message format
    const slots = rows.map((row) => ({
      id: String(row.id),
      slot_number: row.slot_number || ('Slot ' + row.id), // Ensure we always have a label
      floor: String(row.floor),
      type: row.type,
      status: row.calculated_status // Uses the real-time status
    }));

    callback(null, { slots });
  } catch (err) {
    console.error('🚨 GetParkingSlots error:', err);
    // Return empty list instead of crashing
    callback(null, { slots: [] });
  }
}

// 4. gRPC Method: UpdateSlotStatus (Admin Tool)
async function UpdateSlotStatus(call, callback) {
  const { slotId, status } = call.request;
  try {
    await pool.query('UPDATE parking_slots SET status = $1 WHERE id = $2', [status, slotId]);
    callback(null, { success: true, message: 'Status updated' });
  } catch (err) {
    console.error('Update error:', err);
    callback(null, { success: false, message: err.message });
  }
}

// 5. Start the Server
function main() {
  const server = new grpc.Server();
  server.addService(parkingProto.ParkingService.service, {
    GetParkingSlots,
    UpdateSlotStatus
  });
  
  // Bind to port 50052 as defined in docker-compose
  server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) {
      console.error('❌ Failed to bind Parking Service:', err);
      return;
    }
    console.log(`🅿️ Parking Service running on port ${port}`);
    server.start();
  });
}

main();