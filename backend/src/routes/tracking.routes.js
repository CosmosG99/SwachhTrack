const router = require('express').Router();
const ctrl = require('../controllers/tracking.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// Workers submit their location
router.post('/location', ctrl.submitLocation);

// Get live location of a specific user (supervisor/admin)
router.get('/live/:userId', authorize('admin', 'supervisor'), ctrl.getLiveLocation);

// Get all workers' live locations (supervisor/admin)
router.get('/live', authorize('admin', 'supervisor'), ctrl.getAllLiveLocations);

// Get GPS trail for a user on a date (supervisor/admin or own trail)
router.get('/trail/:userId', ctrl.getTrail);

module.exports = router;
