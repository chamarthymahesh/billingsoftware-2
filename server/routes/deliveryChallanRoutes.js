import express from 'express';
import { getDeliveryChallans, getDeliveryChallan, createDeliveryChallan, getNextChallanNumber, updateDeliveryChallan, deleteDeliveryChallan } from '../controllers/deliveryChallanController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/next-number', protect, getNextChallanNumber);
router.get('/', protect, getDeliveryChallans);
router.get('/:id', protect, getDeliveryChallan);
router.post('/', protect, createDeliveryChallan);
router.put('/:id', protect, updateDeliveryChallan);
router.delete('/:id', protect, deleteDeliveryChallan);

export default router;
