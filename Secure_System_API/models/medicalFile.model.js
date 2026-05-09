// models/medicalFile.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MedicalFile = sequelize.define(
    'MedicalFile',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      // Doctor (or admin) who uploaded — id comes from JWT sub
      uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      // Patient this file belongs to — id comes from request body
      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      // Optional cross-service references — stored as plain integers, no FK constraints
      appointment_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },

      record_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },

      file_type: {
        type: DataTypes.ENUM('lab_result', 'prescription', 'xray', 'scan', 'report', 'other'),
        allowNull: false,
        defaultValue: 'other'
      },

      // Original file name shown to users
      original_name: {
        type: DataTypes.STRING,
        allowNull: false
      },

      // UUID-based name stored on disk — never exposed to clients
      stored_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },

      mime_type: {
        type: DataTypes.STRING,
        allowNull: false
      },

      size_bytes: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      // SHA-256 hash of the original file (before encryption)
      hash_sha256: {
        type: DataTypes.STRING(64),
        allowNull: false
      },

      is_encrypted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'medical_files',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['patient_id'] },
        { fields: ['uploaded_by'] }
      ]
    }
  );

  return MedicalFile;
};