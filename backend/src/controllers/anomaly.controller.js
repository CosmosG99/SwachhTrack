const { runDetection } = require('../services/anomalyPipeline');
const { sendAnomalyAlerts } = require('../services/emailService');
const { buildPayloadForWard } = require('../services/anomalyService');

/**
 * POST /api/v1/anomaly/analyze
 * Body: { tracking_data?, checkin_data?, task_data?, notify?: boolean, ward_id?: number }
 * If ward_id is provided (admin/supervisor), loads GPS + check-ins for that ward from DB
 * and merges with any arrays sent in the body.
 */
exports.analyze = async (req, res, next) => {
  try {
    const body = req.body || {};
    let payload = {
      tracking_data: body.tracking_data,
      checkin_data: body.checkin_data,
      task_data: body.task_data,
    };

    let wardId = body.ward_id != null ? parseInt(body.ward_id, 10) : null;
    if (wardId && Number.isNaN(wardId)) wardId = null;

    if (req.user.role === 'supervisor') {
      if (wardId != null && wardId !== req.user.ward_id) {
        return res.status(403).json({ error: 'Supervisors may only analyze their own ward.' });
      }
      if (wardId == null) wardId = req.user.ward_id;
    }

    if (wardId) {
      const fromDb = await buildPayloadForWard(wardId);
      if (fromDb) {
        payload = {
          tracking_data: [
            ...(fromDb.tracking_data || []),
            ...(body.tracking_data || []),
          ],
          checkin_data: [...(fromDb.checkin_data || []), ...(body.checkin_data || [])],
          task_data: body.task_data,
        };
      }
    }

    const result = await runDetection(payload);

    if (result.error) {
      return res.status(400).json(result);
    }

    const shouldNotify = body.notify !== false;
    if (shouldNotify && result.alerts?.length) {
      await sendAnomalyAlerts(result.alerts, { wardId: wardId || undefined });
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
};
