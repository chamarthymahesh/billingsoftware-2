import express from 'express';
import { getInvoices, getInvoice, createInvoice, getNextInvoiceNumber, updateInvoice, deleteInvoice, updateBulkStatus, updateBulkCommissionStatus } from '../controllers/invoiceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/next-number', protect, getNextInvoiceNumber);
router.get('/', protect, getInvoices);
router.get('/:id', protect, getInvoice);
router.post('/', protect, createInvoice);
router.put('/bulk-status', protect, updateBulkStatus);
router.put('/bulk-commission-status', protect, updateBulkCommissionStatus);
router.put('/:id', protect, updateInvoice);
router.delete('/:id', protect, deleteInvoice);

export default router;
