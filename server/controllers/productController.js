import Product from '../models/Product.js';

// Helper: convert any string to Proper Case (Title Case)
const toProperCase = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

// @desc   Get all products for a company
// @route  GET /api/products?companyId=xxx
export const getProducts = async (req, res) => {
  try {
    const { companyId } = req.query;
    const filter = companyId ? { companyId } : {};
    const products = await Product.find(filter)
      .populate('companyId', 'name')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Create a product
// @route  POST /api/products
export const createProduct = async (req, res) => {
  try {
    // Normalize fields to Proper Case
    if (req.body.name) req.body.name = toProperCase(req.body.name.trim());
    if (req.body.brand) req.body.brand = toProperCase(req.body.brand.trim());
    if (req.body.category) req.body.category = toProperCase(req.body.category.trim());

    // Global duplicate check (case‑insensitive)
    const existing = await Product.findOne({ name: new RegExp(`^${req.body.name}$`, 'i') }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      return res.status(400).json({ message: 'Product with this name already exists' });
    }

    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Update a product
// @route  PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    // Normalize fields to Proper Case
    if (req.body.name) req.body.name = toProperCase(req.body.name.trim());
    if (req.body.brand) req.body.brand = toProperCase(req.body.brand.trim());
    if (req.body.category) req.body.category = toProperCase(req.body.category.trim());

    // Duplicate name check (exclude current id)
    if (req.body.name) {
      const duplicate = await Product.findOne({
        _id: { $ne: req.params.id },
        name: new RegExp(`^${req.body.name}$`, 'i')
      }).collation({ locale: 'en', strength: 2 });
      if (duplicate) {
        return res.status(400).json({ message: 'Product with this name already exists' });
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Delete a product
// @route  DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
