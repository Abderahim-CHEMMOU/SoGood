const express = require('express');
const ProductController = require('../controllers/productController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Routes avec controllers
router.get('/', authMiddleware, ProductController.getAllProducts);
router.get('/search', authMiddleware, ProductController.searchProducts);
router.get('/controversial', authMiddleware, ProductController.getControversialProducts);
router.get('/nutriscore/range', authMiddleware, ProductController.getProductsByNutriscoreRange);
router.get('/nutriscore/:score', authMiddleware, ProductController.getProductsByNutriscore);
// router.post('/', ProductController.createProduct);
router.post('/', authMiddleware, ProductController.createProduct);
router.get('/:id', authMiddleware,ProductController.getProductById);

module.exports = router;