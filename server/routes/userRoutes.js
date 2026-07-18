import express from 'express';
import {
  authUser,
  registerUser,
  getUserProfile,
  resetPassword,
  getSubUsers,
  createSubUser,
  updateSubUser,
  deleteSubUser
} from '../controllers/userController.js';
import { protect, superAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Sub-user routes (for Company Admins)
router.route('/sub-users')
  .get(protect, getSubUsers)
  .post(protect, createSubUser);
  
router.route('/sub-users/:id')
  .put(protect, updateSubUser)
  .delete(protect, deleteSubUser);

router.post('/', protect, superAdmin, registerUser);
router.post('/login', authUser);
router.get('/profile', protect, getUserProfile);
router.put('/:id/reset-password', protect, superAdmin, resetPassword);

export default router;
