// index.js
require('dotenv').config();

const express = require('express');
const path    = require('path');
const morgan  = require('morgan');
const cors    = require('cors');

const { ERROR } = require('./utils/httpStatusText');
const { Sequelize } = require('sequelize');

const app = express();

// ── PostgreSQL Connection ─────────────────────────────────────────────────────
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  }
);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Boot: DB first, then routes, then listen ──────────────────────────────────
(async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected Successfully...');

    // Load models
    const User          = require('./models/users.model')(sequelize);
    const Appointment   = require('./models/Appointment.model')(sequelize);
    const PatientRecord = require('./models/PatientRecord.model')(sequelize);
    const SystemLog = require('./models/SystemLog.model')(sequelize);
    const modelObjects = { User, Appointment, PatientRecord, SystemLog };

    // Make models available in every controller via req.app.locals.models
    app.locals.models = modelObjects;

    // Apply associations
    Object.keys(modelObjects).forEach((name) => {
      if (modelObjects[name].associate) {
        modelObjects[name].associate(modelObjects);
      }
    });

    await sequelize.sync({ alter: true });
    console.log('Database Synced...');

    const requestLogger = require('./middelwares/requestLogger.js');

    app.use(requestLogger('Medical_API'));

    // ── Register routes AFTER models are ready ──────────────────────────────
    const usersRouter         = require('./routes/users.routes.js');
    const authRoutes          = require('./routes/auth.routes.js');
    const appointmentRoutes   = require('./routes/appointment.routes.js');
    const patientRecordRoutes = require('./routes/patientRecord.routes.js');
    const logsRoutes = require('./routes/logs.routes');

    app.use('/api/logs', logsRoutes);
    app.use('/api/users',      usersRouter);
    app.use('/api/appointment', appointmentRoutes);
    app.use('/auth',           authRoutes);
    app.use('/patient_Record', patientRecordRoutes);

    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // 404
    app.use((req, res) => {
      res.status(404).json({ status: ERROR, msg: 'this resource is not available' });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({
        status: err.statusText || ERROR,
        msg:    err.message,
        data:   null
      });
    });

    // ── Start server only after everything is ready ─────────────────────────
    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Medical API running on port ${port}...`));

  } catch (error) {
    console.error('Database Connection Failed:', error);
    process.exit(1);
  }
})();

app.set('sequelize', sequelize);

module.exports = { app, sequelize };