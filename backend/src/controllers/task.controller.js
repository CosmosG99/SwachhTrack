const db = require('../config/database');
const { isValidCoordinate } = require('../utils/geoUtils');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * POST /api/v1/tasks
 * Supervisor/Admin creates and assigns a task to a worker.
 */
exports.createTask = async (req, res, next) => {
  try {
    const {
      title, description, type, priority,
      assigned_to, ward_id,
      latitude, longitude, due_date,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required.' });
    }
    if (!assigned_to) {
      return res.status(400).json({ error: 'assigned_to (worker user ID) is required.' });
    }

    // Verify the assigned worker exists
    const worker = await db.query(
      "SELECT id, name, employee_id FROM users WHERE id = $1 AND role = 'worker' AND is_active = true",
      [assigned_to]
    );
    if (worker.rows.length === 0) {
      return res.status(404).json({ error: 'Worker not found or inactive.' });
    }

    let locationGeo = null;
    if (latitude != null && longitude != null && isValidCoordinate(latitude, longitude)) {
      locationGeo = `ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography`;
    }

    const result = await db.query(
      `INSERT INTO tasks
        (title, description, type, priority, assigned_to, assigned_by,
         ward_id, latitude, longitude, ${locationGeo ? 'location,' : ''} due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
         ${locationGeo ? `ST_SetSRID(ST_MakePoint($9, $8), 4326)::geography,` : ''} $10)
       RETURNING id, title, description, type, priority, status,
         assigned_to, assigned_by, ward_id, latitude, longitude,
         due_date, created_at`,
      [
        title, description || null, type || 'other', priority || 'medium',
        assigned_to, req.user.id,
        ward_id || null, latitude || null, longitude || null,
        due_date || null,
      ]
    );

    res.status(201).json({
      message: `Task assigned to ${worker.rows[0].name} (${worker.rows[0].employee_id}).`,
      task: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks
 * List tasks with filters.
 * Query: ?status=not_started&assigned_to=UUID&type=sweeping&priority=high&page=1&limit=20
 */
exports.listTasks = async (req, res, next) => {
  try {
    const { status, assigned_to, type, priority, ward_id, page = 1, limit = 20 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    // Workers can only see their own tasks
    if (req.user.role === 'worker') {
      whereClause += ` AND t.assigned_to = $${idx}`;
      params.push(req.user.id);
      idx++;
    } else if (assigned_to) {
      whereClause += ` AND t.assigned_to = $${idx}`;
      params.push(assigned_to);
      idx++;
    }

    if (status) {
      whereClause += ` AND t.status = $${idx}`;
      params.push(status);
      idx++;
    }
    if (type) {
      whereClause += ` AND t.type = $${idx}`;
      params.push(type);
      idx++;
    }
    if (priority) {
      whereClause += ` AND t.priority = $${idx}`;
      params.push(priority);
      idx++;
    }
    if (ward_id) {
      whereClause += ` AND t.ward_id = $${idx}`;
      params.push(parseInt(ward_id));
      idx++;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const result = await db.query(
      `SELECT t.*,
        w.name AS worker_name, w.employee_id AS worker_employee_id,
        s.name AS assigned_by_name
       FROM tasks t
       LEFT JOIN users w ON t.assigned_to = w.id
       LEFT JOIN users s ON t.assigned_by = s.id
       ${whereClause}
       ORDER BY
         CASE t.priority
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           WHEN 'low' THEN 4
         END,
         t.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM tasks t ${whereClause}`,
      params.slice(0, idx - 1)
    );

    res.json({
      tasks: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks/:id
 * Get task details.
 */
exports.getTask = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT t.*,
        w.name AS worker_name, w.employee_id AS worker_employee_id, w.phone AS worker_phone,
        s.name AS assigned_by_name,
        r.name AS reviewed_by_name
       FROM tasks t
       LEFT JOIN users w ON t.assigned_to = w.id
       LEFT JOIN users s ON t.assigned_by = s.id
       LEFT JOIN users r ON t.reviewed_by = r.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Workers can only view their own tasks
    if (req.user.role === 'worker' && result.rows[0].assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'You can only view your own tasks.' });
    }

    res.json({ task: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/tasks/:id/status
 * Worker updates task status.
 * Body: { status: "in_progress" | "completed", proof_image?, proof_notes?, latitude?, longitude? }
 *
 * - "in_progress": Worker starts the task
 * - "completed": Worker finishes with proof image
 */
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, proof_notes, latitude, longitude } = req.body;
    const taskId = req.params.id;

    // Validate status
    const allowedStatuses = ['in_progress', 'completed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: `Workers can set status to: ${allowedStatuses.join(', ')}`,
      });
    }

    // Get current task
    const task = await db.query(
      'SELECT id, status, assigned_to FROM tasks WHERE id = $1',
      [taskId]
    );
    if (task.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Check worker owns this task
    if (task.rows[0].assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'This task is not assigned to you.' });
    }

    // Validate status transitions
    const currentStatus = task.rows[0].status;
    const validTransitions = {
      'not_started': ['in_progress'],
      'in_progress': ['completed'],
      'rejected': ['in_progress'],  // Can restart after rejection
    };

    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        error: `Cannot change status from "${currentStatus}" to "${status}".`,
      });
    }

    // Handle proof image from base64 in request body
    let proofImage = null;
    if (status === 'completed') {
      if (req.body.proof_image) {
        // Store base64 image directly (for simplicity in hackathon)
        proofImage = req.body.proof_image;
      }
    }

    // Build update query
    let updateFields = 'status = $1, updated_at = NOW()';
    const params = [status];
    let idx = 2;

    if (status === 'in_progress') {
      updateFields += `, started_at = NOW()`;
    }

    if (status === 'completed') {
      updateFields += `, completed_at = NOW()`;

      if (proofImage) {
        updateFields += `, proof_image = $${idx}`;
        params.push(proofImage);
        idx++;
      }
      if (proof_notes) {
        updateFields += `, proof_notes = $${idx}`;
        params.push(proof_notes);
        idx++;
      }
      if (latitude != null && longitude != null) {
        updateFields += `, proof_latitude = $${idx}, proof_longitude = $${idx + 1}`;
        params.push(latitude, longitude);
        idx += 2;
      }
    }

    params.push(taskId);

    const result = await db.query(
      `UPDATE tasks SET ${updateFields} WHERE id = $${idx}
       RETURNING id, title, status, started_at, completed_at,
         proof_notes, proof_latitude, proof_longitude, updated_at`,
      params
    );

    const statusMessages = {
      'in_progress': '🔄 Task started.',
      'completed': '✅ Task completed. Awaiting supervisor review.',
    };

    res.json({
      message: statusMessages[status],
      task: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/tasks/:id/review
 * Supervisor reviews a completed task (accept or reject).
 * Body: { decision: "accepted" | "rejected", supervisor_comment: "..." }
 */
exports.reviewTask = async (req, res, next) => {
  try {
    const { decision, supervisor_comment } = req.body;
    const taskId = req.params.id;

    if (!['accepted', 'rejected'].includes(decision)) {
      return res.status(400).json({ error: 'decision must be "accepted" or "rejected".' });
    }

    // Get current task
    const task = await db.query(
      'SELECT id, title, status, assigned_to FROM tasks WHERE id = $1',
      [taskId]
    );
    if (task.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Can only review completed tasks
    if (task.rows[0].status !== 'completed') {
      return res.status(400).json({
        error: `Cannot review a task with status "${task.rows[0].status}". Task must be "completed".`,
      });
    }

    const result = await db.query(
      `UPDATE tasks SET
        status = $1,
        supervisor_comment = $2,
        reviewed_by = $3,
        reviewed_at = NOW(),
        updated_at = NOW()
       WHERE id = $4
       RETURNING id, title, status, supervisor_comment, reviewed_by, reviewed_at`,
      [decision, supervisor_comment || null, req.user.id, taskId]
    );

    // Get worker info for the response
    const worker = await db.query(
      'SELECT name, employee_id FROM users WHERE id = $1',
      [task.rows[0].assigned_to]
    );

    const icon = decision === 'accepted' ? '✅' : '❌';

    res.json({
      message: `${icon} Task "${task.rows[0].title}" ${decision}.`,
      task: result.rows[0],
      worker: worker.rows[0] || null,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks/:id/proof
 * Get the proof image for a task.
 */
exports.getProof = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, title, status, proof_image, proof_notes,
              proof_latitude, proof_longitude, completed_at
       FROM tasks WHERE id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const task = result.rows[0];
    if (!task.proof_image) {
      return res.status(404).json({ error: 'No proof image uploaded for this task.' });
    }

    res.json({
      task_id: task.id,
      title: task.title,
      status: task.status,
      proof_image: task.proof_image,
      proof_notes: task.proof_notes,
      proof_location: task.proof_latitude ? {
        latitude: task.proof_latitude,
        longitude: task.proof_longitude,
      } : null,
      completed_at: task.completed_at,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/tasks/stats/summary
 * Dashboard summary stats for tasks.
 * Query: ?ward_id=1&assigned_to=UUID
 */
exports.getStats = async (req, res, next) => {
  try {
    const { ward_id, assigned_to } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let idx = 1;

    if (req.user.role === 'worker') {
      whereClause += ` AND assigned_to = $${idx}`;
      params.push(req.user.id);
      idx++;
    } else if (assigned_to) {
      whereClause += ` AND assigned_to = $${idx}`;
      params.push(assigned_to);
      idx++;
    }

    if (ward_id) {
      whereClause += ` AND ward_id = $${idx}`;
      params.push(parseInt(ward_id));
      idx++;
    }

    const result = await db.query(
      `SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'not_started') AS not_started,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected
       FROM tasks
       ${whereClause}`,
      params
    );

    const stats = result.rows[0];
    const total = parseInt(stats.total);
    const completionRate = total > 0
      ? (((parseInt(stats.accepted) + parseInt(stats.completed)) / total) * 100).toFixed(1)
      : '0.0';

    res.json({
      stats: {
        total,
        not_started: parseInt(stats.not_started),
        in_progress: parseInt(stats.in_progress),
        completed: parseInt(stats.completed),
        accepted: parseInt(stats.accepted),
        rejected: parseInt(stats.rejected),
        completion_rate: `${completionRate}%`,
      },
    });
  } catch (err) {
    next(err);
  }
};
