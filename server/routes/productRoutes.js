import express from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { protect, superAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getProducts).post(protect, superAdmin, createProduct);
router.route('/:id').put(protect, updateProduct).delete(protect, superAdmin, deleteProduct);

export default router;
