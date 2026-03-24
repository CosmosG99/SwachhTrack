const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All dashboard endpoints require auth + supervisor/admin role
router.use(authenticate);
router.use(authorize('admin', 'supervisor'));

// KPI overview cards
router.get('/overview', ctrl.getOverview);

// Attendance line/bar chart data
router.get('/attendance-trends', ctrl.getAttendanceTrends);

// Task analytics grouped by type/priority/date
router.get('/task-analytics', ctrl.getTaskAnalytics);

// Worker performance leaderboard
router.get('/worker-performance', ctrl.getWorkerPerformance);

// Per-ward breakdown
router.get('/ward-summary', ctrl.getWardSummary);

// GPS heatmap data for map visualization
router.get('/heatmap', ctrl.getHeatmap);

// SDG 12 sustainability metrics
router.get('/sustainability', ctrl.getSustainability);

// Recent activity feed
router.get('/recent-activity', ctrl.getRecentActivity);

module.exports = router;
