const { Order, OrderItem } = require('../models');
const { sequelize } = require('../config/database');
const productService = require('../services/productService');
const { sendMessage } = require('../config/sqs');
const logger = require('../utils/logger');

// Generate order number
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${timestamp}-${random}`;
};

// Create order
exports.createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { userId, items, shippingAddress, notes } = req.body;

    // Validate and fetch product details
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await productService.getProductById(item.productId);

      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ error: `Product ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Insufficient stock for product ${product.name}`,
        });
      }

      const subtotal = parseFloat(product.price) * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        subtotal,
      });
    }

    // Create order
    const order = await Order.create(
      {
        userId,
        orderNumber: generateOrderNumber(),
        totalAmount,
        shippingAddress,
        notes,
        status: 'pending',
        paymentStatus: 'pending',
      },
      { transaction }
    );

    // Create order items
    for (const item of orderItems) {
      await OrderItem.create(
        {
          orderId: order.id,
          ...item,
        },
        { transaction }
      );

      // Update product stock
      await productService.updateProductStock(item.productId, -item.quantity);
    }

    await transaction.commit();

    // Send message to payment queue
    const queueUrl = process.env.PAYMENT_QUEUE_URL;
    if (queueUrl) {
      await sendMessage(queueUrl, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        amount: order.totalAmount,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info(`Order created: ${order.orderNumber}`);

    // Fetch complete order with items
    const completeOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    res.status(201).json(completeOrder);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, userId, status } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (userId) where.userId = userId;
    if (status) where.status = status;

    const { count, rows } = await Order.findAndCountAll({
      where,
      include: [{ model: OrderItem, as: 'items' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.json({
      orders: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    logger.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findByPk(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = status;
    await order.save();

    logger.info(`Order ${order.orderNumber} status updated to ${status}`);
    res.json(order);
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const order = await Order.findByPk(id, {
      include: [{ model: OrderItem, as: 'items' }],
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'cancelled') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Order already cancelled' });
    }

    if (['shipped', 'delivered'].includes(order.status)) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Cannot cancel shipped or delivered order' });
    }

    // Restore product stock
    for (const item of order.items) {
      await productService.updateProductStock(item.productId, item.quantity);
    }

    order.status = 'cancelled';
    await order.save({ transaction });

    await transaction.commit();

    logger.info(`Order cancelled: ${order.orderNumber}`);
    res.json(order);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error cancelling order:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
};
