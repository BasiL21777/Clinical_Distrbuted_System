module.exports = async function systemLogger(req, logData = {}) {
  try {
    const { SystemLog } = req.app.locals.models;

    if (!SystemLog) return;

    await SystemLog.create({
      service_name: logData.service_name || process.env.SERVICE_NAME || 'Medical_API',

      user_id: req.user?.id || req.user?.sub || null,
      user_role: req.user?.role || null,

      action: logData.action || 'UNKNOWN_ACTION',

      resource_type: logData.resource_type || null,
      resource_id: logData.resource_id || null,

      method: req.method,
      endpoint: req.originalUrl,

      ip_address:
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        null,

      user_agent: req.headers['user-agent'] || null,

      status_code: logData.status_code || res?.statusCode || 200,

      details: logData.details || null,

      success:
        typeof logData.success === 'boolean'
          ? logData.success
          : true
    });
  } catch (err) {
    console.error('Logging failed:', err.message);
  }
};