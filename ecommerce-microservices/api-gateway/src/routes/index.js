const express = require('express');
const router = express.Router();
const { createProxy } = require('../middleware/proxyMiddleware');
const services = require('../config/services');

// User Service routes
router.use('/api/auth', createProxy(services.userService));
router.use('/api/users', createProxy(services.userService));

// Product Service routes
router.use('/api/products', createProxy(services.productService));
router.use('/api/categories', createProxy(services.productService));

// Order Service routes
router.use('/api/orders', createProxy(services.orderService));

// Payment Service routes
router.use('/api/payments', createProxy(services.paymentService));

// Notification Service routes
router.use('/api/notifications', createProxy(services.notificationService));

module.exports = router;
