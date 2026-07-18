import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Generate JWT
const generateToken = (id, companyId, role) => {
  return jwt.sign({ id, companyId, role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      companyId: user.companyId,
      token: generateToken(user._id, user.companyId, user.role),
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Private/Admin
const registerUser = async (req, res) => {
  const { name, email, password, role, companyId } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400).json({ message: "User already exists" });
    return;
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    companyId,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      companyId: user.companyId,
      token: generateToken(user._id, user.companyId, user.role),
    });
  } else {
    res.status(400).json({ message: "Invalid user data" });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      companyId: user.companyId,
    });
  } else {
    res.status(404).json({ message: "User not found" });
  }
};

// @desc    Reset user password (Admin only)
// @route   PUT /api/users/:id/reset-password
// @access  Private/SuperAdmin
const resetPassword = async (req, res) => {
  const { newPassword } = req.body;
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      user.password = newPassword; // The pre-save hook will hash this
      await user.save();
      res.json({ message: "Password reset successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Sub-User Management ---

// @desc    Get all sub-users created by the current admin
// @route   GET /api/users/sub-users
// @access  Private
const getSubUsers = async (req, res) => {
  try {
    const users = await User.find({ createdBy: req.user._id }).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Create a new sub-user
// @route   POST /api/users/sub-users
// @access  Private
const createSubUser = async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || "Staff",
      permissions: permissions || [],
      createdBy: req.user._id,
      companyId: req.user.companyId, // Inherit admin's company if applicable
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Update a sub-user
// @route   PUT /api/users/sub-users/:id
// @access  Private
const updateSubUser = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!user) return res.status(404).json({ message: "Sub-user not found" });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    if (req.body.permissions) user.permissions = req.body.permissions;
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      permissions: updatedUser.permissions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc    Delete a sub-user
// @route   DELETE /api/users/sub-users/:id
// @access  Private
const deleteSubUser = async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!user) return res.status(404).json({ message: "Sub-user not found" });
    res.json({ message: "User removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export {
  authUser,
  registerUser,
  getUserProfile,
  resetPassword,
  getSubUsers,
  createSubUser,
  updateSubUser,
  deleteSubUser,
};
