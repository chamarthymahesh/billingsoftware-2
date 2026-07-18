import Supplier from '../models/Supplier.js';
import { getStateWithCode } from '../utils/stateHelper.js';

// Helper to title case names
const toProperCase = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

// @desc   Get all suppliers
// @route  GET /api/suppliers
export const getSuppliers = async (req, res) => {
  try {
    const { companyId } = req.query;
    let filter = {};
    if (companyId) {
      const Purchase = (await import('../models/Purchase.js')).default;
      const usedNames = await Purchase.distinct('supplierName', { targetCompany: companyId });
      filter = { name: { $in: usedNames.map(name => new RegExp(`^${name.trim()}$`, 'i')) } };
    }
    const suppliers = await Supplier.find(filter).sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Create a supplier
// @route  POST /api/suppliers
export const createSupplier = async (req, res) => {
  try {
    let { name, phone, gstin, state, address } = req.body;
    
    if (!name) return res.status(400).json({ message: 'Supplier name is required' });
    
    name = toProperCase(name.trim());

    // Check if exists
    const existing = await Supplier.findOne({ name: new RegExp(`^${name}$`, 'i') }).collation({ locale: 'en', strength: 2 });
    
    if (existing) {
      return res.status(400).json({ message: 'Supplier with this name already exists' });
    }

    const supplier = await Supplier.create({
      name,
      phone: phone || '',
      gstin: gstin || '',
      state: getStateWithCode(state || '', gstin),
      address: address || ''
    });

    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
