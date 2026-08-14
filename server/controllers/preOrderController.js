import PreOrder from '../models/PreOrder.js';
import { getStateWithCode } from '../utils/stateHelper.js';

// GET /api/pre-orders?companyId=xxx
export const getPreOrders = async (req, res) => {
  try {
    const company = req.user?.companyId || req.query.companyId;
    let filter = {};
    if (company && company !== 'ALL') {
      filter.company = company;
    }
    const { startDate, endDate, month } = req.query;
    if (startDate || endDate) {
      filter.preOrderDate = {};
      if (startDate) filter.preOrderDate.$gte = new Date(startDate);
      if (endDate) filter.preOrderDate.$lte = new Date(endDate + 'T23:59:59.999Z');
    } else if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const start = new Date(Date.UTC(year, m, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999));
      filter.preOrderDate = { $gte: start, $lte: end };
    }
    const preOrders = await PreOrder.find(filter).populate('company').sort({ preOrderDate: -1 });
    res.json(preOrders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/pre-orders/next-number?companyId=xxx
export const getNextPreOrderNumber = async (req, res) => {
  try {
    const company = req.user.companyId || req.query.companyId;
    if (!company) return res.status(400).json({ message: 'companyId required' });
    const count = await PreOrder.countDocuments({ company });
    const nextNum = `PRE-${String(count + 1).padStart(4, '0')}`;
    res.json({ preOrderNumber: nextNum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/pre-orders/:id
export const getPreOrder = async (req, res) => {
  try {
    const preOrder = await PreOrder.findById(req.params.id).populate('company').populate('items.product');
    if (!preOrder) return res.status(404).json({ message: 'Pre-order not found' });
    if (req.user.companyId && preOrder.company._id.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this pre-order' });
    }
    res.json(preOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/pre-orders
export const createPreOrder = async (req, res) => {
  try {
    if (req.user.companyId) {
      req.body.company = req.user.companyId;
    }
    if (req.body.customerState !== undefined) {
      req.body.customerState = getStateWithCode(req.body.customerState, req.body.customerGSTIN);
    }
    if (req.body.placeOfSupply !== undefined) {
      req.body.placeOfSupply = getStateWithCode(req.body.placeOfSupply, req.body.customerGSTIN);
    }
    const {
      company, preOrderNumber, preOrderDate,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions,
      status, bankDetails
    } = req.body;

    if (!company || !preOrderNumber || !customerName || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const preOrder = new PreOrder({
      company, preOrderNumber, preOrderDate,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions,
      status, bankDetails: bankDetails || null
    });

    const savedPreOrder = await preOrder.save();
    res.status(201).json(savedPreOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/pre-orders/:id
export const updatePreOrder = async (req, res) => {
  try {
    const existingPreOrder = await PreOrder.findById(req.params.id);
    if (!existingPreOrder) return res.status(404).json({ message: 'Pre-order not found' });
    if (req.user.companyId && existingPreOrder.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this pre-order' });
    }

    if (req.body.customerState !== undefined) {
      req.body.customerState = getStateWithCode(req.body.customerState, req.body.customerGSTIN);
    }
    if (req.body.placeOfSupply !== undefined) {
      req.body.placeOfSupply = getStateWithCode(req.body.placeOfSupply, req.body.customerGSTIN);
    }

    const {
      preOrderNumber, preOrderDate,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions,
      status, bankDetails
    } = req.body;

    existingPreOrder.preOrderNumber = preOrderNumber || existingPreOrder.preOrderNumber;
    existingPreOrder.preOrderDate = preOrderDate || existingPreOrder.preOrderDate;
    existingPreOrder.customerName = customerName || existingPreOrder.customerName;
    existingPreOrder.customerPhone = customerPhone !== undefined ? customerPhone : existingPreOrder.customerPhone;
    existingPreOrder.customerGSTIN = customerGSTIN !== undefined ? customerGSTIN : existingPreOrder.customerGSTIN;
    existingPreOrder.customerState = customerState !== undefined ? customerState : existingPreOrder.customerState;
    existingPreOrder.billingAddress = billingAddress !== undefined ? billingAddress : existingPreOrder.billingAddress;
    existingPreOrder.shippingAddress = shippingAddress !== undefined ? shippingAddress : existingPreOrder.shippingAddress;
    existingPreOrder.placeOfSupply = placeOfSupply !== undefined ? placeOfSupply : existingPreOrder.placeOfSupply;
    existingPreOrder.items = items || existingPreOrder.items;
    existingPreOrder.subtotal = subtotal !== undefined ? subtotal : existingPreOrder.subtotal;
    existingPreOrder.totalDiscount = totalDiscount !== undefined ? totalDiscount : existingPreOrder.totalDiscount;
    existingPreOrder.totalTax = totalTax !== undefined ? totalTax : existingPreOrder.totalTax;
    existingPreOrder.packagingCharges = packagingCharges !== undefined ? packagingCharges : existingPreOrder.packagingCharges;
    existingPreOrder.transportCharges = transportCharges !== undefined ? transportCharges : existingPreOrder.transportCharges;
    existingPreOrder.otherCharges = otherCharges !== undefined ? otherCharges : existingPreOrder.otherCharges;
    existingPreOrder.adjustment = adjustment !== undefined ? adjustment : existingPreOrder.adjustment;
    existingPreOrder.grandTotal = grandTotal !== undefined ? grandTotal : existingPreOrder.grandTotal;
    existingPreOrder.notes = notes !== undefined ? notes : existingPreOrder.notes;
    existingPreOrder.termsConditions = termsConditions !== undefined ? termsConditions : existingPreOrder.termsConditions;
    existingPreOrder.status = status || existingPreOrder.status;
    if (bankDetails !== undefined) {
      existingPreOrder.bankDetails = bankDetails;
    }

    const updatedPreOrder = await existingPreOrder.save();
    res.json(updatedPreOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/pre-orders/:id
export const deletePreOrder = async (req, res) => {
  try {
    const existingPreOrder = await PreOrder.findById(req.params.id);
    if (!existingPreOrder) return res.status(404).json({ message: 'Pre-order not found' });
    if (req.user.companyId && existingPreOrder.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this pre-order' });
    }

    await existingPreOrder.deleteOne();
    res.json({ message: 'Pre-order deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
