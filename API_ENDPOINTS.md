# SwachhTrack API Endpoints

This document lists all the live endpoints currently available on the SwachhTrack backend.

---

### Base Server URL
**REST API:** `https://swachhtrack-4gnt.onrender.com`  
**Socket.IO:** `wss://swachhtrack-4gnt.onrender.com`

---

### 1. 🔐 Authentication & Users
- **POST** `/api/v1/auth/login` (Body: `employee_id`, `password`)
- **POST** `/api/v1/auth/register` (For adding new workers via Dashboard)
- **GET** `/api/v1/auth/me` (Gets current user's details using their Token)

---

### 2. 📊 Dashboard Analytics (For React Team)
*All these require an Admin or Supervisor Token*
- **GET** `/api/v1/dashboard/overview`
- **GET** `/api/v1/dashboard/attendance-trends?days=7`
- **GET** `/api/v1/dashboard/task-analytics?group_by=type`
- **GET** `/api/v1/dashboard/worker-performance?days=7`
- **GET** `/api/v1/dashboard/ward-summary`
- **GET** `/api/v1/dashboard/heatmap?date=2026-03-24`
- **GET** `/api/v1/dashboard/sustainability`
- **GET** `/api/v1/dashboard/recent-activity?limit=20`

---

### 3. 📝 Tasks Management (For Flutter & React)
- **POST** `/api/v1/tasks` (Dashboard creates a task)
- **GET** `/api/v1/tasks` (List all tasks)
- **GET** `/api/v1/tasks/:id` (Get a single task by ID)
- **PUT** `/api/v1/tasks/:id/status` (Flutter worker updates status & uploads base64 photo)
- **PUT** `/api/v1/tasks/:id/review` (Dashboard supervisor accepts/rejects task)

---

### 4. ⏰ Attendance (For Flutter)
- **POST** `/api/v1/attendance/qr/generate` (Admin generates a QR)
- **POST** `/api/v1/attendance/check-in` (Flutter scans QR and sends lat/lng)
- **POST** `/api/v1/attendance/check-out` (Flutter scans QR to checkout)
- **GET** `/api/v1/attendance/today` (Worker sees their own status)
- **GET** `/api/v1/attendance/history`
- **GET** `/api/v1/attendance/report` (Dashboard views everyone's attendance)

---

### 5. 📍 Tracking (For Flutter & React)
- **POST** `/api/v1/tracking/location` (Flutter background task sends GPS constantly)
- **GET** `/api/v1/tracking/live` (Dashboard gets everyone's latest location)
- **GET** `/api/v1/tracking/live/:userId`
- **GET** `/api/v1/tracking/trail/:userId` (Dashboard draws a worker's path line)

---

### 6. 🗺️ Geofences (For React)
- **POST** `/api/v1/geofences` (Creates a work zone)
- **GET** `/api/v1/geofences`
- **GET** `/api/v1/geofences/:id`
- **PUT** `/api/v1/geofences/:id`
- **DELETE** `/api/v1/geofences/:id`
- **POST** `/api/v1/geofences/check` (Utilities for Flutter/React to check if someone is inside a circle)

---

> **Note:** For debugging or testing, hitting the root URL `https://swachhtrack-4gnt.onrender.com/` returns a simple `"status": "running"` message so you know the server is awake!
