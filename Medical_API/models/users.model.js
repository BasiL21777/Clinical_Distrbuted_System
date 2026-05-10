// models/users.model.js
// This model maps to the `users` table created by the Auth Service.
// Do NOT add columns here that don't exist in the auth service's init.sql.
// Sequelize sync is set to alter:false for this model — auth service owns this table.

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      full_name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },

      hashed_password: {
        type: DataTypes.STRING(255),
        allowNull: true  // null for OAuth users
      },

      github_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true
      },

      google_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true
      },

      auth_provider: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'local'  // local | github | google
      },

      role: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'patient'  // patient | doctor | admin
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'users',

      // Auth service owns this table — disable auto timestamps
      // so Sequelize never tries to add updated_at
      timestamps: false,

      underscored: true,

      indexes: [
        { unique: true, fields: ['email'] }
      ]
    }
  );

  User.associate = (models) => {
    User.hasMany(models.Appointment, { foreignKey: 'patient_id', as: 'patient_appointments' });
    User.hasMany(models.Appointment, { foreignKey: 'doctor_id',  as: 'doctor_appointments'  });
    User.hasMany(models.PatientRecord, { foreignKey: 'patient_id', as: 'patient_records' });
    User.hasMany(models.PatientRecord, { foreignKey: 'doctor_id',  as: 'doctor_records'  });
  };

  return User;
};