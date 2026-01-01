const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const productValidation = [
  body('name').trim().isLength({ min: 3, max: 255 }),
  body('price').isFloat({ min: 0 }),
  body('categoryId').isUUID(),
  body('sku').trim().notEmpty(),
  body('stock').optional().isInt({ min: 0 }),
];

// Routes
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.post('/', productValidation, validate, productController.createProduct);
router.put('/:id', productValidation, validate, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.patch('/:id/stock',
  body('quantity').isInt(),
  validate,
  productController.updateStock
);

module.exports = router;
