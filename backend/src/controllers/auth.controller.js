const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const config = require('../config/environment');

/**
 * POST /api/v1/auth/register
 * Register a new user (admin only).
 */
exports.register = async (req, res, next) => {
  try {
    const { employee_id, name, email, phone, password, role, department, ward_id } = req.body;

    if (!employee_id || !name || !phone || !password) {
      return res.status(400).json({ error: 'employee_id, name, phone, and password are required.' });
    }

    const validRoles = ['worker', 'supervisor', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Check duplicates
    const existing = await db.query(
      'SELECT id FROM users WHERE employee_id = $1 OR phone = $2 OR (email IS NOT NULL AND email = $3)',
      [employee_id, phone, email || '']
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'User with this employee_id, phone, or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.query(
      `INSERT INTO users (employee_id, name, email, phone, password_hash, role, department, ward_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, employee_id, name, email, phone, role, department, ward_id, created_at`,
      [employee_id, name, email || null, phone, passwordHash, role || 'worker', department || null, ward_id || null]
    );

    res.status(201).json({
      message: 'User registered successfully.',
      user: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/login
 * Login with employee_id/phone + password.
 */
exports.login = async (req, res, next) => {
  try {
    const { employee_id, phone, password } = req.body;

    if ((!employee_id && !phone) || !password) {
      return res.status(400).json({ error: 'Provide employee_id or phone, and password.' });
    }

    const result = await db.query(
      'SELECT * FROM users WHERE employee_id = $1 OR phone = $2',
      [employee_id || '', phone || '']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        ward_id: user.ward_id,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 * Get current authenticated user's profile.
 */
exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
