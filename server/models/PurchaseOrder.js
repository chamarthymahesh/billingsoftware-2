import mongoose from 'mongoose';

const purchaseOrderItemSchema = mongoose.Schema({
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

const purchaseOrderSchema = mongoose.Schema(
  {
    company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    poNumber: { type: String, required: true },
    poDate: { type: Date, required: true },
    expectedDeliveryDate: { type: Date },
    // Supplier Info
    supplierName: { type: String, required: true },
    supplierPhone: { type: String, default: '' },
    supplierGSTIN: { type: String, default: '' },
    supplierState: { type: String, default: '' },
    billingAddress: { type: String, default: '' },
    shippingAddress: { type: String, default: '' },
    // Items
    items: [purchaseOrderItemSchema],
    // Totals
    subtotal: { type: Number, default: 0 },
    totalDiscount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    packagingCharges: { type: Number, default: 0 },
    transportCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    adjustment: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    // Status tracking: Draft, Issued, Converted, Cancelled
    status: { type: String, enum: ['Draft', 'Issued', 'Converted', 'Cancelled'], default: 'Issued' },
    // Notes & Terms
    notes: { type: String, default: '' },
    termsConditions: { type: String, default: '' },
  },
  { timestamps: true }
);

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
export default PurchaseOrder;
