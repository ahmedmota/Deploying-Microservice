const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'order_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending',
  },
  paymentMethod: {
    type: DataTypes.ENUM('credit_card', 'debit_card', 'paypal', 'bank_transfer'),
    allowNull: false,
    field: 'payment_method',
  },
  transactionId: {
    type: DataTypes.STRING,
    unique: true,
    field: 'transaction_id',
  },
  idempotencyKey: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    field: 'idempotency_key',
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'failure_reason',
  },
}, {
  tableName: 'payments',
  indexes: [
    { fields: ['order_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] },
    { fields: ['transaction_id'], unique: true },
    { fields: ['idempotency_key'], unique: true },
  ],
});

module.exports = Payment;
