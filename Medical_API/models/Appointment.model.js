// models/appointment.model.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Appointment = sequelize.define(
    'Appointment',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      patient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },

      doctor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },

      appointment_date: {
        type: DataTypes.DATE,
        allowNull: false
      },

      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('reason', value ? value.trim() : null);
        }
      },

      status: {
        type: DataTypes.ENUM(
          'scheduled',
          'completed',
          'canceled'
        ),
        allowNull: false,
        defaultValue: 'scheduled'
      },

      note: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('note', value ? value.trim() : null);
        }
      }
    },
    {
      tableName: 'appointments',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      underscored: true,

      indexes: [
        {
          fields: ['patient_id']
        },
        {
          fields: ['doctor_id']
        },
        {
          fields: ['appointment_date']
        },
        {
          fields: ['status']
        }
      ]
    }
  );

  // Associations
  Appointment.associate = (models) => {
    Appointment.belongsTo(models.User, {
      foreignKey: 'patient_id',
      as: 'patient'
    });

    Appointment.belongsTo(models.User, {
      foreignKey: 'doctor_id',
      as: 'doctor'
    });
  };

  return Appointment;
};