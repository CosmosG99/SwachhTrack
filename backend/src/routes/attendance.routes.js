const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require authentication
router.use(authenticate);

// QR code generation (admin/supervisor only)
router.post('/qr/generate', authorize('admin', 'supervisor'), ctrl.generateQr);

// Check-in / Check-out (all authenticated users)
router.post('/check-in', ctrl.checkIn);
router.post('/check-out', ctrl.checkOut);

// View own attendance
router.get('/today', ctrl.getToday);
router.get('/history', ctrl.getHistory);

// Attendance report (supervisor/admin only)
router.get('/report', authorize('admin', 'supervisor'), ctrl.getReport);

module.exports = router;
