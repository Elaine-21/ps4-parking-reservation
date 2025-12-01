-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'faculty', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Parking slots table
CREATE TABLE IF NOT EXISTS parking_slots (
    id SERIAL PRIMARY KEY,
    slot_number VARCHAR(10) NOT NULL,
    floor INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('car', 'motor')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'occupied', 'maintenance')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    parking_id INTEGER REFERENCES parking_slots(id),
    vehicle_plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(10) NOT NULL CHECK (vehicle_type IN ('car', 'motor')),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'cancelled', 'completed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Violations table
CREATE TABLE IF NOT EXISTS violations (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER REFERENCES users(id),
    patron_id INTEGER REFERENCES users(id),
    vehicle_plate VARCHAR(20) NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    location VARCHAR(100),
    date DATE NOT NULL,
    time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
-- Insert sample parking slots
INSERT INTO parking_slots (slot_number, floor, type, status) VALUES
('A1', 1, 'car', 'available'),
('A2', 1, 'car', 'available'),
('A3', 1, 'car', 'available'),
('B1', 1, 'motor', 'available'),
('B2', 1, 'motor', 'occupied'),
('B3', 1, 'motor', 'available'),
('A1', 2, 'car', 'maintenance'),
('A2', 2, 'car', 'available'),
('A3', 2, 'car', 'available'),
('B1', 2, 'motor', 'available'),
('B2', 2, 'motor', 'available'),
('A1', 3, 'car', 'available'),
('A2', 3, 'car', 'available'),
('A3', 3, 'car', 'occupied'),
('A4', 3, 'car', 'available'),
('A5', 3, 'car', 'available'),
('A6', 3, 'car', 'available')
ON CONFLICT DO NOTHING;
