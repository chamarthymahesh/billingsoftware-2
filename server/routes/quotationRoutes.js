import express from 'express';
import { getQuotations, getQuotation, createQuotation, getNextQuotationNumber, updateQuotation, deleteQuotation } from '../controllers/quotationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/next-number', protect, getNextQuotationNumber);
router.get('/', protect, getQuotations);
router.get('/:id', protect, getQuotation);
router.post('/', protect, createQuotation);
router.put('/:id', protect, updateQuotation);
router.delete('/:id', protect, deleteQuotation);

export default router;
