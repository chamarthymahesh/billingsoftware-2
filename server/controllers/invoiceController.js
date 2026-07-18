import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';

// GET /api/invoices?companyId=xxx
const getInvoices = async (req, res) => {
  try {
    const { companyId } = req.query;
    if (!companyId) return res.status(400).json({ message: 'companyId required' });
    const invoices = await Invoice.find({ company: companyId }).sort({ invoiceDate: -1 });
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/invoices/next-number?companyId=xxx
const getNextInvoiceNumber = async (req, res) => {
  try {
    const { companyId } = req.query;
    const count = await Invoice.countDocuments({ company: companyId });
    const nextNum = `INV-${String(count + 1).padStart(4, '0')}`;
    res.json({ invoiceNumber: nextNum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/invoices/:id
const getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('items.product');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/invoices
const createInvoice = async (req, res) => {
  try {
    const {
      company, invoiceNumber, invoiceDate, paymentStatus, paymentMethod,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      commissionType, commissionValue, commissionAmount,
      grandTotal,
      notes, termsConditions,
    } = req.body;

    if (!company || !invoiceNumber || !customerName || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Reduce stock
    for (const item of items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -Number(item.qty) } });
      }
    }

    const pkg = Number(packagingCharges) || 0;
    const trp = Number(transportCharges) || 0;
    const oth = Number(otherCharges) || 0;
    const comm = Number(commissionAmount) || 0;
    const sub = Number(subtotal) || 0;
    const tax = Number(totalTax) || 0;
    // Recalculate grandTotal server-side to ensure accuracy
    const calculatedGrandTotal = sub + tax + pkg + trp + oth - comm;

    const invoice = await Invoice.create({
      company, invoiceNumber,
      invoiceDate: invoiceDate || new Date(),
      paymentStatus: paymentStatus || 'Pending',
      paymentMethod: paymentMethod || 'Cash',
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items,
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

    // Restore stock for deleted items
    for (const item of invoice.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: Number(item.qty) } });
      }
    }

    await Invoice.findByIdAndDelete(req.params.id);
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

    const {
      company, invoiceNumber, invoiceDate, paymentStatus, paymentMethod,
      customerName, customerPhone, customerGSTIN, customerState,
      billingAddress, shippingAddress, placeOfSupply,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      commissionType, commissionValue, commissionAmount,
      notes, termsConditions,
    } = req.body;

    // Restore old stock
    for (const item of existingInvoice.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: Number(item.qty) } });
      }
    }

    // Deduct new stock
    for (const item of items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -Number(item.qty) } });
      }
    }

    const pkg = Number(packagingCharges) || 0;
    const trp = Number(transportCharges) || 0;
    const oth = Number(otherCharges) || 0;
    const comm = Number(commissionAmount) || 0;
    const sub = Number(subtotal) || 0;
    const tax = Number(totalTax) || 0;
    const calculatedGrandTotal = sub + tax + pkg + trp + oth - comm;

    existingInvoice.company = company || existingInvoice.company;
    existingInvoice.invoiceNumber = invoiceNumber || existingInvoice.invoiceNumber;
    existingInvoice.invoiceDate = invoiceDate || existingInvoice.invoiceDate;
    existingInvoice.paymentStatus = paymentStatus || existingInvoice.paymentStatus;
    existingInvoice.paymentMethod = paymentMethod || existingInvoice.paymentMethod;
    existingInvoice.customerName = customerName || existingInvoice.customerName;
    existingInvoice.customerPhone = customerPhone || existingInvoice.customerPhone;
    existingInvoice.customerGSTIN = customerGSTIN || existingInvoice.customerGSTIN;
    existingInvoice.customerState = customerState || existingInvoice.customerState;
    existingInvoice.billingAddress = billingAddress || existingInvoice.billingAddress;
    existingInvoice.shippingAddress = shippingAddress || existingInvoice.shippingAddress;
    existingInvoice.placeOfSupply = placeOfSupply || existingInvoice.placeOfSupply;
    existingInvoice.items = items || existingInvoice.items;
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

    await Invoice.updateMany(
      { _id: { $in: invoiceIds } },
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

    await Invoice.updateMany(
      { _id: { $in: invoiceIds } },
      { $set: { commissionStatus: status } }
    );

    res.json({ message: 'Commission status updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export { getInvoices, getInvoice, createInvoice, getNextInvoiceNumber, updateInvoice, deleteInvoice, updateBulkStatus, updateBulkCommissionStatus };

