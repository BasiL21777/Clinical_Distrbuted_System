const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PatientRecord = sequelize.define(
    'PatientRecord',
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

      diagnosis: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('diagnosis', value ? value.trim() : null);
        }
      },

      prescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('prescription', value ? value.trim() : null);
        }
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        set(value) {
          this.setDataValue('notes', value ? value.trim() : null);
        }
      },

      is_draft: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'patient_records',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      underscored: true,

      indexes: [
        {
          fields: ['patient_id']
        },
        {
          fields: ['doctor_id']
        },
        {
          fields: ['is_draft']
        },
        {
          fields: ['created_at']
        }
      ]
    }
  );

  // Associations
  PatientRecord.associate = (models) => {
    PatientRecord.belongsTo(models.User, {
      foreignKey: 'patient_id',
      as: 'patient'
    });

    PatientRecord.belongsTo(models.User, {
      foreignKey: 'doctor_id',
      as: 'doctor'
    });
  };

  return PatientRecord;
};