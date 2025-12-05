# Distributed Parking Reservation System

## 📌 Project Overview

This project is a **Distributed Parking Reservation System** designed to demonstrate microservices architecture, gRPC communication, and fault tolerance.

The system allows university **Students** and **Faculty** to view parking availability and reserve slots in real-time. It also provides **Faculty** and **Admins** with tools to report parking violations and manage the system.

Each feature is isolated in its own "Node" (Service), ensuring that if one part of the system fails, the rest of the application remains functional.

---

## 🏗️ Architecture & Tech Stack

The system utilizes a **Microservices Architecture** where the frontend communicates with backend services via **gRPC**.

### **The Nodes (Services)**

| Service Name            | Port    | Description                                                                               | Tech Stack      |
| :---------------------- | :------ | :---------------------------------------------------------------------------------------- | :-------------- |
| **ViewService**         | `3000`  | The API Gateway and Frontend (MVC). Handles HTTP requests and talks to backends via gRPC. | Express.js, EJS |
| **Auth Service**        | `50051` | Handles Login, Logout, and Token Validation (JWT).                                        | Node.js, gRPC   |
| **Parking Service**     | `50052` | Manages real-time status of parking slots (Available/Occupied).                           | Node.js, gRPC   |
| **Reservation Service** | `50053` | Handles the logic for creating new reservations.                                          | Node.js, gRPC   |
| **View Res. Service**   | `50054` | Handles complex filtering of reservation history (Admin View).                            | Node.js, gRPC   |
| **Violation Service**   | `50055` | Handles reporting and storing parking violations.                                         | Node.js, gRPC   |

### **Infrastructure**

- **Database:** PostgreSQL (with `pg` driver)
- **Communication:** gRPC (Protocol Buffers)
- **Containerization:** Docker & Docker Compose

---

## 🚀 How to Run the Project

### Prerequisites

- Docker Desktop installed and running.

### 0: Clean Start

Stop any running containers and remove volumes to ensure a fresh environment:

```bash
docker compose down -v
```

### 1. Build and Start

Open your terminal in the root directory and run:

```bash
# Start DB and Redis
docker compose up -d db redis

# Wait for database to initialize
sleep 5

# Build and start all services
docker compose up --build -d
```

### 2. Verify Database (Pre-Check)

Check if the database is running and tables were created (but users might be missing):

```bash
# Check existing tables
docker exec ps4-parking-reservation-db-1 psql -U admin -d parkingdb -c "\dt"
```

### 3: Populate Database (CRITICAL)

Run the initialization script to create the required user accounts. Do not skip this step.

```bash
node scripts/init-db.js
```

### 4: Verify Installation

Confirm that the users (Student, Faculty, Admin) have been created successfully:

```bash
docker exec ps4-parking-reservation-db-1 psql -U admin -d parkingdb -c "SELECT id, username, role FROM users;"
```

### 5. Access the Application

Open your browser and navigate to: http://localhost:3000

### 6. Login Credentials

The database is initialized with these sample users for testing:

| Role        | Username   | Password      | ID  | Permissions                                     |
| :---------- | :--------- | :------------ | :-- | :---------------------------------------------- |
| **Student** | `student1` | `student1`    | 1   | Can view map and reserve slots.                 |
| **Faculty** | `faculty1` | `faculty1`    | 2   | Can reserve slots and report violations.        |
| **Admin**   | `admin`    | `password123` | 3   | Can view the Admin Panel and report violations. |

---

## 🧪 Testing & Fault Tolerance

A core requirement of this distributed system is **Fault Tolerance**. The system is designed so that if one microservice (node) fails, the rest of the application remains functional.

You can verify this by manually stopping specific Docker containers and checking the impact on the Dashboard.

### General Testing Command

To simulate a node failure, use the following command in your terminal:

```bash
docker compose stop <service-name>
```

To bring the node back online:

```bash
docker compose start <service-name>
sleep 10
```

---

### Test Scenario 1: Parking Node Failure

**Objective:** Verify that the "View Parking Map" feature fails gracefully while other features remain active.

1.  **Action:** Stop the parking service.
    ```bash
    docker compose stop parking-service
    ```
2.  **Verify Impact:**
    - Navigate to **Dashboard** → Click **"View Parking Map"**.
    - **Result:** The page loads, but displays a "No slots found" message or an empty grid. The application does **not** crash.
3.  **Verify Isolation:**
    - Go back to **Dashboard** → Click **"Report Violation"**.
    - **Result:** The violation form loads and submits successfully.
4.  **Action:** START the parking service.
    ```bash
    docker compose start parking-service
    sleep 10
    ```

### Test Scenario 2: Violation Node Failure

**Objective:** Verify that the "Report Violation" feature fails without crashing the booking system.

1.  **Action:** Stop the violation service.
    ```bash
    docker compose stop violation-service
    ```
2.  **Verify Impact:**
    - Navigate to **Dashboard** → Click **"Report Violation"**.
    - Fill out the form and click **Submit**.
    - **Result:** You see a red error message: _"System error: Unable to contact Violation Service."_
3.  **Verify Isolation:**
    - Go back to **Dashboard** → Click **"Reserve a Slot"**.
    - **Result:** The reservation form loads, slots are visible, and you can successfully book a slot.
4.  **Action:** START the violation service.
    ```bash
    docker compose start violation-service
    sleep 10
    ```

### Test Scenario 3: Reservation Node Failure

**Objective:** Verify that bookings cannot be made, but the map is still viewable.

1.  **Action:** Stop the reservation service.
    ```bash
    docker compose stop reservation-service
    ```
2.  **Verify Impact:**
    - Navigate to **Dashboard** → Click **"Reserve a Slot"**.
    - Attempt to submit a reservation.
    - **Result:** The system returns an error message indicating the reservation could not be created.
3.  **Verify Isolation:**
    - Go back to **Dashboard** → Click **"View Parking Map"**.
    - **Result:** The map still loads and shows slot statuses (Available/Occupied).
4.  **Action:** START the reservation service.
    ```bash
    docker compose start reservation-service
    sleep 10
    ```

### Test Scenario 4: Auth Node Failure (Critical System)

**Objective:** Verify that the system secures itself when the Identity Provider is down.

1.  **Action:** Stop the auth service.
    ```bash
    docker compose stop auth-service
    ```
2.  **Verify Impact:**
    - Try to refresh the **Dashboard** or navigate to any protected route.
    - **Result:** You are immediately redirected to the **Login** page or shown an error. Access is denied because the token cannot be validated.

---

## 📂 Project Structure

- `viewservice/`: The Frontend (Express + EJS templates).
- `auth-service/`: User authentication logic.
- `view-parking-service/`: Real-time parking slot logic.
- `reserve-parking-service/`: Writes reservations to DB.
- `view-reservations-service/`: Reads/Filters reservations (Admin).
- `upload-violation-service/`: Writes violations to DB.
- `common/`: Shared resources (Proto files, gRPC Client).
- `init.sql`: Database schema and seed data.

---

## 🛠️ Troubleshooting

### "System Error" on Dashboard Actions:

**\*Ensure all containers are running:**

```bash
docker ps
```

**\*If a service exited, check logs:**

```bash
docker logs <service-name>
```

**\*If you recently added code, rebuild:**

```bash
docker compose up --build
```

### Database Connection Errors:

- Ensure the `db` container is healthy.
- Check that `init.sql` ran successfully (look for tables in the DB).
