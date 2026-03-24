// SwachhTrack i18n Translation Dictionary
// Supports: English (en) and Marathi (mr)

const translations = {
  en: {
    // Login
    portal: "Admin Portal",
    portalSub: "Access the SwachhTrack Command Center",
    employeeId: "Employee ID",
    password: "Password",
    loginBtn: "Login to Dashboard",
    authenticating: "Authenticating...",
    fillAll: "Please fill out all fields.",

    // Header
    dashTitle: "SwachhTrack Dashboard",
    welcome: "Welcome,",
    genQR: "Generate QR",
    registerWorker: "Register Worker",
    signOut: "Sign Out",
    loading: "Loading dashboard data...",

    // Stats
    totalWorkers: "Total Workers",
    presentToday: "Present Today",
    pendingTasks: "Pending Tasks",
    completedTasks: "Completed Tasks",

    // Map
    liveTracking: "Live Location Tracking",
    activeOnMap: "active workers on map",
    noLiveData: "No live location data available",
    active: "Active",
    inactive: "Inactive",

    // Charts
    taskDist: "Task Distribution",
    byType: "By task type",
    attendance7: "Attendance (7 Days)",
    presentPerDay: "Workers present per day",
    attendanceTrend: "Attendance Trend",
    presentVsAbsent: "Present vs absent over 7 days",
    noData: "No Data",

    // Worker Performance
    workerPerf: "Worker Performance",
    workerPerfSub: "Top workers ranked by tasks completed and attendance",
    rank: "Rank",
    worker: "Worker",
    department: "Department",
    attendance: "Attendance",
    tasks: "Tasks",
    completion: "Completion",
    noWorkerData: "No worker data available yet. Register workers and add tasks to see performance data.",
    days: "days",

    // Attendance Report
    attendanceReport: "Attendance Report — Today",
    present: "present",
    absent: "absent",
    rate: "rate",
    geofenceCompliance: "geofence compliance",
    loadingReport: "Loading attendance report...",
    employeeIdCol: "Employee ID",
    checkIn: "Check In",
    checkOut: "Check Out",
    geofence: "Geofence",
    hours: "Hours",
    yes: "Yes",
    no: "No",
    absentLabel: "Absent",
    noAttendance: "No attendance records for today.",

    // Recent Activity
    recentActivity: "Recent Activity",
    recentSub: "Latest check-ins, task updates, and alerts",
    noActivity: "No recent activity recorded yet.",
    checkedIn: "Checked in",
    checkedOut: "Checked out",
    taskLabel: "Task:",

    // Heatmap
    heatmap: "GPS Activity Heatmap",
    gpsPoints: "GPS data points recorded today",
    noGps: "No GPS tracking data recorded for today. Workers need to submit location data via the mobile app.",
    intensity: "Intensity:",
    pings: "pings",

    // QR Modal
    qrTitle: "Generate Check-in QR",
    selectSite: "Select Site / Geofence",
    loadingSites: "Loading sites...",
    cancel: "Cancel",
    generate: "Generate",
    generating: "Generating...",
    done: "Done",
    selectGeofence: "-- Select a site --",
    pleaseSelect: "Please select a geofence",

    // Register Modal
    regTitle: "Register New Worker",
    fullName: "Full Name",
    email: "Email",
    phone: "Phone",
    role: "Role",
    deptLabel: "Department",
    wardId: "Ward ID",
    roleWorker: "Worker",
    roleSupervisor: "Supervisor",
    roleAdmin: "Admin",
    deptWaste: "Waste Collection",
    deptSweep: "Sweeping",
    deptDrain: "Drain Cleaning",
    deptRoad: "Road Repair",
    deptWater: "Water Supply",
    deptSuper: "Supervision",
    selectDept: "-- Select --",
    registering: "Registering...",
    registerBtn: "Register Worker",
    regSuccess: "Worker registered successfully!",
  },

  mr: {
    // Login
    portal: "प्रशासक पोर्टल",
    portalSub: "स्वच्छट्रॅक कमांड सेंटरमध्ये प्रवेश करा",
    employeeId: "कर्मचारी आयडी",
    password: "पासवर्ड",
    loginBtn: "डॅशबोर्डवर जा",
    authenticating: "प्रमाणित करत आहे...",
    fillAll: "कृपया सर्व फील्ड भरा.",

    // Header
    dashTitle: "स्वच्छट्रॅक डॅशबोर्ड",
    welcome: "स्वागत,",
    genQR: "QR तयार करा",
    registerWorker: "कामगार नोंदणी",
    signOut: "बाहेर पडा",
    loading: "डॅशबोर्ड डेटा लोड करत आहे...",

    // Stats
    totalWorkers: "एकूण कामगार",
    presentToday: "आज उपस्थित",
    pendingTasks: "प्रलंबित कामे",
    completedTasks: "पूर्ण कामे",

    // Map
    liveTracking: "लाइव्ह स्थान ट्रॅकिंग",
    activeOnMap: "नकाशावर सक्रिय कामगार",
    noLiveData: "थेट स्थान डेटा उपलब्ध नाही",
    active: "सक्रिय",
    inactive: "निष्क्रिय",

    // Charts
    taskDist: "कार्य वितरण",
    byType: "प्रकारानुसार",
    attendance7: "उपस्थिती (७ दिवस)",
    presentPerDay: "दररोज उपस्थित कामगार",
    attendanceTrend: "उपस्थिती कल",
    presentVsAbsent: "७ दिवसांमध्ये उपस्थित विरुद्ध अनुपस्थित",
    noData: "डेटा नाही",

    // Worker Performance
    workerPerf: "कामगार कामगिरी",
    workerPerfSub: "कार्ये पूर्ण केल्यानुसार आणि उपस्थितीनुसार शीर्ष कामगार",
    rank: "क्रमांक",
    worker: "कामगार",
    department: "विभाग",
    attendance: "उपस्थिती",
    tasks: "कामे",
    completion: "पूर्णता",
    noWorkerData: "अद्याप कामगार डेटा उपलब्ध नाही. कामगिरी डेटा पाहण्यासाठी कामगारांची नोंदणी करा.",
    days: "दिवस",

    // Attendance Report
    attendanceReport: "उपस्थिती अहवाल — आज",
    present: "उपस्थित",
    absent: "अनुपस्थित",
    rate: "दर",
    geofenceCompliance: "जिओफेन्स अनुपालन",
    loadingReport: "उपस्थिती अहवाल लोड करत आहे...",
    employeeIdCol: "कर्मचारी आयडी",
    checkIn: "चेक इन",
    checkOut: "चेक आउट",
    geofence: "जिओफेन्स",
    hours: "तास",
    yes: "हो",
    no: "नाही",
    absentLabel: "अनुपस्थित",
    noAttendance: "आजसाठी उपस्थिती नोंदी नाहीत.",

    // Recent Activity
    recentActivity: "अलीकडील क्रियाकलाप",
    recentSub: "अलीकडील चेक-इन, कार्य अद्यतने आणि सूचना",
    noActivity: "अद्याप कोणताही अलीकडील क्रियाकलाप नोंदलेला नाही.",
    checkedIn: "चेक इन केले",
    checkedOut: "चेक आउट केले",
    taskLabel: "कार्य:",

    // Heatmap
    heatmap: "GPS क्रियाकलाप हीटमॅप",
    gpsPoints: "आज नोंदवलेले GPS डेटा पॉइंट",
    noGps: "आजसाठी GPS ट्रॅकिंग डेटा नोंदवलेला नाही. कामगारांना मोबाईल अॅपद्वारे स्थान डेटा सबमिट करणे आवश्यक आहे.",
    intensity: "तीव्रता:",
    pings: "पिंग",

    // QR Modal
    qrTitle: "चेक-इन QR तयार करा",
    selectSite: "साइट / जिओफेन्स निवडा",
    loadingSites: "साइट्स लोड करत आहे...",
    cancel: "रद्द करा",
    generate: "तयार करा",
    generating: "तयार करत आहे...",
    done: "पूर्ण",
    selectGeofence: "-- साइट निवडा --",
    pleaseSelect: "कृपया जिओफेन्स निवडा",

    // Register Modal
    regTitle: "नवीन कामगार नोंदणी",
    fullName: "पूर्ण नाव",
    email: "ईमेल",
    phone: "फोन",
    role: "भूमिका",
    deptLabel: "विभाग",
    wardId: "वॉर्ड आयडी",
    roleWorker: "कामगार",
    roleSupervisor: "पर्यवेक्षक",
    roleAdmin: "प्रशासक",
    deptWaste: "कचरा संकलन",
    deptSweep: "झाडलोट",
    deptDrain: "गटार साफसफाई",
    deptRoad: "रस्ता दुरुस्ती",
    deptWater: "पाणीपुरवठा",
    deptSuper: "पर्यवेक्षण",
    selectDept: "-- निवडा --",
    registering: "नोंदणी करत आहे...",
    registerBtn: "कामगार नोंदणी करा",
    regSuccess: "कामगार नोंदणी यशस्वी!",
  }
};

export default translations;
