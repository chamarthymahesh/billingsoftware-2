import Product from '../models/Product.js';
import Invoice from '../models/Invoice.js';
import Purchase from '../models/Purchase.js';

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

    let products;
    let invoices = [];
    let purchases = [];

    if (companyId) {
      // 1. Fetch products owned by this company
      const ownedProducts = await Product.find({ companyId })
        .populate('companyId', 'name')
        .sort({ createdAt: -1 });

      // 2. Fetch sales invoices and purchase invoices for this company
      const [invList, purchList] = await Promise.all([
        Invoice.find({ company: companyId }).lean(),
        Purchase.find({ targetCompany: companyId }).lean(),
      ]);
      invoices = invList;
      purchases = purchList;

      // 3. Find unique products billed in this company's invoices
      const billedProductIds = [];
      invoices.forEach(inv => {
        inv.items?.forEach(item => {
          if (item.product) {
            billedProductIds.push(item.product.toString());
          }
        });
      });
      const uniqueBilledProductIds = Array.from(new Set(billedProductIds));

      // 4. Fetch the billed products (which might be owned by other companies)
      const billedProducts = await Product.find({ _id: { $in: uniqueBilledProductIds } })
        .populate('companyId', 'name');

      // 5. Merge owned products and billed products
      const allProductsMap = {};
      ownedProducts.forEach(p => {
        allProductsMap[p._id.toString()] = p;
      });
      billedProducts.forEach(p => {
        allProductsMap[p._id.toString()] = p;
      });
      products = Object.values(allProductsMap);
    } else {
      // No companyId filter: default fallback (e.g. Super Admin list)
      products = await Product.find({})
        .populate('companyId', 'name')
        .sort({ createdAt: -1 });
      
      const [invList, purchList] = await Promise.all([
        Invoice.find({}).lean(),
        Purchase.find({}).lean(),
      ]);
      invoices = invList;
      purchases = purchList;
    }

    // 6. Calculate stock dynamically for each product for the company
    const productsWithAdjustedStock = products.map(prod => {
      const prodIdStr = prod._id.toString();
      const prodCompanyIdStr = companyId || (prod.companyId?._id || prod.companyId)?.toString();

      // Calculate total quantity purchased by this company
      let totalPurchased = 0;
      purchases.forEach(p => {
        const pCompId = p.targetCompany?.toString();
        if (pCompId === prodCompanyIdStr) {
          p.items?.forEach(item => {
            if (item.product?.toString() === prodIdStr) {
              totalPurchased += Number(item.qty) || 0;
            }
          });
        }
      });

      // Calculate total quantity sold by this company
      let totalSold = 0;
      invoices.forEach(inv => {
        const invCompId = inv.company?.toString();
        if (invCompId === prodCompanyIdStr) {
          inv.items?.forEach(item => {
            if (item.product?.toString() === prodIdStr) {
              totalSold += Number(item.qty) || 0;
            }
          });
        }
      });

      const doc = prod.toObject ? prod.toObject() : prod;
      doc.stock = totalPurchased - totalSold;
      doc.totalSold = totalSold;
      doc.totalPurchased = totalPurchased;
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

    if (req.user.companyId) {
      req.body.companyId = req.user.companyId;
    }

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
    if (req.user.companyId) {
      query.companyId = req.user.companyId;
      req.body.companyId = req.user.companyId;
    }

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
    if (req.user.companyId) {
      query.companyId = req.user.companyId;
    }
    const product = await Product.findOneAndDelete(query);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
