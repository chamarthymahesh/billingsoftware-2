import mongoose from 'mongoose';

const quotationItemSchema = mongoose.Schema({
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

const quotationSchema = mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    quotationNumber: { type: String, required: true },
    quotationDate: { type: Date, required: true },
    // Customer Info
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    customerGSTIN: { type: String, default: '' },
    customerState: { type: String, default: '' },
    billingAddress: { type: String, default: '' },
    shippingAddress: { type: String, default: '' },
    placeOfSupply: { type: String, default: '' },
    // Items
    items: [quotationItemSchema],
    // Totals
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    packagingCharges: { type: Number, default: 0 },
    transportCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    // Expected orders tracking
    isExpectedOrder: { type: Boolean, default: false },
    status: { type: String, enum: ['Draft', 'Sent', 'Accepted', 'Declined'], default: 'Sent' },
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

const Quotation = mongoose.model('Quotation', quotationSchema);
export default Quotation;
