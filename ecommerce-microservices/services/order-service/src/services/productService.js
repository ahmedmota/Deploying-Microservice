const httpClient = require('../utils/httpClient');
const logger = require('../utils/logger');

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';

// Get product by ID
const getProductById = async (productId) => {
  try {
    const response = await httpClient.get(`${PRODUCT_SERVICE_URL}/api/products/${productId}`);
    return response.data;
  } catch (error) {
    logger.error(`Error fetching product ${productId}:`, error.message);
    throw new Error('Product not found or service unavailable');
  }
};

// Update product stock
const updateProductStock = async (productId, quantity) => {
  try {
    const response = await httpClient.patch(
      `${PRODUCT_SERVICE_URL}/api/products/${productId}/stock`,
      { quantity }
    );
    return response.data;
  } catch (error) {
    logger.error(`Error updating stock for product ${productId}:`, error.message);
    throw new Error('Failed to update product stock');
  }
};

module.exports = {
  getProductById,
  updateProductStock,
};
