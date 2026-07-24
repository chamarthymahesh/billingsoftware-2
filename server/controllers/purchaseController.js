import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js";
import Company from "../models/Company.js";
import Invoice from "../models/Invoice.js";
import mongoose from "mongoose";
import { syncProductStock } from "../utils/stockSync.js";

// @desc    Create a new purchase bill
// @route   POST /api/purchases
// @access  Private
export const createPurchase = async (req, res) => {
  try {
    if (req.user.companyId) {
      req.body.targetCompany = req.user.companyId;
    }
    const {
      targetCompany,
      supplierName,
      supplierGSTIN,
      billNumber,
      purchaseDate,
      paymentStatus,
      items,
      packagingCharges,
      transportCharges,
      otherMiscCharges,
      itemsTotal,
      extraCharges,
      adjustment,
      grandTotal,
    } = req.body;

    // Optional: Validate calculations here to prevent tampering

    const purchase = new Purchase({
      targetCompany,
      supplierName,
      supplierGSTIN,
      billNumber,
      purchaseDate,
      paymentStatus,
      items,
      packagingCharges,
      transportCharges,
      otherMiscCharges,
      itemsTotal,
      extraCharges,
      adjustment: Number(adjustment) || 0,
      grandTotal: Math.round(grandTotal),
    });

    const savedPurchase = await purchase.save();

    // Update purchase price and sync stock for each item
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $set: { purchasePrice: item.rate },
      });
      await syncProductStock(item.product);
    }

    res.status(201).json(savedPurchase);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
