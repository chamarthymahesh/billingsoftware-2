import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import { getStateWithCode } from '../utils/stateHelper.js';
import { syncProductStock } from '../utils/stockSync.js';

// GET /api/invoices?companyId=xxx
const getInvoices = async (req, res) => {
  try {
    const company = req.user.companyId || req.query.companyId;
    if (!company) return res.status(400).json({ message: 'companyId required' });
    const invoices = await Invoice.find({ company }).sort({ invoiceDate: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/invoices/next-number?companyId=xxx
const getNextInvoiceNumber = async (req, res) => {
  try {
    const company = req.user.companyId || req.query.companyId;
    if (!company) return res.status(400).json({ message: 'companyId required' });
    const count = await Invoice.countDocuments({ company });
    const nextNum = `INV-${String(count + 1).padStart(4, '0')}`;
    res.json({ invoiceNumber: nextNum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/invoices/:id
const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('company').populate('items.product');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (req.user.companyId && invoice.company._id.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this invoice' });
    }
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/invoices
const createInvoice = async (req, res) => {
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
      company, invoiceNumber, invoiceDate, gemContractNumber, paymentStatus, paymentMethod,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      commissionType, commissionValue, commissionAmount,
      grandTotal,
      notes, termsConditions,
    } = req.body;

    console.log("createInvoice incoming body:", req.body);
    if (!company || !invoiceNumber || !customerName || !items || items.length === 0) {
      console.log("Validation failed details:", {
        company: !company,
        invoiceNumber: !invoiceNumber,
        customerName: !customerName,
        items: !items,
        itemsLength: items?.length
      });
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const pkg = Number(Number(packagingCharges || 0).toFixed(2));
    const trp = Number(Number(transportCharges || 0).toFixed(2));
    const oth = Number(Number(otherCharges || 0).toFixed(2));
    const comm = Number(Number(commissionAmount || 0).toFixed(2));
    const sub = Number(Number(subtotal || 0).toFixed(2));
    const tax = Number(Number(totalTax || 0).toFixed(2));
    const calculatedGrandTotal = Number((sub + tax + pkg + trp + oth - comm).toFixed(2));

    const roundedItems = (items || []).map(item => ({
      ...item,
      qty: Number(item.qty) || 0,
      rate: Number(Number(item.rate || 0).toFixed(2)),
      discount: Number(Number(item.discount || 0).toFixed(2)),
      gstRate: Number(Number(item.gstRate || 0).toFixed(2)),
      taxableAmount: Number(Number(item.taxableAmount || 0).toFixed(2)),
      taxAmount: Number(Number(item.taxAmount || 0).toFixed(2)),
      total: Number(Number(item.total || 0).toFixed(2))
    }));

    const invoice = await Invoice.create({
      company, invoiceNumber, gemContractNumber,
      invoiceDate: invoiceDate || new Date(),
      paymentStatus: paymentStatus || 'Pending',
      paymentMethod: paymentMethod || 'Cash',
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items: roundedItems,
      subtotal: sub,
      totalDiscount: Number(totalDiscount) || 0,
      totalTax: tax,
      packagingCharges: pkg,
      transportCharges: trp,
      otherCharges: oth,
      commissionType: commissionType || 'None',
      commissionValue: Number(commissionValue) || 0,
      commissionAmount: comm,
      grandTotal: calculatedGrandTotal,
      notes: notes || '',
      termsConditions: termsConditions || '',
    });

    // Recalculate and sync stock for all products involved
    for (const item of roundedItems) {
      if (item.product) {
        await syncProductStock(item.product);
      }
    }

    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/invoices/:id
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    if (req.user.companyId && invoice.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this invoice' });
    }

    const productIds = (invoice.items || [])
      .map(item => item.product ? item.product.toString() : null)
      .filter(Boolean);

    await Invoice.findByIdAndDelete(req.params.id);

    // Sync stock for all products involved
    for (const pId of productIds) {
      await syncProductStock(pId);
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/invoices/:id
const updateInvoice = async (req, res) => {
  try {
    const existingInvoice = await Invoice.findById(req.params.id);
    if (!existingInvoice) return res.status(404).json({ message: 'Invoice not found' });
    if (req.user.companyId && existingInvoice.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this invoice' });
    }
    if (req.body.customerState !== undefined) {
      req.body.customerState = getStateWithCode(req.body.customerState, req.body.customerGSTIN);
    }
    if (req.body.placeOfSupply !== undefined) {
      req.body.placeOfSupply = getStateWithCode(req.body.placeOfSupply, req.body.customerGSTIN);
    }

    const {
      company, invoiceNumber, invoiceDate, gemContractNumber, paymentStatus, paymentMethod,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      commissionType, commissionValue, commissionAmount,
      notes, termsConditions,
    } = req.body;

    // Keep track of old product IDs to sync them later
    const oldProductIds = (existingInvoice.items || [])
      .map(item => item.product ? item.product.toString() : null)
      .filter(Boolean);

    const pkg = Number(Number(packagingCharges || 0).toFixed(2));
    const trp = Number(Number(transportCharges || 0).toFixed(2));
    const oth = Number(Number(otherCharges || 0).toFixed(2));
    const comm = Number(Number(commissionAmount || 0).toFixed(2));
    const sub = Number(Number(subtotal || 0).toFixed(2));
    const tax = Number(Number(totalTax || 0).toFixed(2));
    const calculatedGrandTotal = Number((sub + tax + pkg + trp + oth - comm).toFixed(2));

    const roundedItems = (items || []).map(item => ({
      ...item,
      qty: Number(item.qty) || 0,
      rate: Number(Number(item.rate || 0).toFixed(2)),
      discount: Number(Number(item.discount || 0).toFixed(2)),
      gstRate: Number(Number(item.gstRate || 0).toFixed(2)),
      taxableAmount: Number(Number(item.taxableAmount || 0).toFixed(2)),
      taxAmount: Number(Number(item.taxAmount || 0).toFixed(2)),
      total: Number(Number(item.total || 0).toFixed(2))
    }));

    existingInvoice.company = req.user.companyId || company || existingInvoice.company;
    existingInvoice.invoiceNumber = invoiceNumber || existingInvoice.invoiceNumber;
    existingInvoice.invoiceDate = invoiceDate || existingInvoice.invoiceDate;
    existingInvoice.gemContractNumber = gemContractNumber !== undefined ? gemContractNumber : existingInvoice.gemContractNumber;
    existingInvoice.paymentStatus = paymentStatus || existingInvoice.paymentStatus;
    existingInvoice.paymentMethod = paymentMethod || existingInvoice.paymentMethod;
    existingInvoice.customerName = customerName || existingInvoice.customerName;
    existingInvoice.customerPhone = customerPhone || existingInvoice.customerPhone;
    existingInvoice.customerGSTIN = customerGSTIN || existingInvoice.customerGSTIN;
    existingInvoice.customerState = customerState || existingInvoice.customerState;
    existingInvoice.billingAddress = billingAddress || existingInvoice.billingAddress;
    existingInvoice.shippingAddress = shippingAddress || existingInvoice.shippingAddress;
    existingInvoice.placeOfSupply = placeOfSupply || existingInvoice.placeOfSupply;
    existingInvoice.items = roundedItems;
    existingInvoice.subtotal = sub;
    existingInvoice.totalDiscount = Number(totalDiscount) || 0;
    existingInvoice.totalTax = tax;
    existingInvoice.packagingCharges = pkg;
    existingInvoice.transportCharges = trp;
    existingInvoice.otherCharges = oth;
    existingInvoice.commissionType = commissionType || existingInvoice.commissionType;
    existingInvoice.commissionValue = Number(commissionValue) || 0;
    existingInvoice.commissionAmount = comm;
    existingInvoice.grandTotal = calculatedGrandTotal;
    existingInvoice.notes = notes || existingInvoice.notes;
    existingInvoice.termsConditions = termsConditions || existingInvoice.termsConditions;

    const updatedInvoice = await existingInvoice.save();

    // Recalculate and sync stock for all products involved (old and new)
    const productIdsToSync = new Set([
      ...oldProductIds,
      ...(items || []).map(item => item.product ? item.product.toString() : null).filter(Boolean)
    ]);

    for (const pId of productIdsToSync) {
      await syncProductStock(pId);
    }

    res.json(updatedInvoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/invoices/bulk-status
const updateBulkStatus = async (req, res) => {
  try {
    const { invoiceIds, status } = req.body;
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({ message: 'No invoices selected' });
    }
    if (!['Paid', 'Pending', 'Partial'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const filter = { _id: { $in: invoiceIds } };
    if (req.user.companyId) {
      filter.company = req.user.companyId;
    }

    await Invoice.updateMany(
      filter,
      { $set: { paymentStatus: status } }
    );

    res.json({ message: 'Invoices updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/invoices/bulk-commission-status
const updateBulkCommissionStatus = async (req, res) => {
  try {
    const { invoiceIds, status } = req.body;
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return res.status(400).json({ message: 'No invoices selected' });
    }
    if (!['Paid', 'Pending', 'Partial'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const filter = { _id: { $in: invoiceIds } };
    if (req.user.companyId) {
      filter.company = req.user.companyId;
    }

    await Invoice.updateMany(
      filter,
      { $set: { commissionStatus: status } }
    );

    res.json({ message: 'Commission status updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { getInvoices, getInvoice, createInvoice, getNextInvoiceNumber, updateInvoice, deleteInvoice, updateBulkStatus, updateBulkCommissionStatus };

