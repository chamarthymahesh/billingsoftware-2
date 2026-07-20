import mongoose from 'mongoose';

const productSchema = mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: false,
    },
    name: { type: String, required: true, unique: true },
    brand: { type: String, default: '' },
    productType: { type: String, enum: ['Physical Good', 'Service'], default: 'Physical Good' },
    category: { type: String, default: '' },
    sku: { type: String, default: '' },
    barcode: { type: String, default: '' },
    hsnCode: { type: String, default: '' },
    unit: { type: String, default: 'Pcs' },
    gstRate: { type: Number, default: 18 },
    purchasePrice: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    mrp: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    minStockLevel: { type: Number, default: 5 },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);



const Product = mongoose.model('Product', productSchema);
export default Product;
