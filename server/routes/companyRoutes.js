import express from 'express';
import {
  createCompany,
  getCompanies,
  deleteCompany,
  updateCompany,
} from '../controllers/companyController.js';
import { protect, superAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .post(protect, superAdmin, createCompany)
  .get(protect, getCompanies);

router.route('/:id')
  .put(protect, updateCompany)
  .delete(protect, superAdmin, deleteCompany);

export default router;
