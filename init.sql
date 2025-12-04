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
    type VARCHAR(10) NOT NULL CHECK (type IN ('Car', 'Motorcycle')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('Available', 'Occupied', 'Maintenance')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    parking_id INTEGER REFERENCES parking_slots(id),
    vehicle_plate VARCHAR(20) NOT NULL,
    vehicle_type VARCHAR(10) NOT NULL CHECK (vehicle_type IN ('Car', 'Motorcycle')),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('Active', 'Cancelled', 'Completed')),
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
('A1', 1, 'Car', 'Available'),
('A2', 1, 'Car', 'Available'),
('A3', 1, 'Car', 'Available'),
('B1', 1, 'Motorcycle', 'Available'),
('B2', 1, 'Motorcycle', 'Occupied'),
('B3', 1, 'Motorcycle', 'Available'),
('A1', 2, 'Car', 'Maintenance'),
('A2', 2, 'Car', 'Available'),
('A3', 2, 'Car', 'Available'),
('B1', 2, 'Motorcycle', 'Available'),
('B2', 2, 'Motorcycle', 'Available'),
('A1', 3, 'Car', 'Available'),
('A2', 3, 'Car', 'Available'),
('A3', 3, 'Car', 'Occupied'),
('A4', 3, 'Car', 'Available'),
('A5', 3, 'Car', 'Available'),
('A6', 3, 'Car', 'Available')
ON CONFLICT DO NOTHING;
