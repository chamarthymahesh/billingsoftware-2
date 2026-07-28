import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import connectDB from './config/db.js';

dotenv.config();

connectDB();

const seedSuperAdmin = async () => {
  try {
    // Upsert Super Admin
    const existingSuper = await User.findOne({ email: 'admin@billbook.com' });
    if (!existingSuper) {
      const superAdmin = new User({
        name: 'Super Admin',
        email: 'admin@billbook.com',
        password: 'Nehaal@2026',
        role: 'Super Admin',
      });
      await superAdmin.save();
      console.log('Super Admin User Created!');
    } else {
      console.log('Super Admin User already exists.');
    }

    // Upsert Personal Admin
    const existingPersonal = await User.findOne({ email: 'admin@mahesh.com' });
    if (!existingPersonal) {
      const personalAdmin = new User({
        name: 'Mahesh Personal',
        email: 'admin@mahesh.com',
        password: 'Mahesh@2026',
        role: 'Personal Admin',
      });
      await personalAdmin.save();
      console.log('Personal Admin User Created!');
    } else {
      console.log('Personal Admin User already exists.');
    }

    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedSuperAdmin();
