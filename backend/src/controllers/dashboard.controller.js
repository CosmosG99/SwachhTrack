const db = require('../config/database');

/**
 * GET /api/v1/dashboard/overview
 * Top-level KPI cards for the dashboard homepage.
 */
exports.getOverview = async (req, res, next) => {
  try {
    const { ward_id } = req.query;
    const wardFilter = ward_id ? 'AND ward_id = $1' : '';
    const params = ward_id ? [parseInt(ward_id)] : [];

    // Total active workers
    const workersResult = await db.query(
      `SELECT COUNT(*) FROM users WHERE role = 'worker' AND is_active = true ${ward_id ? 'AND ward_id = $1' : ''}`,
      params
    );

    // Today's attendance
    const attendanceResult = await db.query(
      `SELECT
        COUNT(DISTINCT a.user_id) AS present_today,
        COUNT(DISTINCT a.user_id) FILTER (WHERE a.check_in_within_geofence = true) AS within_geofence
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.date = CURRENT_DATE ${ward_id ? 'AND u.ward_id = $1' : ''}`,
      params
    );

    // Task stats for today
    const tasksResult = await db.query(
      `SELECT
        COUNT(*) AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'not_started') AS pending
       FROM tasks
       WHERE DATE(created_at) = CURRENT_DATE ${ward_id ? 'AND ward_id = $1' : ''}`,
      params
    );

    // Active anomalies
    const anomaliesResult = await db.query(
      `SELECT COUNT(*) FROM anomalies WHERE is_resolved = false`
    );

    // Currently tracking (workers with location in last 15 min)
    const trackingResult = await db.query(
      `SELECT COUNT(DISTINCT user_id) AS active_trackers
       FROM location_logs
       WHERE recorded_at > NOW() - INTERVAL '15 minutes'`
    );

    const totalWorkers = parseInt(workersResult.rows[0].count);
    const presentToday = parseInt(attendanceResult.rows[0].present_today);

    res.json({
      overview: {
        total_workers: totalWorkers,
        present_today: presentToday,
        absent_today: totalWorkers - presentToday,
        attendance_rate: totalWorkers > 0
          ? `${((presentToday / totalWorkers) * 100).toFixed(1)}%`
          : '0%',
        within_geofence: parseInt(attendanceResult.rows[0].within_geofence),
        tasks: {
          total: parseInt(tasksResult.rows[0].total_tasks),
          completed: parseInt(tasksResult.rows[0].completed),
          accepted: parseInt(tasksResult.rows[0].accepted),
          in_progress: parseInt(tasksResult.rows[0].in_progress),
          pending: parseInt(tasksResult.rows[0].pending),
        },
        active_trackers: parseInt(trackingResult.rows[0].active_trackers),
        unresolved_anomalies: parseInt(anomaliesResult.rows[0].count),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/attendance-trends
 * Attendance data for line/bar charts — last 7 or 30 days.
 * Query: ?days=7&ward_id=1
 */
exports.getAttendanceTrends = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const { ward_id } = req.query;

    const params = [days];
    let wardJoin = '';
    if (ward_id) {
      wardJoin = 'JOIN users u ON a.user_id = u.id AND u.ward_id = $2';
      params.push(parseInt(ward_id));
    }

    const result = await db.query(
      `SELECT
        d.date,
        COUNT(DISTINCT a.user_id) AS present,
        COUNT(DISTINCT a.user_id) FILTER (WHERE a.check_in_within_geofence = true) AS compliant,
        COUNT(DISTINCT a.user_id) FILTER (WHERE a.check_out_time IS NOT NULL) AS full_day
       FROM generate_series(
         CURRENT_DATE - ($1 || ' days')::interval,
         CURRENT_DATE,
         '1 day'
       ) AS d(date)
       LEFT JOIN attendance a ON a.date = d.date::date
       ${wardJoin}
       GROUP BY d.date
       ORDER BY d.date ASC`,
      params
    );

    // Also get total workers for calculating absent
    const totalResult = await db.query(
      `SELECT COUNT(*) FROM users WHERE role = 'worker' AND is_active = true ${ward_id ? 'AND ward_id = $1' : ''}`,
      ward_id ? [parseInt(ward_id)] : []
    );
    const totalWorkers = parseInt(totalResult.rows[0].count);

    const trends = result.rows.map(row => ({
      date: row.date,
      present: parseInt(row.present),
      absent: totalWorkers - parseInt(row.present),
      compliant: parseInt(row.compliant),
      full_day: parseInt(row.full_day),
      total_workers: totalWorkers,
    }));

    res.json({ trends, period: `${days} days`, total_workers: totalWorkers });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/task-analytics
 * Task completion analytics — grouped by type, priority, or date.
 * Query: ?group_by=type|priority|date&days=7&ward_id=1
 */
exports.getTaskAnalytics = async (req, res, next) => {
  try {
    const groupBy = req.query.group_by || 'type';
    const days = parseInt(req.query.days) || 7;
    const { ward_id } = req.query;

    let groupColumn, labelColumn;
    switch (groupBy) {
      case 'priority':
        groupColumn = 'priority';
        labelColumn = 'priority';
        break;
      case 'date':
        groupColumn = 'DATE(created_at)';
        labelColumn = 'date';
        break;
      default:
        groupColumn = 'type';
        labelColumn = 'type';
    }

    const params = [days];
    let wardFilter = '';
    if (ward_id) {
      wardFilter = 'AND ward_id = $2';
      params.push(parseInt(ward_id));
    }

    const result = await db.query(
      `SELECT
        ${groupColumn} AS label,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'not_started') AS not_started,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
        ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600)::numeric, 1)
          AS avg_hours_to_complete
       FROM tasks
       WHERE created_at >= NOW() - ($1 || ' days')::interval
       ${wardFilter}
       GROUP BY ${groupColumn}
       ORDER BY total DESC`,
      params
    );

    const analytics = result.rows.map(row => ({
      [labelColumn]: row.label,
      total: parseInt(row.total),
      not_started: parseInt(row.not_started),
      in_progress: parseInt(row.in_progress),
      completed: parseInt(row.completed),
      accepted: parseInt(row.accepted),
      rejected: parseInt(row.rejected),
      avg_hours_to_complete: row.avg_hours_to_complete ? parseFloat(row.avg_hours_to_complete) : null,
    }));

    res.json({ analytics, group_by: groupBy, period: `${days} days` });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/worker-performance
 * Worker leaderboard — ranked by tasks completed, attendance, and punctuality.
 * Query: ?days=7&ward_id=1&limit=20
 */
exports.getWorkerPerformance = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const limit = parseInt(req.query.limit) || 20;
    const { ward_id } = req.query;

    const params = [days, limit];
    let wardFilter = '';
    if (ward_id) {
      wardFilter = 'AND u.ward_id = $3';
      params.push(parseInt(ward_id));
    }

    const result = await db.query(
      `SELECT
        u.id,
        u.name,
        u.employee_id,
        u.department,
        u.ward_id,
        -- Attendance metrics
        COUNT(DISTINCT a.id) AS days_present,
        COUNT(DISTINCT a.id) FILTER (WHERE a.check_in_within_geofence = true) AS geofence_compliant_days,
        -- Task metrics
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('completed', 'accepted')) AS tasks_completed,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'accepted') AS tasks_accepted,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'rejected') AS tasks_rejected,
        COUNT(DISTINCT t.id) AS tasks_assigned,
        -- Avg working hours
        ROUND(AVG(
          CASE WHEN a.check_out_time IS NOT NULL
          THEN EXTRACT(EPOCH FROM (a.check_out_time - a.check_in_time)) / 3600
          END
        )::numeric, 1) AS avg_hours_worked
       FROM users u
       LEFT JOIN attendance a ON u.id = a.user_id
         AND a.date >= CURRENT_DATE - ($1 || ' days')::interval
       LEFT JOIN tasks t ON u.id = t.assigned_to
         AND t.created_at >= NOW() - ($1 || ' days')::interval
       WHERE u.role = 'worker' AND u.is_active = true ${wardFilter}
       GROUP BY u.id, u.name, u.employee_id, u.department, u.ward_id
       ORDER BY tasks_completed DESC, days_present DESC
       LIMIT $2`,
      params
    );

    const workers = result.rows.map((w, idx) => ({
      rank: idx + 1,
      id: w.id,
      name: w.name,
      employee_id: w.employee_id,
      department: w.department,
      ward_id: w.ward_id,
      attendance: {
        days_present: parseInt(w.days_present),
        geofence_compliant: parseInt(w.geofence_compliant_days),
      },
      tasks: {
        assigned: parseInt(w.tasks_assigned),
        completed: parseInt(w.tasks_completed),
        accepted: parseInt(w.tasks_accepted),
        rejected: parseInt(w.tasks_rejected),
        completion_rate: parseInt(w.tasks_assigned) > 0
          ? `${((parseInt(w.tasks_completed) / parseInt(w.tasks_assigned)) * 100).toFixed(0)}%`
          : '0%',
      },
      avg_hours_worked: w.avg_hours_worked ? parseFloat(w.avg_hours_worked) : null,
    }));

    res.json({ workers, period: `${days} days` });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/ward-summary
 * Per-ward breakdown for the admin map/table view.
 */
exports.getWardSummary = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT
        u.ward_id,
        COUNT(DISTINCT u.id) AS total_workers,
        COUNT(DISTINCT a.user_id) AS present_today,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'not_started') AS tasks_pending,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') AS tasks_in_progress,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('completed', 'accepted')) AS tasks_done,
        COUNT(DISTINCT g.id) AS geofences
       FROM users u
       LEFT JOIN attendance a ON u.id = a.user_id AND a.date = CURRENT_DATE
       LEFT JOIN tasks t ON u.id = t.assigned_to AND DATE(t.created_at) = CURRENT_DATE
       LEFT JOIN geofences g ON u.ward_id = g.ward_id AND g.is_active = true
       WHERE u.role = 'worker' AND u.is_active = true AND u.ward_id IS NOT NULL
       GROUP BY u.ward_id
       ORDER BY u.ward_id`
    );

    const wards = result.rows.map(w => ({
      ward_id: w.ward_id,
      total_workers: parseInt(w.total_workers),
      present_today: parseInt(w.present_today),
      attendance_rate: parseInt(w.total_workers) > 0
        ? `${((parseInt(w.present_today) / parseInt(w.total_workers)) * 100).toFixed(0)}%`
        : '0%',
      tasks_pending: parseInt(w.tasks_pending),
      tasks_in_progress: parseInt(w.tasks_in_progress),
      tasks_done: parseInt(w.tasks_done),
      geofences: parseInt(w.geofences),
    }));

    res.json({ wards, date: new Date().toISOString().split('T')[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/heatmap
 * GPS activity heatmap data — clustered location points for map visualization.
 * Query: ?date=2026-03-24&ward_id=1
 */
exports.getHeatmap = async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const { ward_id } = req.query;

    const params = [date];
    let wardFilter = '';
    if (ward_id) {
      wardFilter = 'AND u.ward_id = $2';
      params.push(parseInt(ward_id));
    }

    const result = await db.query(
      `SELECT
        ll.latitude, ll.longitude,
        COUNT(*) AS intensity
       FROM location_logs ll
       JOIN users u ON ll.user_id = u.id
       WHERE DATE(ll.recorded_at) = $1 ${wardFilter}
       GROUP BY ll.latitude, ll.longitude
       ORDER BY intensity DESC
       LIMIT 500`,
      params
    );

    const points = result.rows.map(p => ({
      lat: parseFloat(p.latitude),
      lng: parseFloat(p.longitude),
      intensity: parseInt(p.intensity),
    }));

    res.json({ heatmap: points, date, total_points: points.length });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/sustainability
 * SDG 12 sustainability metrics — paper saved, fuel efficiency, CO2 reduction.
 */
exports.getSustainability = async (req, res, next) => {
  try {
    // Count total digital records created (replaces paper)
    const attendanceCount = await db.query('SELECT COUNT(*) FROM attendance');
    const taskCount = await db.query('SELECT COUNT(*) FROM tasks');
    const locationCount = await db.query('SELECT COUNT(*) FROM location_logs');

    const totalAttendance = parseInt(attendanceCount.rows[0].count);
    const totalTasks = parseInt(taskCount.rows[0].count);
    const totalLocations = parseInt(locationCount.rows[0].count);

    // Each attendance check-in + check-out replaces 2 paper entries
    // Each task replaces ~3 paper forms (assignment sheet + completion report + review)
    const paperSheetsSaved = (totalAttendance * 2) + (totalTasks * 3);

    // Avg paper weight = 5g, so calculate kg saved
    const paperKgSaved = (paperSheetsSaved * 5) / 1000;

    // Tree equivalency: 1 tree = ~8,333 sheets
    const treesSaved = (paperSheetsSaved / 8333).toFixed(2);

    // CO2: 1 sheet = ~6g CO2 (production + transport)
    const co2SavedKg = (paperSheetsSaved * 6) / 1000;

    res.json({
      sustainability: {
        digital_records: {
          attendance_records: totalAttendance,
          task_records: totalTasks,
          gps_data_points: totalLocations,
          total: totalAttendance + totalTasks + totalLocations,
        },
        environmental_impact: {
          paper_sheets_saved: paperSheetsSaved,
          paper_kg_saved: paperKgSaved.toFixed(1),
          trees_equivalent: parseFloat(treesSaved),
          co2_reduced_kg: co2SavedKg.toFixed(1),
        },
        sdg_alignment: {
          sdg: 'SDG 12: Responsible Consumption & Production',
          description: '100% paperless municipal operations tracking',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/dashboard/recent-activity
 * Recent activity feed — latest check-ins, task updates, anomalies.
 * Query: ?limit=20
 */
exports.getRecentActivity = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Combine recent events from multiple tables
    const result = await db.query(
      `(
        SELECT 'attendance' AS type,
          u.name, u.employee_id,
          CASE WHEN a.check_out_time IS NOT NULL THEN 'checked_out' ELSE 'checked_in' END AS action,
          a.created_at AS timestamp,
          json_build_object('within_geofence', a.check_in_within_geofence) AS details
        FROM attendance a JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC LIMIT $1
      )
      UNION ALL
      (
        SELECT 'task' AS type,
          u.name, u.employee_id,
          t.status AS action,
          t.updated_at AS timestamp,
          json_build_object('title', t.title, 'priority', t.priority) AS details
        FROM tasks t JOIN users u ON t.assigned_to = u.id
        ORDER BY t.updated_at DESC LIMIT $1
      )
      UNION ALL
      (
        SELECT 'anomaly' AS type,
          u.name, u.employee_id,
          an.type AS action,
          an.detected_at AS timestamp,
          json_build_object('severity', an.severity, 'description', an.description) AS details
        FROM anomalies an JOIN users u ON an.user_id = u.id
        ORDER BY an.detected_at DESC LIMIT $1
      )
      ORDER BY timestamp DESC
      LIMIT $1`,
      [limit]
    );

    res.json({ activities: result.rows });
  } catch (err) {
    next(err);
  }
};
