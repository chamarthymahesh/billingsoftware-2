import express from 'express';
import {
  getPreOrders,
  getPreOrder,
  createPreOrder,
  getNextPreOrderNumber,
  updatePreOrder,
  deletePreOrder
} from '../controllers/preOrderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/next-number', protect, getNextPreOrderNumber);
router.get('/', protect, getPreOrders);
router.get('/:id', protect, getPreOrder);
router.post('/', protect, createPreOrder);
router.put('/:id', protect, updatePreOrder);
router.delete('/:id', protect, deletePreOrder);

export default router;
