import Quotation from '../models/Quotation.js';
import { getStateWithCode } from '../utils/stateHelper.js';

// GET /api/quotations?companyId=xxx
export const getQuotations = async (req, res) => {
  try {
    const company = req.user?.companyId || req.query.companyId;
    let filter = {};
    if (company && company !== 'ALL') {
      filter.company = company;
    }
    const { startDate, endDate, month } = req.query;
    if (startDate || endDate) {
      filter.quotationDate = {};
      if (startDate) filter.quotationDate.$gte = new Date(startDate);
      if (endDate) filter.quotationDate.$lte = new Date(endDate + 'T23:59:59.999Z');
    } else if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const start = new Date(Date.UTC(year, m, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999));
      filter.quotationDate = { $gte: start, $lte: end };
    }
    const quotations = await Quotation.find(filter).populate('company').sort({ quotationDate: -1 });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/quotations/next-number?companyId=xxx
export const getNextQuotationNumber = async (req, res) => {
  try {
    const company = req.user.companyId || req.query.companyId;
    if (!company) return res.status(400).json({ message: 'companyId required' });
    const count = await Quotation.countDocuments({ company });
    const nextNum = `QTN-${String(count + 1).padStart(4, '0')}`;
    res.json({ quotationNumber: nextNum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/quotations/:id
export const getQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id).populate('company').populate('items.product');
    if (!quotation) return res.status(404).json({ message: 'Quotation not found' });
    if (req.user.companyId && quotation.company._id.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this quotation' });
    }
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/quotations
export const createQuotation = async (req, res) => {
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
      company, quotationNumber, quotationDate,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions,
      isExpectedOrder, status, bankDetails
    } = req.body;

    if (!company || !quotationNumber || !customerName || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const quotation = new Quotation({
      company, quotationNumber, quotationDate,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions,
      isExpectedOrder, status, bankDetails: bankDetails || null
    });

    const savedQuotation = await quotation.save();
    res.status(201).json(savedQuotation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/quotations/:id
export const updateQuotation = async (req, res) => {
  try {
    const existingQuotation = await Quotation.findById(req.params.id);
    if (!existingQuotation) return res.status(404).json({ message: 'Quotation not found' });
    if (req.user.companyId && existingQuotation.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this quotation' });
    }

    if (req.body.customerState !== undefined) {
      req.body.customerState = getStateWithCode(req.body.customerState, req.body.customerGSTIN);
    }
    if (req.body.placeOfSupply !== undefined) {
      req.body.placeOfSupply = getStateWithCode(req.body.placeOfSupply, req.body.customerGSTIN);
    }

    const {
      quotationNumber, quotationDate,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions,
      isExpectedOrder, status, bankDetails
    } = req.body;

    existingQuotation.quotationNumber = quotationNumber || existingQuotation.quotationNumber;
    existingQuotation.quotationDate = quotationDate || existingQuotation.quotationDate;
    existingQuotation.customerName = customerName || existingQuotation.customerName;
    existingQuotation.customerPhone = customerPhone !== undefined ? customerPhone : existingQuotation.customerPhone;
    existingQuotation.customerGSTIN = customerGSTIN !== undefined ? customerGSTIN : existingQuotation.customerGSTIN;
    existingQuotation.customerState = customerState !== undefined ? customerState : existingQuotation.customerState;
    existingQuotation.billingAddress = billingAddress !== undefined ? billingAddress : existingQuotation.billingAddress;
    existingQuotation.shippingAddress = shippingAddress !== undefined ? shippingAddress : existingQuotation.shippingAddress;
    existingQuotation.placeOfSupply = placeOfSupply !== undefined ? placeOfSupply : existingQuotation.placeOfSupply;
    existingQuotation.items = items || existingQuotation.items;
    existingQuotation.subtotal = subtotal !== undefined ? subtotal : existingQuotation.subtotal;
    existingQuotation.totalDiscount = totalDiscount !== undefined ? totalDiscount : existingQuotation.totalDiscount;
    existingQuotation.totalTax = totalTax !== undefined ? totalTax : existingQuotation.totalTax;
    existingQuotation.packagingCharges = packagingCharges !== undefined ? packagingCharges : existingQuotation.packagingCharges;
    existingQuotation.transportCharges = transportCharges !== undefined ? transportCharges : existingQuotation.transportCharges;
    existingQuotation.otherCharges = otherCharges !== undefined ? otherCharges : existingQuotation.otherCharges;
    existingQuotation.adjustment = adjustment !== undefined ? adjustment : existingQuotation.adjustment;
    existingQuotation.grandTotal = grandTotal !== undefined ? grandTotal : existingQuotation.grandTotal;
    existingQuotation.notes = notes !== undefined ? notes : existingQuotation.notes;
    existingQuotation.termsConditions = termsConditions !== undefined ? termsConditions : existingQuotation.termsConditions;
    existingQuotation.isExpectedOrder = isExpectedOrder !== undefined ? isExpectedOrder : existingQuotation.isExpectedOrder;
    existingQuotation.status = status || existingQuotation.status;
    if (bankDetails !== undefined) {
      existingQuotation.bankDetails = bankDetails;
    }

    const updatedQuotation = await existingQuotation.save();
    res.json(updatedQuotation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/quotations/:id
export const deleteQuotation = async (req, res) => {
  try {
    const existingQuotation = await Quotation.findById(req.params.id);
    if (!existingQuotation) return res.status(404).json({ message: 'Quotation not found' });
    if (req.user.companyId && existingQuotation.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this quotation' });
    }

    await existingQuotation.deleteOne();
    res.json({ message: 'Quotation deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
