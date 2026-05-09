const systemLogger = require('../utils/systemLogger');

module.exports = (serviceName) => {
  return (req, res, next) => {
    const start = Date.now();

    res.on('finish', async () => {
      let action = `${req.method}_${req.baseUrl || req.path}`;

      if (req.originalUrl.includes('appointment')) action = 'APPOINTMENT_ACTION';
      else if (req.originalUrl.includes('patient_Record')) action = 'PATIENT_RECORD_ACTION';
      else if (req.originalUrl.includes('users')) action = 'USER_ACTION';
      else if (req.originalUrl.includes('files')) action = 'FILE_ACTION';

      await systemLogger(req, {
        service_name: serviceName,
        action,
        status_code: res.statusCode,
        success: res.statusCode < 400,
        details: `Response time: ${Date.now() - start}ms`
      });
    });

    next();
  };
};