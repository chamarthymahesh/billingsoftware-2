import mongoose from 'mongoose';

const customerSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true, // Globally unique as requested
      trim: true,
    },
    phone: {
      type: String,
      default: '',
    },
    gstin: {
      type: String,
      default: '',
    },
    state: {
      type: String,
      default: '',
    },
    billingAddress: {
      type: String,
      default: '',
    },
    shippingAddress: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const Customer = mongoose.model('Customer', customerSchema);
export default Customer;
