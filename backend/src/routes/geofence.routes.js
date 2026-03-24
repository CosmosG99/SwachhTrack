const router = require('express').Router();
const ctrl = require('../controllers/geofence.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// CRUD — admin/supervisor only
router.post('/', authorize('admin', 'supervisor'), ctrl.create);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.put('/:id', authorize('admin', 'supervisor'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

// Containment check — all authenticated users
router.post('/check', ctrl.checkContainment);

module.exports = router;
