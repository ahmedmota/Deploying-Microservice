const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

class User extends Model {
  /**
   * Check if password matches
   * @param {string} password - Plain text password
   * @returns {Promise<boolean>}
   */
  async validatePassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }

  /**
   * Get public user data (excludes sensitive fields)
   * @returns {Object}
   */
  toJSON() {
    const values = { ...this.get() };
    delete values.password_hash;
    delete values.deleted_at;
    return values;
  }

  /**
   * Get user summary (minimal data)
   * @returns {Object}
   */
  getSummary() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
    };
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Must be a valid email address',
        },
      },
      set(value) {
        this.setDataValue('email', value.toLowerCase().trim());
      },
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: {
          args: [2, 255],
          msg: 'Name must be between 2 and 255 characters',
        },
      },
      set(value) {
        this.setDataValue('name', value.trim());
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^\+?[1-9]\d{1,14}$/,
          msg: 'Must be a valid phone number',
        },
      },
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'moderator'),
      defaultValue: 'user',
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
      defaultValue: 'active',
      allowNull: false,
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_login_ip: {
      type: DataTypes.STRING(45), // IPv6 compatible
      allowNull: true,
    },
    failed_login_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    paranoid: true, // Soft deletes
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['role'],
      },
      {
        fields: ['created_at'],
      },
    ],
  }
);

// Hooks
User.beforeCreate(async (user) => {
  // Hash password before creating user
  if (user.password_hash && !user.password_hash.startsWith('$2a$')) {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(user.password_hash, salt);
  }
});

User.beforeUpdate(async (user) => {
  // Hash password if it was changed
  if (user.changed('password_hash') && !user.password_hash.startsWith('$2a$')) {
    const salt = await bcrypt.genSalt(10);
    user.password_hash = await bcrypt.hash(user.password_hash, salt);
  }
});

module.exports = User;
