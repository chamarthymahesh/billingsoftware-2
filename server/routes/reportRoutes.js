import express from 'express';
import { getInvoiceProfitReport, getGSTR1Report } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/invoice-profit').get(protect, getInvoiceProfitReport);
router.route('/gstr1').get(protect, getGSTR1Report);

export default router;
