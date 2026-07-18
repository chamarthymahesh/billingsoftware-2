import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Company from './models/Company.js';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  const email = 'laxmiventerprises1988@gmail.com';
  let user = await User.findOne({ email });
  
  const company = await Company.findOne({ name: 'LAXMI ENTERPRISES' });
  if (!company) {
    console.log('Company LAXMI ENTERPRISES not found!');
    process.exit(1);
  }

  if (user) {
    console.log('User found. Updating password & companyId...');
    user.password = 'Nehaal@2026';
    user.companyId = company._id;
    await user.save();
    console.log('User updated successfully!');
  } else {
    console.log('User not found. Creating user...');
    user = new User({
      name: 'Laxmiv Enterprises',
      email: email,
      password: 'Nehaal@2026',
      role: 'Company Admin',
      companyId: company._id,
    });
    await user.save();
    console.log('User created successfully!');
  }
  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
