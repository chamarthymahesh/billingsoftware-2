import mongoose from 'mongoose';

const preOrderItemSchema = mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  hsnCode: { type: String, default: '' },
  unit: { type: String, default: 'Pcs' },
  qty: { type: Number, required: true, default: 1 },
  rate: { type: Number, required: true, default: 0 },
  mrp: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  gstRate: { type: Number, default: 18 },
  isInclusive: { type: Boolean, default: false },
  taxableAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

const preOrderSchema = mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    preOrderNumber: { type: String, required: true },
    preOrderDate: { type: Date, required: true },
    // Customer Info
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    customerGSTIN: { type: String, default: '' },
    customerState: { type: String, default: '' },
    billingAddress: { type: String, default: '' },
    shippingAddress: { type: String, default: '' },
    placeOfSupply: { type: String, default: '' },
    // Items
    items: [preOrderItemSchema],
    // Totals
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    packagingCharges: { type: Number, default: 0 },
    transportCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    // Status tracking (Pre Order status)
    status: { type: String, enum: ['Draft', 'Confirmed', 'Processing', 'Completed', 'Cancelled'], default: 'Confirmed' },
    // Notes
    notes: { type: String, default: '' },
    termsConditions: { type: String, default: '' },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String,
    },
  },
  { timestamps: true }
);

const PreOrder = mongoose.model('PreOrder', preOrderSchema);
export default PreOrder;
