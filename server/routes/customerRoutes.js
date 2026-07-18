import express from 'express';
import { getCustomers, createCustomer } from '../controllers/customerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

export default router;
