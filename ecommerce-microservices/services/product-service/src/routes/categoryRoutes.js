const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { body } = require('express-validator');
const validate = require('../middleware/validate');

// Validation rules
const categoryValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }),
  body('slug').trim().notEmpty(),
];

// Routes
router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', categoryValidation, validate, categoryController.createCategory);
router.put('/:id', categoryValidation, validate, categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
