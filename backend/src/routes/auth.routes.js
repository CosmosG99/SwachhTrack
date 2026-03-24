const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// POST /api/v1/auth/register — admin only
router.post('/register', authenticate, authorize('admin'), authController.register);

// POST /api/v1/auth/login — public
router.post('/login', authController.login);

// GET /api/v1/auth/me — authenticated
router.get('/me', authenticate, authController.getMe);

module.exports = router;
