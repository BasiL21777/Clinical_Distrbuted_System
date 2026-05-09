const { DataTypes } = require('sequelize');
const validator = require('validator');
const userRoles = require('../utils/userRoles');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },

      auth_user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },

      auth_provider: {
        type: DataTypes.ENUM('github', 'google', 'local'),
        allowNull: false,
        defaultValue: 'github'
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail(value) {
            if (!validator.isEmail(value)) {
              throw new Error('Invalid email format');
            }
          },
          notEmpty: {
            msg: 'Email is required'
          }
        },
        set(value) {
          this.setDataValue('email', value.trim().toLowerCase());
        }
      },

      role: {
        type: DataTypes.ENUM(
          userRoles.ADMIN,
          userRoles.PATIENT,
          userRoles.DOCTOR
        ),
        allowNull: false,
        defaultValue: userRoles.PATIENT
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      tableName: 'users',
      timestamps: true,
      underscored: true,

      indexes: [
        {
          unique: true,
          fields: ['email']
        },
        {
          unique: true,
          fields: ['auth_user_id']
        }
      ]
    }
  );

  return User;
};