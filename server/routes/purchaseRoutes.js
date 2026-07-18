import express from 'express';
import { createPurchase, getPurchases, getSuppliers, transferStock, updatePurchase, deletePurchase, updatePurchaseStatus } from '../controllers/purchaseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, createPurchase)
  .get(protect, getPurchases);

router.get('/suppliers', protect, getSuppliers);
router.post('/transfer', protect, transferStock);

router.patch('/:id/status', protect, updatePurchaseStatus);
router.put('/:id', protect, updatePurchase);
router.delete('/:id', protect, deletePurchase);

export default router;

