import mongoose from 'mongoose';

const purchaseItemSchema = mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  qty: { type: Number, required: true, min: 1 },
  rate: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, default: 0 },
  isInclusive: { type: Boolean, default: false },
  total: { type: Number, required: true }
});

const purchaseSchema = mongoose.Schema({
  targetCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  supplierName: { type: String, required: true },
  supplierGSTIN: { type: String, default: '' },
  billNumber: { type: String, required: true },
  purchaseDate: { type: Date, required: true },
  paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Partial'], default: 'Pending' },
  items: [purchaseItemSchema],
  packagingCharges: { type: Number, default: 0 },
  transportCharges: { type: Number, default: 0 },
  otherMiscCharges: { type: Number, default: 0 },
  itemsTotal: { type: Number, required: true },
  extraCharges: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model('Purchase', purchaseSchema);
