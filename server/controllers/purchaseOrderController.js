import PurchaseOrder from '../models/PurchaseOrder.js';
import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import { syncProductStock } from '../utils/stockSync.js';
import { getStateWithCode } from '../utils/stateHelper.js';

// GET /api/purchase-orders?companyId=xxx
export const getPurchaseOrders = async (req, res) => {
  try {
    const company = req.user?.companyId || req.query.companyId;
    let filter = {};
    if (company && company !== 'ALL') {
      filter.company = company;
    }
    const { startDate, endDate, month } = req.query;
    if (startDate || endDate) {
      filter.poDate = {};
      if (startDate) filter.poDate.$gte = new Date(startDate);
      if (endDate) filter.poDate.$lte = new Date(endDate + 'T23:59:59.999Z');
    } else if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const start = new Date(Date.UTC(year, m, 1, 0, 0, 0));
      const end = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999));
      filter.poDate = { $gte: start, $lte: end };
    }
    const orders = await PurchaseOrder.find(filter).populate('company').sort({ poDate: -1, createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/purchase-orders/next-number?companyId=xxx
export const getNextPONumber = async (req, res) => {
  try {
    const company = req.user.companyId || req.query.companyId;
    if (!company) return res.status(400).json({ message: 'companyId required' });
    const count = await PurchaseOrder.countDocuments({ company });
    const nextNum = `PO-${String(count + 1).padStart(4, '0')}`;
    res.json({ poNumber: nextNum });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/purchase-orders/:id
export const getPurchaseOrder = async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id).populate('company').populate('items.product');
    if (!order) return res.status(404).json({ message: 'Purchase Order not found' });
    if (req.user.companyId && order.company._id.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this purchase order' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/purchase-orders
export const createPurchaseOrder = async (req, res) => {
  try {
    if (req.user.companyId) {
      req.body.company = req.user.companyId;
    }
    if (req.body.supplierState !== undefined) {
      req.body.supplierState = getStateWithCode(req.body.supplierState, req.body.supplierGSTIN);
    }
    const {
      company, poNumber, poDate, expectedDeliveryDate,
      supplierName, supplierPhone, supplierGSTIN, supplierState,
      billingAddress, shippingAddress,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions, status
    } = req.body;

    if (!company || !poNumber || !supplierName || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Purchase orders DO NOT affect stock
    const purchaseOrder = new PurchaseOrder({
      company, poNumber, poDate: poDate || new Date(), expectedDeliveryDate,
      supplierName, supplierPhone, supplierGSTIN, supplierState,
      billingAddress, shippingAddress,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions,
      status: status || 'Issued'
    });

    const savedPO = await purchaseOrder.save();
    res.status(201).json(savedPO);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/purchase-orders/:id
export const updatePurchaseOrder = async (req, res) => {
  try {
    const existingPO = await PurchaseOrder.findById(req.params.id);
    if (!existingPO) return res.status(404).json({ message: 'Purchase Order not found' });
    if (req.user.companyId && existingPO.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify this purchase order' });
    }

    if (req.body.supplierState !== undefined) {
      req.body.supplierState = getStateWithCode(req.body.supplierState, req.body.supplierGSTIN);
    }

    const {
      poNumber, poDate, expectedDeliveryDate,
      supplierName, supplierPhone, supplierGSTIN, supplierState,
      billingAddress, shippingAddress,
      items, subtotal, totalDiscount, totalTax,
      packagingCharges, transportCharges, otherCharges,
      adjustment, grandTotal, notes, termsConditions, status
    } = req.body;

    existingPO.poNumber = poNumber || existingPO.poNumber;
    existingPO.poDate = poDate || existingPO.poDate;
    existingPO.expectedDeliveryDate = expectedDeliveryDate !== undefined ? expectedDeliveryDate : existingPO.expectedDeliveryDate;
    existingPO.supplierName = supplierName || existingPO.supplierName;
    existingPO.supplierPhone = supplierPhone !== undefined ? supplierPhone : existingPO.supplierPhone;
    existingPO.supplierGSTIN = supplierGSTIN !== undefined ? supplierGSTIN : existingPO.supplierGSTIN;
    existingPO.supplierState = supplierState !== undefined ? supplierState : existingPO.supplierState;
    existingPO.billingAddress = billingAddress !== undefined ? billingAddress : existingPO.billingAddress;
    existingPO.shippingAddress = shippingAddress !== undefined ? shippingAddress : existingPO.shippingAddress;
    existingPO.items = items || existingPO.items;
    existingPO.subtotal = subtotal !== undefined ? subtotal : existingPO.subtotal;
    existingPO.totalDiscount = totalDiscount !== undefined ? totalDiscount : existingPO.totalDiscount;
    existingPO.totalTax = totalTax !== undefined ? totalTax : existingPO.totalTax;
    existingPO.packagingCharges = packagingCharges !== undefined ? packagingCharges : existingPO.packagingCharges;
    existingPO.transportCharges = transportCharges !== undefined ? transportCharges : existingPO.transportCharges;
    existingPO.otherCharges = otherCharges !== undefined ? otherCharges : existingPO.otherCharges;
    existingPO.adjustment = adjustment !== undefined ? adjustment : existingPO.adjustment;
    existingPO.grandTotal = grandTotal !== undefined ? grandTotal : existingPO.grandTotal;
    existingPO.notes = notes !== undefined ? notes : existingPO.notes;
    existingPO.termsConditions = termsConditions !== undefined ? termsConditions : existingPO.termsConditions;
    existingPO.status = status || existingPO.status;

    // Purchase orders DO NOT affect stock
    const updatedPO = await existingPO.save();
    res.json(updatedPO);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/purchase-orders/:id/status
export const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });
    const order = await PurchaseOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Purchase Order not found' });
    if (req.user.companyId && order.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/purchase-orders/:id
export const deletePurchaseOrder = async (req, res) => {
  try {
    const existingPO = await PurchaseOrder.findById(req.params.id);
    if (!existingPO) return res.status(404).json({ message: 'Purchase Order not found' });
    if (req.user.companyId && existingPO.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this purchase order' });
    }

    // Deleting PO does NOT affect stock
    await existingPO.deleteOne();
    res.json({ message: 'Purchase Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/purchase-orders/:id/convert
export const convertPurchaseOrder = async (req, res) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ message: 'Purchase Order not found' });
    if (req.user.companyId && po.company.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { billNumber, purchaseDate, paymentStatus } = req.body;

    const purchaseItems = po.items.map(item => ({
      product: item.product,
      qty: item.qty,
      rate: item.rate,
      gstRate: item.gstRate || 0,
      isInclusive: item.isInclusive || false,
      total: item.total
    }));

    const itemsTotal = po.subtotal || po.items.reduce((sum, i) => sum + (i.total || 0), 0);
    const extraCharges = (po.packagingCharges || 0) + (po.transportCharges || 0) + (po.otherCharges || 0);

    const purchase = new Purchase({
      targetCompany: po.company,
      supplierName: po.supplierName,
      supplierGSTIN: po.supplierGSTIN || '',
      billNumber: billNumber || `INV-PO-${po.poNumber}`,
      purchaseDate: purchaseDate || new Date(),
      paymentStatus: paymentStatus || 'Pending',
      items: purchaseItems,
      packagingCharges: po.packagingCharges || 0,
      transportCharges: po.transportCharges || 0,
      otherMiscCharges: po.otherCharges || 0,
      itemsTotal,
      extraCharges,
      adjustment: po.adjustment || 0,
      grandTotal: Math.round(po.grandTotal)
    });

    const savedPurchase = await purchase.save();

    // Mark PO as Converted
    po.status = 'Converted';
    await po.save();

    // Updating Purchase DOES update stock and product purchasePrice
    for (const item of purchaseItems) {
      await Product.findByIdAndUpdate(item.product, {
        $set: { purchasePrice: item.rate }
      });
      await syncProductStock(item.product);
    }

    res.status(201).json({ message: 'Converted to Purchase Invoice successfully', purchase: savedPurchase, po });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
