import mongoose from 'mongoose';

const invoiceItemSchema = mongoose.Schema({
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

const invoiceSchema = mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Pending' },
    paymentMethod: { type: String, default: 'Cash' },
    // Customer
    customerName: { type: String, required: true },
    customerPhone: { type: String, default: '' },
    customerGSTIN: { type: String, default: '' },
    customerState: { type: String, default: '' },
    billingAddress: { type: String, default: '' },
    shippingAddress: { type: String, default: '' },
    placeOfSupply: { type: String, default: '' },
    // Items
    items: [invoiceItemSchema],
    // Totals
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    packagingCharges: { type: Number, default: 0 },
    transportCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    commissionType: { type: String, default: 'None' },
    commissionValue: { type: Number, default: 0 },
    commissionAmount: { type: Number, default: 0 },
    commissionStatus: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Pending' },
    grandTotal: { type: Number, default: 0 },
    // Notes
    notes: { type: String, default: '' },
    termsConditions: { type: String, default: '' },
    materialDeliveryStatus: { type: String, enum: ['Pending', 'Delivered'], default: 'Pending' },
  },
  { timestamps: true }
);

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
