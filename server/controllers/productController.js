import Product from '../models/Product.js';
import Invoice from '../models/Invoice.js';
import Purchase from '../models/Purchase.js';
import Company from '../models/Company.js';

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
    const companyId = req.query.companyId;

    // Fetch all products (universal)
    const products = await Product.find({})
      .populate('companyId', 'name')
      .sort({ createdAt: -1 });

    // Fetch all companies, invoices, and purchases to calculate stocks
    const [allCompanies, allInvoices, allPurchases] = await Promise.all([
      Company.find({}).lean(),
      Invoice.find({}).lean(),
      Purchase.find({}).lean(),
    ]);

    const productsWithAdjustedStock = products.map(prod => {
      const prodIdStr = prod._id.toString();

      // Calculate stock for each company
      const companyStocks = allCompanies.map(comp => {
        const compIdStr = comp._id.toString();

        let totalPurchased = 0;
        allPurchases.forEach(p => {
          if (p.targetCompany?.toString() === compIdStr) {
            p.items?.forEach(item => {
              if (item.product?.toString() === prodIdStr) {
                totalPurchased += Number(item.qty) || 0;
              }
            });
          }
        });

        let totalSold = 0;
        allInvoices.forEach(inv => {
          if (inv.company?.toString() === compIdStr) {
            inv.items?.forEach(item => {
              if (item.product?.toString() === prodIdStr) {
                totalSold += Number(item.qty) || 0;
              }
            });
          }
        });

        return {
          companyId: compIdStr,
          companyName: comp.name,
          stock: totalPurchased - totalSold,
          totalPurchased,
          totalSold
        };
      });

      const universalStock = companyStocks.reduce((sum, cs) => sum + cs.stock, 0);
      const universalPurchased = companyStocks.reduce((sum, cs) => sum + cs.totalPurchased, 0);
      const universalSold = companyStocks.reduce((sum, cs) => sum + cs.totalSold, 0);

      const doc = prod.toObject ? prod.toObject() : prod;

      doc.companyStocks = companyStocks;
      doc.universalStock = universalStock;

      if (companyId) {
        const match = companyStocks.find(cs => cs.companyId === companyId);
        doc.stock = match ? match.stock : 0;
        doc.totalPurchased = match ? match.totalPurchased : 0;
        doc.totalSold = match ? match.totalSold : 0;
      } else {
        doc.stock = universalStock;
        doc.totalPurchased = universalPurchased;
        doc.totalSold = universalSold;
      }

      return doc;
    });

    res.json(productsWithAdjustedStock);
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

    // Duplicate check (case‑insensitive) global across all companies
    const duplicateFilter = { name: new RegExp(`^${req.body.name}$`, 'i') };
    const existing = await Product.findOne(duplicateFilter).collation({ locale: 'en', strength: 2 });
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
    // Duplicate name check (exclude current id) global across all companies
    if (req.body.name) {
      const duplicateFilter = {
        _id: { $ne: req.params.id },
        name: new RegExp(`^${req.body.name}$`, 'i')
      };
      const duplicate = await Product.findOne(duplicateFilter).collation({ locale: 'en', strength: 2 });
      if (duplicate) {
        return res.status(400).json({ message: 'Product with this name already exists' });
      }
    }

    const query = { _id: req.params.id };

    const product = await Product.findOneAndUpdate(query, req.body, { new: true });
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
    const query = { _id: req.params.id };
    const product = await Product.findOneAndDelete(query);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
