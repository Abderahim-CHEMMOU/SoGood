const express = require('express');
const ProductController = require('../controllers/productController');

const router = express.Router();

// Routes avec controllers
router.get('/', ProductController.getAllProducts);
router.get('/search', ProductController.searchProducts);
router.get('/controversial', ProductController.getControversialProducts);
router.get('/nutriscore/range', ProductController.getProductsByNutriscoreRange);
router.get('/nutriscore/:score', ProductController.getProductsByNutriscore);
router.post('/', ProductController.createProduct);
router.get('/:id', ProductController.getProductById);

module.exports = router;