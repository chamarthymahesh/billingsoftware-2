import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const superAdmin = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === 'Super Admin' ||
      req.user.role === 'Company Admin' ||
      req.user.role === 'Manager' ||
      req.user.permissions?.includes('/products'))
  ) {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an Admin' });
  }
};

const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'Super Admin') {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized, Super Admin only' });
  }
};

export { protect, superAdmin, isSuperAdmin };
