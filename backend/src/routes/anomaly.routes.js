const router = require('express').Router();
const ctrl = require('../controllers/anomaly.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.post('/analyze', authorize('admin', 'supervisor'), ctrl.analyze);

module.exports = router;
