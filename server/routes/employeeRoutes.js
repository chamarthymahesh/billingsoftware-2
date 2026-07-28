import express from 'express';
import { 
  createEmployee, getEmployees, updateEmployee, 
  paySalary, getSalaryHistory 
} from '../controllers/employeeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createEmployee);
router.get('/', protect, getEmployees);
router.put('/:id', protect, updateEmployee);

router.post('/salary', protect, paySalary);
router.get('/salary', protect, getSalaryHistory);

export default router;
