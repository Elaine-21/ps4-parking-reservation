const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Pool } = require('pg');
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../proto/violation.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, { keepCase: true, longs: String, enums: String, defaults: true, oneofs: true });
const violationProto = grpc.loadPackageDefinition(packageDef).violation;

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://admin:parking@db:5432/parkingdb' });

async function UploadViolation(call, callback) {
  const { staff_id, patron_id, plate_number, type, amount, location, date, time } = call.request;
  
  console.log("Received Violation Upload:", call.request); // Log for debugging

  try {
    const query = `
      INSERT INTO violations 
      (staff_id, patron_id, vehicle_plate, violation_type, amount, location, date, time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    // Defaults to prevent crashes
    const vals = [
      staff_id, 
      patron_id, 
      plate_number, 
      type, 
      amount || 500.0, 
      location || 'Unknown', 
      date || new Date().toISOString().slice(0, 10), 
      time || '00:00'
    ];

    const { rows } = await pool.query(query, vals);
    
    callback(null, { 
      success: true, 
      message: `Violation ${rows[0].id} recorded`, 
      violation: { ...call.request, id: String(rows[0].id) }
    });
  } catch (err) {
    console.error("Database Error:", err);
    callback(null, { success: false, message: 'Database error: ' + err.message });
  }
}

function main() {
  const server = new grpc.Server();
  server.addService(violationProto.ViolationService.service, {
    UploadViolation,
    ListViolations: (c, cb) => cb(null, { violations: [] }) 
  });
  
  server.bindAsync('0.0.0.0:50055', grpc.ServerCredentials.createInsecure(), (err, port) => {
    if(err) console.error(err);
    console.log(`Violation Service running on port ${port}`);
    server.start();
  });
}

main();