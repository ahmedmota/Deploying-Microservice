const Order = require('./Order');
const OrderItem = require('./OrderItem');

// Define relationships
Order.hasMany(OrderItem, {
  foreignKey: 'orderId',
  as: 'items',
  onDelete: 'CASCADE',
});

OrderItem.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order',
});

module.exports = {
  Order,
  OrderItem,
};
