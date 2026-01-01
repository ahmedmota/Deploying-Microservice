const { Product, Category } = require('../models');
const { redisClient } = require('../config/redis');
const logger = require('../utils/logger');

const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 3600;

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, categoryId, search } = req.query;
    const cacheKey = `products:${page}:${limit}:${categoryId || 'all'}:${search || ''}`;

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for products list');
      return res.json(JSON.parse(cached));
    }

    const offset = (page - 1) * limit;
    const where = { isActive: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.name = { [require('sequelize').Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: [{ model: Category, as: 'category' }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    const response = {
      products: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit),
      },
    };

    // Cache the result
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));

    res.json(response);
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `product:${id}`;

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.info(`Cache hit for product ${id}`);
      return res.json(JSON.parse(cached));
    }

    const product = await Product.findByPk(id, {
      include: [{ model: Category, as: 'category' }],
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Cache the result
    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(product));

    res.json(product);
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    // Invalidate cache
    await invalidateProductCache();

    logger.info(`Product created: ${product.id}`);
    res.status(201).json(product);
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(400).json({ error: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await product.update(req.body);

    // Invalidate cache
    await redisClient.del(`product:${id}`);
    await invalidateProductCache();

    logger.info(`Product updated: ${id}`);
    res.json(product);
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(400).json({ error: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await product.destroy();

    // Invalidate cache
    await redisClient.del(`product:${id}`);
    await invalidateProductCache();

    logger.info(`Product deleted: ${id}`);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// Update stock
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const newStock = product.stock + quantity;
    if (newStock < 0) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    product.stock = newStock;
    await product.save();

    // Invalidate cache
    await redisClient.del(`product:${id}`);

    logger.info(`Stock updated for product ${id}: ${newStock}`);
    res.json(product);
  } catch (error) {
    logger.error('Error updating stock:', error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
};

// Helper function to invalidate product list cache
async function invalidateProductCache() {
  const keys = await redisClient.keys('products:*');
  if (keys.length > 0) {
    await redisClient.del(keys);
  }
}
