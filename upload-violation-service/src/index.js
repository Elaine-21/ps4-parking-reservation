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

  try {
    const query = `
      INSERT INTO violations 
      (staff_id, patron_id, vehicle_plate, violation_type, amount, location, date, time)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    // Default values if missing
    const vals = [
      staff_id, 
      patron_id, 
      plate_number, 
      type, 
      amount || 500.0, 
      location || 'Main Campus', 
      date || new Date().toISOString().slice(0, 10), 
      time || '12:00'
    ];

    const { rows } = await pool.query(query, vals);
    
    callback(null, { 
      success: true, 
      message: `Violation ${rows[0].id} recorded`, 
      violation: { ...call.request, id: String(rows[0].id) }
    });
  } catch (err) {
    console.error(err);
    callback(null, { success: false, message: 'Database error' });
  }
}

function main() {
  const server = new grpc.Server();
  server.addService(violationProto.ViolationService.service, {
    UploadViolation,
    ListViolations: (c, cb) => cb(null, { violations: [] }) // Stub
  });
  
  server.bindAsync('0.0.0.0:50055', grpc.ServerCredentials.createInsecure(), (err, port) => {
    console.log(`✅ Violation Service running on port ${port}`);
    server.start();
  });
}
main();