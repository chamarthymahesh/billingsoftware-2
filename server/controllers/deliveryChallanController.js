import DeliveryChallan from '../models/DeliveryChallan.js';
import { getStateWithCode } from '../utils/stateHelper.js';

// GET /api/delivery-challans?companyId=xxx
export const getDeliveryChallans = async (req, res) => {
  try {
    const company = req.user?.companyId || req.query.companyId;
    let filter = {};
    if (company && company !== 'ALL') {
      filter.company = company;
    }
    const { startDate, endDate, month } = req.query;
    if (startDate || endDate) {
      filter.challanDate = {};
      if (startDate) filter.challanDate.$gte = new Date(startDate);
      if (endDate) filter.challanDate.$lte = new Date(endDate + 'T23:59:59.999Z');
    } else if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const start = new Date(Date.UTC(year, m, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999));
      filter.challanDate = { $gte: start, $lte: end };
    }
    const challans = await DeliveryChallan.find(filter).populate('company').sort({ challanDate: -1 });
    res.json(challans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/delivery-challans/next-number?companyId=xxx
export const getNextChallanNumber = async (req, res) => {
  try {
    const company = req.user.companyId || req.query.companyId;
    if (!company) return res.status(400).json({ message: 'companyId required' });
    const count = await DeliveryChallan.countDocuments({ company });
    const nextNum = `DC-${String(count + 1).padStart(4, '0')}`;
    res.json({ challanNumber: nextNum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/delivery-challans/:id
export const getDeliveryChallan = async (req, res) => {
  try {
    const challan = await DeliveryChallan.findById(req.params.id)
      .populate('company')
      .populate('items.product')
      .populate('convertedFromInvoice');
    if (!challan) return res.status(404).json({ message: 'Delivery Challan not found' });
    if (req.user.companyId && challan.company._id.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this challan' });
    }
    res.json(challan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/delivery-challans
export const createDeliveryChallan = async (req, res) => {
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
      company, challanNumber, challanDate,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions,
      convertedFromInvoice
    } = req.body;

    if (!company || !challanNumber || !customerName || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const challan = new DeliveryChallan({
      company, challanNumber, challanDate,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions,
      convertedFromInvoice
    });

    const savedChallan = await challan.save();
    res.status(201).json(savedChallan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/delivery-challans/:id
export const updateDeliveryChallan = async (req, res) => {
  try {
    const existingChallan = await DeliveryChallan.findById(req.params.id);
    if (!existingChallan) return res.status(404).json({ message: 'Delivery Challan not found' });
    if (req.user.companyId && existingChallan.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this challan' });
    }

    if (req.body.customerState !== undefined) {
      req.body.customerState = getStateWithCode(req.body.customerState, req.body.customerGSTIN);
    }
    if (req.body.placeOfSupply !== undefined) {
      req.body.placeOfSupply = getStateWithCode(req.body.placeOfSupply, req.body.customerGSTIN);
    }

    const {
      challanNumber, challanDate,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions,
      convertedFromInvoice
    } = req.body;

    existingChallan.challanNumber = challanNumber || existingChallan.challanNumber;
    existingChallan.challanDate = challanDate || existingChallan.challanDate;
    existingChallan.customerName = customerName || existingChallan.customerName;
    existingChallan.customerPhone = customerPhone !== undefined ? customerPhone : existingChallan.customerPhone;
    existingChallan.customerGSTIN = customerGSTIN !== undefined ? customerGSTIN : existingChallan.customerGSTIN;
    existingChallan.customerState = customerState !== undefined ? customerState : existingChallan.customerState;
    existingChallan.billingAddress = billingAddress !== undefined ? billingAddress : existingChallan.billingAddress;
    existingChallan.shippingAddress = shippingAddress !== undefined ? shippingAddress : existingChallan.shippingAddress;
    existingChallan.placeOfSupply = placeOfSupply !== undefined ? placeOfSupply : existingChallan.placeOfSupply;
    existingChallan.items = items || existingChallan.items;
    existingChallan.subtotal = subtotal !== undefined ? subtotal : existingChallan.subtotal;
    existingChallan.totalDiscount = totalDiscount !== undefined ? totalDiscount : existingChallan.totalDiscount;
    existingChallan.totalTax = totalTax !== undefined ? totalTax : existingChallan.totalTax;
    existingChallan.packagingCharges = packagingCharges !== undefined ? packagingCharges : existingChallan.packagingCharges;
    existingChallan.transportCharges = transportCharges !== undefined ? transportCharges : existingChallan.transportCharges;
    existingChallan.otherCharges = otherCharges !== undefined ? otherCharges : existingChallan.otherCharges;
    existingChallan.adjustment = adjustment !== undefined ? adjustment : existingChallan.adjustment;
    existingChallan.grandTotal = grandTotal !== undefined ? grandTotal : existingChallan.grandTotal;
    existingChallan.notes = notes !== undefined ? notes : existingChallan.notes;
    existingChallan.termsConditions = termsConditions !== undefined ? termsConditions : existingChallan.termsConditions;
    existingChallan.convertedFromInvoice = convertedFromInvoice !== undefined ? convertedFromInvoice : existingChallan.convertedFromInvoice;

    const updatedChallan = await existingChallan.save();
    res.json(updatedChallan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/delivery-challans/:id
export const deleteDeliveryChallan = async (req, res) => {
  try {
    const existingChallan = await DeliveryChallan.findById(req.params.id);
    if (!existingChallan) return res.status(404).json({ message: 'Delivery Challan not found' });
    if (req.user.companyId && existingChallan.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this challan' });
    }

    await existingChallan.deleteOne();
    res.json({ message: 'Delivery Challan deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
