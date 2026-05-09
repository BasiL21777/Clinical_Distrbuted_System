const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemLog = sequelize.define(
    'SystemLog',
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
      },

      service_name: {
        type: DataTypes.STRING,
        allowNull: false
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },

      user_role: {
        type: DataTypes.STRING,
        allowNull: true
      },

      action: {
        type: DataTypes.STRING,
        allowNull: false
      },

      resource_type: {
        type: DataTypes.STRING,
        allowNull: true
      },

      resource_id: {
        type: DataTypes.STRING,
        allowNull: true
      },

      method: {
        type: DataTypes.STRING,
        allowNull: false
      },

      endpoint: {
        type: DataTypes.TEXT,
        allowNull: false
      },

      ip_address: {
        type: DataTypes.STRING,
        allowNull: true
      },

      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      status_code: {
        type: DataTypes.INTEGER,
        allowNull: false
      },

      details: {
        type: DataTypes.TEXT,
        allowNull: true
      },

      success: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'system_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      underscored: true,

      indexes: [
        { fields: ['service_name'] },
        { fields: ['user_id'] },
        { fields: ['action'] },
        { fields: ['status_code'] },
        { fields: ['created_at'] }
      ]
    }
  );

  return SystemLog;
};