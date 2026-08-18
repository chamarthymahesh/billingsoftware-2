import express from 'express';
import {
  getPurchaseOrders,
  getNextPONumber,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  deletePurchaseOrder,
  convertPurchaseOrder
} from '../controllers/purchaseOrderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getPurchaseOrders)
  .post(createPurchaseOrder);

router.get('/next-number', getNextPONumber);

router.route('/:id')
  .get(getPurchaseOrder)
  .put(updatePurchaseOrder)
  .delete(deletePurchaseOrder);

router.patch('/:id/status', updatePurchaseOrderStatus);
router.post('/:id/convert', convertPurchaseOrder);

export default router;
