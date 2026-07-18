import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import connectDB from './config/db.js';

dotenv.config();

connectDB();

const seedSuperAdmin = async () => {
  try {
    await User.deleteMany(); // Clear existing users

    const superAdmin = new User({
      name: 'Super Admin',
      email: 'admin@billbook.com',
      password: 'password123',
      role: 'Super Admin',
    });

    await superAdmin.save();
    console.log('Super Admin User Created!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedSuperAdmin();
