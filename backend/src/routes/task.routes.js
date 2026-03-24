const router = require('express').Router();
const ctrl = require('../controllers/task.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// Supervisor/Admin creates and assigns tasks
router.post('/', authorize('admin', 'supervisor'), ctrl.createTask);

// List tasks (workers see own, supervisors/admins see all)
router.get('/', ctrl.listTasks);

// Task stats/summary for dashboard
router.get('/stats/summary', ctrl.getStats);

// Get single task details
router.get('/:id', ctrl.getTask);

// Get proof image for a task
router.get('/:id/proof', ctrl.getProof);

// Worker updates task status (in_progress, completed with proof)
router.put('/:id/status', ctrl.updateStatus);

// Supervisor reviews completed task (accepted / rejected)
router.put('/:id/review', authorize('admin', 'supervisor'), ctrl.reviewTask);

module.exports = router;
