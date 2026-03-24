# SwachhTrack Backend API

GPS-Based Attendance & Municipal Works Tracking Backend.

## Tech Stack
- **Runtime:** Node.js + Express
- **Database:** PostgreSQL + PostGIS
- **Real-time:** Socket.IO
- **Auth:** JWT + bcrypt + RBAC

## Quick Start

### 1. Prerequisites
- **Node.js** v18+ installed
- **PostgreSQL** 14+ with **PostGIS** extension installed

### 2. Database Setup

Open `psql` (PostgreSQL CLI) and run:

```sql
CREATE DATABASE swachhtrack;
\c swachhtrack
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";
```

### 3. Configure Environment

Edit `.env` and update your PostgreSQL credentials:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swachhtrack
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 4. Initialize Database & Seed Data

```bash
npm run db:init
```

This creates all tables and seeds:
- Admin user: `ADMIN001` / `admin123`
- Worker user: `WRK001` / `worker123`
- Sample geofence: "Municipal HQ" (Mumbai)

### 5. Start the Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

---

## Testing with cURL

### Step 1: Login as Admin
```bash
curl -X POST http://localhost:5000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"employee_id\": \"ADMIN001\", \"password\": \"admin123\"}"
```
Copy the `token` from the response.

### Step 2: Create a Geofence
```bash
curl -X POST http://localhost:5000/api/v1/geofences ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" ^
  -d "{\"name\": \"Ward 1 Office\", \"type\": \"office\", \"latitude\": 19.076, \"longitude\": 72.8777, \"radius_meters\": 200}"
```
Copy the geofence `id` from the response.

### Step 3: Generate Attendance QR Code
```bash
curl -X POST http://localhost:5000/api/v1/attendance/qr/generate ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" ^
  -d "{\"geofence_id\": \"GEOFENCE_ID_HERE\"}"
```
Copy the `qr_data` from the response.

### Step 4: Login as Worker
```bash
curl -X POST http://localhost:5000/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"employee_id\": \"WRK001\", \"password\": \"worker123\"}"
```
Copy the worker `token`.

### Step 5: Worker Checks In with QR + GPS
```bash
curl -X POST http://localhost:5000/api/v1/attendance/check-in ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer WORKER_TOKEN" ^
  -d "{\"qr_data\": \"QR_DATA_STRING_HERE\", \"latitude\": 19.076, \"longitude\": 72.8777}"
```

### Step 6: Worker Submits GPS Location
```bash
curl -X POST http://localhost:5000/api/v1/tracking/location ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer WORKER_TOKEN" ^
  -d "{\"latitude\": 19.077, \"longitude\": 72.878, \"speed\": 1.5, \"battery_level\": 85}"
```

### Step 7: Admin Views All Live Locations
```bash
curl http://localhost:5000/api/v1/tracking/live ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Step 8: Check if a Point is Inside a Geofence
```bash
curl -X POST http://localhost:5000/api/v1/geofences/check ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" ^
  -d "{\"latitude\": 19.076, \"longitude\": 72.8777}"
```

### Step 9: Worker Checks Out
```bash
curl -X POST http://localhost:5000/api/v1/attendance/check-out ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer WORKER_TOKEN" ^
  -d "{\"latitude\": 19.076, \"longitude\": 72.8777}"
```

### Step 10: View Attendance Report (Admin)
```bash
curl "http://localhost:5000/api/v1/attendance/report?date=2026-03-24" ^
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## API Endpoints Summary

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/auth/login` | Public | Login |
| POST | `/api/v1/auth/register` | Admin | Register user |
| GET | `/api/v1/auth/me` | Auth | Get profile |

### Attendance
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/attendance/qr/generate` | Supervisor+ | Generate QR code |
| POST | `/api/v1/attendance/check-in` | Auth | QR + GPS check-in |
| POST | `/api/v1/attendance/check-out` | Auth | GPS check-out |
| GET | `/api/v1/attendance/today` | Auth | Today's record |
| GET | `/api/v1/attendance/history` | Auth | History (paginated) |
| GET | `/api/v1/attendance/report` | Supervisor+ | Ward attendance report |

### Geolocation / Tracking
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/tracking/location` | Auth | Submit GPS (batch ok) |
| GET | `/api/v1/tracking/live` | Supervisor+ | All workers live |
| GET | `/api/v1/tracking/live/:userId` | Supervisor+ | Single worker live |
| GET | `/api/v1/tracking/trail/:userId` | Auth | GPS trail for a date |

### Geofences
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/v1/geofences` | Supervisor+ | Create geofence |
| GET | `/api/v1/geofences` | Auth | List geofences |
| GET | `/api/v1/geofences/:id` | Auth | Get geofence |
| PUT | `/api/v1/geofences/:id` | Supervisor+ | Update geofence |
| DELETE | `/api/v1/geofences/:id` | Admin | Deactivate geofence |
| POST | `/api/v1/geofences/check` | Auth | Containment check |

### WebSocket (Socket.IO)
Connect to `ws://localhost:5000` with `auth.token = JWT_TOKEN`.

**Worker emits:** `location:update` → `{ latitude, longitude, speed, battery_level }`
**Supervisor receives:** `worker:location` → live worker positions