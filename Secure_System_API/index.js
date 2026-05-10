// index.js
require('dotenv').config();

const express = require('express');
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

    const MedicalFile = require('./models/medicalFile.model')(sequelize);
    const SystemLog   = require('./models/SystemLog.model')(sequelize);

    const models = { MedicalFile, SystemLog };
    app.locals.models = models;

    Object.values(models).forEach((model) => {
      if (model.associate) model.associate(models);
    });

    await MedicalFile.sync({ alter: true });
    await SystemLog.sync({ alter: true });

    console.log('Database Synced...');

    // ── Request logger (needs models ready to write logs) ─────────────────
    const requestLogger = require('./middlewares/requestLogger');
    app.use(requestLogger('Secure_System_API'));

    // ── Routes ────────────────────────────────────────────────────────────
    const medicalFileRoutes = require('./routes/medicalFile.routes');
    app.use('/api/files', medicalFileRoutes);

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

    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`File Service running on port ${port}...`));

  } catch (error) {
    console.error('Database Connection Failed:', error);
    process.exit(1);
  }
})();

app.set('sequelize', sequelize);
module.exports = { app, sequelize };