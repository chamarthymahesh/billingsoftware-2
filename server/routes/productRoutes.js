import express from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { protect, isSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getProducts).post(protect, isSuperAdmin, createProduct);
router.route('/:id').put(protect, updateProduct).delete(protect, isSuperAdmin, deleteProduct);

export default router;
