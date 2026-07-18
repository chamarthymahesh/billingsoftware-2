import bcrypt from 'bcryptjs';

// @desc    Reset user password (Admin only)
// @route   PUT /api/users/:id/reset-password
// @access  Private/SuperAdmin
export const resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.password = newPassword; // The pre-save hook will hash this
      await user.save();
      res.json({ message: 'Password reset successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
