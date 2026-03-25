# 🌍 SwachhTrack

![SwachhTrack Banner](https://img.shields.io/badge/SwachhTrack-Smart%20Sanitation%20Management-brightgreen?style=for-the-badge)  
**A Next-Generation GPS-Based Attendance and Municipal Works Tracking System**

SwachhTrack is an end-to-end management solution designed for municipal corporations and sanitation departments. It bridges the gap between administrators and field workers (sweepers, waste collectors) by bringing real-time visibility, automated attendance via Geofencing, Live GPS tracking, and AI-powered safety checks.

---

## ✨ Key Features

### 📍 1. Live GPS Tracking & Geofencing
- **Real-time Map:** Supervisors can see exactly where every worker is on a live map.
- **Geofenced Check-ins:** Workers can only check-in when they are physically inside their assigned work zone (Geofence).
- **Route Deviation Alerts:** Immediate alerts if a worker leaves their designated area during work hours.

### 📱 2. Worker Mobile App (Flutter)
- **QR Code Scanning:** Fast, secure check-ins via dynamic QR codes at work sites.
- **Task Management:** Workers can view assigned tasks, update statuses, and upload completion photos directly from the field.
- **Background Tracking:** Seamless continuous location updates sent battery-efficiently.

### 💻 3. Admin Dashboard (React)
- **Comprehensive Analytics:** Visual charts (Recharts) detailing attendance trends, task completion rates, and worker performance.
- **Heatmaps:** Density maps of worker coverage across the city to identify neglected areas.
- **One-Click Reports:** Export attendance and performance summaries directly as PDFs.

### 🤖 4. AI-Powered Anomaly & Safety Detection (Python)
- **PPE Compliance:** Uses YOLO (Ultralytics) and OpenCV to analyze images and ensure workers are wearing assigned safety gear (e.g., Helmets, Vests).
- **Automated Alerts:** Emails are automatically dispatched via NodeMailer if severe anomalies are detected.

---

## 🛠️ Technology Stack

### **Backend Core (Node.js & Express)**
- **Database:** PostgreSQL for robust ACID-compliant relational data.
- **Authentication:** JWT (JSON Web Tokens) & bcrypt.
- **Real-time:** `Socket.io` for live map tracking.
- **Utilities:** `nodemailer` for alerts, `qrcode` for dynamic code generation.

### **Admin Dashboard (React + Vite)**
- **Maps:** `leaflet` & `react-leaflet`
- **Charts:** `recharts` for rich data visualization.
- **Exports:** `jspdf` & `jspdf-autotable`
- **Icons:** `lucide-react`

### **Mobile App (Flutter)**
- **Maps & Location:** `google_maps_flutter`, `flutter_map`, `geolocator`
- **Camera & Scanning:** `camera`, `mobile_scanner`
- **Background Services:** `flutter_background_service`

### **Anomaly Detection (Python)**
- **API Framework:** `FastAPI`, `uvicorn`
- **Computer Vision:** `opencv-python`, `numpy`
- **AI Models:** `ultralytics` (YOLO)

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
# Set up .env with DB credentials and SMTP details
npm run db:init # Initialize Schema
npm start       # or npm run dev
```

### 2. Admin Dashboard
```bash
cd dashboard
npm install
npm run dev
```

### 3. Mobile App
```bash
cd frontend
flutter pub get
flutter run
```

### 4. AI/Anomaly Detection Service
```bash
cd anomaly-detection
py -m pip install -r requirements.txt
py main.py
```

---

## 📖 API Documentation
For a complete list of endpoints (Auth, Dashboard, Tasks, Geofences, and Tracking), refer to the [API_ENDPOINTS.md](./API_ENDPOINTS.md) file located in the root directory.

---

**Built with ❤️ for a cleaner, smarter, and safer tomorrow.**
