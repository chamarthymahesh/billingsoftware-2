import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  const email = 'laxmiventerprises1988@gmail.com';
  let user = await User.findOne({ email });
  
  if (user) {
    console.log('User found. Updating password...');
    user.password = 'Nehaal@2026';
    await user.save();
    console.log('Password updated successfully!');
  } else {
    console.log('User not found. Creating user...');
    user = new User({
      name: 'Laxmiv Enterprises',
      email: email,
      password: 'Nehaal@2026',
      role: 'Company Admin',
    });
    await user.save();
    console.log('User created successfully!');
  }
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