export const getPurchases = async (req, res) => {
  try {
    const targetCompany = req.user.companyId || req.query.companyId;
    const filter = targetCompany ? { targetCompany } : {};

    const purchases = await Purchase.find(filter)
      .populate("targetCompany", "name gstin")
      .populate("items.product", "name category unit")
      .sort({ createdAt: -1 });

    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get distinct supplier names for auto-complete
// @route   GET /api/purchases/suppliers
// @access  Private
export const getSuppliers = async (req, res) => {
  try {
    const filter = req.user.companyId ? { targetCompany: req.user.companyId } : {};
    const suppliers = await Purchase.distinct("supplierName", filter);
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a purchase bill
// @route   PUT /api/purchases/:id
// @access  Private
export const updatePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });
    if (req.user.companyId && purchase.targetCompany.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const {
      supplierName,
      supplierGSTIN,
      billNumber,
      purchaseDate,
      paymentStatus,
      items,
      packagingCharges,
      transportCharges,
      otherMiscCharges,
      itemsTotal,
      extraCharges,
      adjustment,
      grandTotal,
    } = req.body;

    // Keep track of old product IDs to sync them later
    const oldProductIds = purchase.items.map(item => item.product.toString());

    // Apply new purchase prices
    for (const newItem of items) {
      await Product.findByIdAndUpdate(newItem.product, {
        $set: { purchasePrice: newItem.rate },
      });
    }

    // Update the purchase
    purchase.supplierName = supplierName;
    purchase.supplierGSTIN = supplierGSTIN;
    purchase.billNumber = billNumber;
    purchase.purchaseDate = purchaseDate;
    purchase.paymentStatus = paymentStatus;
    purchase.items = items;
    purchase.packagingCharges = packagingCharges;
    purchase.transportCharges = transportCharges;
    purchase.otherMiscCharges = otherMiscCharges;
    purchase.itemsTotal = itemsTotal;
    purchase.extraCharges = extraCharges;
    purchase.adjustment = Number(adjustment) || 0;
    purchase.grandTotal = Math.round(grandTotal);

    const updated = await purchase.save();

    // Recalculate and sync stock for all products involved
    const productIdsToSync = new Set([
      ...oldProductIds,
      ...items.map(item => item.product.toString())
    ]);

    for (const pId of productIdsToSync) {
      await syncProductStock(pId);
    }

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a purchase bill
// @route   DELETE /api/purchases/:id
// @access  Private
export const deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });
    if (req.user.companyId && purchase.targetCompany.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const productIds = purchase.items.map(item => item.product.toString());

    await Purchase.findByIdAndDelete(req.params.id);

    // Sync stock for all products involved
    for (const pId of productIds) {
      await syncProductStock(pId);
    }

    res.json({ message: "Purchase deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payment status of a purchase
// @route   PATCH /api/purchases/:id/status
// @access  Private
export const updatePurchaseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status required" });
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: "Purchase not found" });
    if (req.user.companyId && purchase.targetCompany.toString() !== req.user.companyId.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    purchase.paymentStatus = status;
    await purchase.save();

    const populatedPurchase = await Purchase.findById(purchase._id).populate("targetCompany", "name");
    res.json(populatedPurchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/purchases/transfer
// @access  Private
export const transferStock = async (req, res) => {
  console.log("=== STOCK TRANSFER START ===");
  try {
    const { productId, sourceCompanyId, targetCompanyId, qty } = req.body;
    const transferQty = Number(qty);
    console.log("Request Body:", { productId, sourceCompanyId, targetCompanyId, qty, transferQty });

    if (!productId || !sourceCompanyId || !targetCompanyId || !transferQty || transferQty <= 0) {
      console.log("Validation failed: Invalid transfer details");
      return res.status(400).json({ message: "Invalid transfer details" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      console.log("Error: Product not found for ID", productId);
      return res.status(404).json({ message: "Product not found" });
    }

    // Dynamic stock calculation for source company
    const [allInvoices, allPurchases] = await Promise.all([
      Invoice.find({ company: sourceCompanyId }).lean(),
      Purchase.find({ targetCompany: sourceCompanyId }).lean(),
    ]);

    let totalPurchased = 0;
    allPurchases.forEach(p => {
      p.items?.forEach(item => {
        if (item.product?.toString() === productId) {
          totalPurchased += Number(item.qty) || 0;
        }
      });
    });

    let totalSold = 0;
    allInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        if (item.product?.toString() === productId) {
          totalSold += Number(item.qty) || 0;
        }
      });
    });

    const sourceStock = totalPurchased - totalSold;
    console.log("Source Company Stock:", sourceStock);

    if (sourceStock < transferQty) {
      console.log("Error: Insufficient stock. Available in source:", sourceStock, "Requested:", transferQty);
      return res.status(400).json({ message: "Insufficient stock in source company" });
    }

    // Fetch the target and source companies
    const [sourceCompanyObj, targetCompanyObj] = await Promise.all([
      Company.findById(sourceCompanyId),
      Company.findById(targetCompanyId),
    ]);

    if (!sourceCompanyObj) {
      return res.status(404).json({ message: "Source company not found" });
    }
    if (!targetCompanyObj) {
      return res.status(404).json({ message: "Target company not found" });
    }

    const rate = product.purchasePrice || 0;
    const taxableAmount = rate * transferQty;
    const taxAmount = taxableAmount * (product.gstRate / 100);
    const total = taxableAmount + taxAmount;
    console.log("Calculated rates:", { rate, taxableAmount, taxAmount, total });

    // Create a Sales Invoice in the source company
    console.log("Creating Sales Invoice for source company:", sourceCompanyId);
    const salesInvoice = new Invoice({
      company: sourceCompanyId,
      invoiceNumber: `TRF-OUT-${Date.now()}`,
      invoiceDate: new Date(),
      paymentStatus: "Paid",
      paymentMethod: "Cash",
      customerName: targetCompanyObj.name,
      customerGSTIN: targetCompanyObj.gstin || "",
      customerPhone: targetCompanyObj.phone || "",
      billingAddress: targetCompanyObj.address || "",
      subtotal: taxableAmount,
      totalTax: taxAmount,
      grandTotal: Math.round(total),
      materialDeliveryStatus: "Delivered",
      items: [
        {
          product: product._id,
          productName: product.name,
          qty: transferQty,
          rate: rate,
          gstRate: product.gstRate,
          taxableAmount: taxableAmount,
          taxAmount: taxAmount,
          total: total,
        }
      ]
    });
    console.log("Saving Sales Invoice...");
    const savedSalesInvoice = await salesInvoice.save();
    console.log("Sales Invoice saved successfully. ID:", savedSalesInvoice._id);

    // Create a Purchase Invoice in the target company
    console.log("Creating Purchase Invoice for target company:", targetCompanyId);
    const purchase = new Purchase({
      targetCompany: targetCompanyId,
      supplierName: sourceCompanyObj.name,
      supplierGSTIN: sourceCompanyObj.gstin || "",
      billNumber: `TRF-IN-${Date.now()}`,
      purchaseDate: new Date(),
      paymentStatus: "Paid",
      itemsTotal: total,
      extraCharges: 0,
      grandTotal: Math.round(total),
      items: [
        {
          product: product._id,
          productName: product.name,
          qty: transferQty,
          rate: rate,
          gstRate: product.gstRate,
          taxAmount: taxAmount,
          total: total,
        },
      ],
    });
    console.log("Saving Purchase Invoice...");
    const savedPurchase = await purchase.save();
    console.log("Purchase Invoice saved successfully. ID:", savedPurchase._id);

    await syncProductStock(product._id);

    console.log("=== STOCK TRANSFER SUCCESSFUL ===");
    res.status(201).json({ message: "Transfer successful", purchase: savedPurchase, targetProduct: product });
  } catch (error) {
    console.error("=== STOCK TRANSFER ERROR ===");
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
