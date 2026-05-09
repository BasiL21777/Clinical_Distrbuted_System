const { Op } = require('sequelize');

exports.getLogs = async (req, res, next) => {
  try {
    const { SystemLog } = req.app.locals.models;

    // 🔐 JWT ROLE CHECK (no DB, no model change)
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        message: 'Admin only access'
      });
    }

    const {
      page = 1,
      limit = 20,
      service_name,
      action,
      status_code,
      search
    } = req.query;

    const where = {};

    if (service_name) where.service_name = service_name;
    if (action) where.action = action;
    if (status_code) where.status_code = status_code;

    if (search) {
      where[Op.or] = [
        { endpoint: { [Op.iLike]: `%${search}%` } },
        { details: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await SystemLog.findAndCountAll({
      where,
      limit: +limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      page: +page,
      total: count,
      logs: rows
    });

  } catch (err) {
    next(err);
  }
};