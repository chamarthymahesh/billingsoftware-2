import Customer from '../models/Customer.js';
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

// @desc   Get all customers
// @route  GET /api/customers
export const getCustomers = async (req, res) => {
  try {
    const { companyId } = req.query;
    let filter = {};
    if (companyId) {
      const Invoice = (await import('../models/Invoice.js')).default;
      const usedNames = await Invoice.distinct('customerName', { company: companyId });
      filter = { name: { $in: usedNames.map(name => new RegExp(`^${name.trim()}$`, 'i')) } };
    }
    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc   Create a customer
// @route  POST /api/customers
export const createCustomer = async (req, res) => {
  try {
    let { name, phone, gstin, state, billingAddress, shippingAddress } = req.body;
    
    if (!name) return res.status(400).json({ message: 'Customer name is required' });
    
    name = toProperCase(name.trim());

    // Check if exists
    const existing = await Customer.findOne({ name: new RegExp(`^${name}$`, 'i') }).collation({ locale: 'en', strength: 2 });
    
    if (existing) {
      return res.status(200).json(existing);
    }

    const customer = await Customer.create({
      name,
      phone: phone || '',
      gstin: gstin || '',
      state: getStateWithCode(state || '', gstin),
      billingAddress: billingAddress || '',
      shippingAddress: shippingAddress || ''
    });

    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
