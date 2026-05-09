// index.js
require('dotenv').config();

const express = require('express');
const morgan  = require('morgan');
const cors    = require('cors');

const medicalFileRoutes = require('./routes/medicalFile.routes');

const { ERROR } = require('./utils/httpStatusText');

const { Sequelize } = require('sequelize');

const app = express();

// ─── PostgreSQL Connection ───────────────────────────────────────────────────
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

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Database + Models ──────────────────────────────────────────────────────
(async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL Connected Successfully...');

    const MedicalFile = require('./models/medicalFile.model')(sequelize);
    const SystemLog = require('./models/SystemLog.model')(sequelize);

    const models = { MedicalFile , SystemLog };
    app.locals.models = models;

    Object.values(models).forEach((model) => {
      if (model.associate) model.associate(models);
    });

    await sequelize.sync({ alter: true });
    console.log('Database Synced...');

  } catch (error) {
    console.error('Database Connection Failed:', error);
  }
})();

const requestLogger = require('./middlewares/requestLogger');

app.use(requestLogger('Secure_System_API'));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/files', medicalFileRoutes);

// ─── 404 ────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ status: ERROR, msg: 'Resource not found' });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    status: err.statusText || ERROR,
    msg:    err.message,
    data:   null
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const port = process.env.PORT || 6000;
app.listen(port, () => console.log(`File Service running on port ${port}...`));

module.exports = { app, sequelize };