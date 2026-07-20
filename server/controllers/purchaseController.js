import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js";
import Company from "../models/Company.js";
import Invoice from "../models/Invoice.js";
import mongoose from "mongoose";

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
      grandTotal,
    });

    const savedPurchase = await purchase.save();

    // Increment product stock and update purchase price for each item in the purchase
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: item.qty },
        $set: { purchasePrice: item.rate },
      });
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
      .populate("targetCompany", "name")
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
      grandTotal,
    } = req.body;

    // Reverse old stock increments
    for (const oldItem of purchase.items) {
      await Product.findByIdAndUpdate(oldItem.product, { $inc: { stock: -oldItem.qty } });
    }

    // Apply new stock increments
    for (const newItem of items) {
      await Product.findByIdAndUpdate(newItem.product, {
        $inc: { stock: newItem.qty },
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
    purchase.grandTotal = grandTotal;

    const updated = await purchase.save();
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

    // Reverse stock increments
    for (const item of purchase.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
    }

    await Purchase.findByIdAndDelete(req.params.id);
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
      grandTotal: total,
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
      grandTotal: total,
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

    // Update global product stock in db (it increments via purchase, decrements via sales: net 0 change, but let's make sure it matches database state)
    // There is no net change to Product.stock since it is both sold by source and purchased by target, but let's save product.
    product.stock = (product.stock || 0); // no-op but keeps model clean
    await product.save();

    console.log("=== STOCK TRANSFER SUCCESSFUL ===");
    res.status(201).json({ message: "Transfer successful", purchase: savedPurchase, targetProduct: product });
  } catch (error) {
    console.error("=== STOCK TRANSFER ERROR ===");
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};
