// index.js
require('dotenv').config();

const express = require('express');
const path    = require('path');
const morgan  = require('morgan');
const cors    = require('cors');

const { ERROR } = require('./utils/httpStatusText');
const { Sequelize } = require('sequelize');

const app = express();

// ── PostgreSQL ────────────────────────────────────────────────────────────────
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

// ── Boot ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected Successfully...');

    const User          = require('./models/users.model')(sequelize);
    const Appointment   = require('./models/Appointment.model')(sequelize);
    const PatientRecord = require('./models/PatientRecord.model.js')(sequelize);
    const SystemLog     = require('./models/SystemLog.model.js')(sequelize);

    const modelObjects = { User, Appointment, PatientRecord, SystemLog };
    app.locals.models = modelObjects;

    Object.keys(modelObjects).forEach((name) => {
      if (modelObjects[name].associate) {
        modelObjects[name].associate(modelObjects);
      }
    });

    // Auth service owns users table — never alter it
    await Appointment.sync({ alter: true });
    await PatientRecord.sync({ alter: true });
    await SystemLog.sync({ alter: true });
    await User.sync({ alter: false });

    console.log('Database Synced...');

    // ── Request logger (needs models ready to write logs) ─────────────────
    const requestLogger = require('./middelwares/requestLogger');
    app.use(requestLogger('Medical_API'));

    // ── Routes ────────────────────────────────────────────────────────────
    const usersRouter         = require('./routes/users.routes.js');
    const appointmentRoutes   = require('./routes/appointment.routes.js');
    const patientRecordRoutes = require('./routes/patientRecord.routes.js');
    const System_Logs         = require('./routes/logs.routes.js');

    app.use('/api/users',          usersRouter);
    app.use('/api/appointment',    appointmentRoutes);
    app.use('/api/patient_Record', patientRecordRoutes);
    app.use('/api/logs',           System_Logs);

    // 404
    app.use((req, res) => {
      res.status(404).json({ status: ERROR, msg: 'Resource not found' });
    });

    // Global error handler
    app.use((err, req, res, next) => {
      res.status(err.statusCode || 500).json({
        status: err.statusText || ERROR,
        msg:    err.message,
        data:   null
      });
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Medical API running on port ${port}...`));

  } catch (error) {
    console.error('Database Connection Failed:', error);
    process.exit(1);
  }
})();

app.set('sequelize', sequelize);
module.exports = { app, sequelize };