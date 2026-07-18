import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import Invoice from './models/Invoice.js';

dotenv.config();

const run = async () => {
  await connectDB();
  const invoices = await Invoice.aggregate([
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productDetails'
      }
    }
  ]).limit(1);
  
  console.log(JSON.stringify(invoices, null, 2));
  process.exit();
};

run();
