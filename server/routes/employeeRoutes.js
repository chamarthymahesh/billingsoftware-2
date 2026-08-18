import express from 'express';
import { 
  createEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  paySalary,
  getSalaryHistory,
  deleteSalaryRecord
} from '../controllers/employeeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/', createEmployee);
router.get('/', getEmployees);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

router.post('/salary', paySalary);
router.get('/salary', getSalaryHistory);
router.delete('/salary/:id', deleteSalaryRecord);

export default router;
