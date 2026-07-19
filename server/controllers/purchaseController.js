import Purchase from "../models/Purchase.js";
import Product from "../models/Product.js";
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
  try {
    const { sourceProductId, targetCompanyId, qty } = req.body;
    const transferQty = Number(qty);

    if (!sourceProductId || !targetCompanyId || !transferQty || transferQty <= 0) {
      return res.status(400).json({ message: "Invalid transfer details" });
    }

    const sourceProduct = await Product.findById(sourceProductId).populate("companyId");
    if (!sourceProduct) return res.status(404).json({ message: "Source product not found" });



    if (sourceProduct.stock < transferQty) {
      return res.status(400).json({ message: "Insufficient stock in source company" });
    }

    // Find the product globally
    let targetProduct = await Product.findOne({
      name: new RegExp(`^${sourceProduct.name}$`, "i"),
    }).collation({ locale: "en", strength: 2 });

    if (!targetProduct) {
      targetProduct = await Product.create({
        companyId: targetCompanyId,
        name: sourceProduct.name,
        brand: sourceProduct.brand,
        category: sourceProduct.category,
        unit: sourceProduct.unit,
        hsnCode: sourceProduct.hsnCode,
        gstRate: sourceProduct.gstRate,
        purchasePrice: sourceProduct.purchasePrice,
        sellingPrice: sourceProduct.sellingPrice,
        mrp: sourceProduct.mrp,
        stock: 0, // Will be incremented by purchase invoice
      });
    }

    // Deduct stock from source product
    sourceProduct.stock -= transferQty;
    await sourceProduct.save();

    const rate = sourceProduct.purchasePrice || 0;
    const taxableAmount = rate * transferQty;
    const taxAmount = taxableAmount * (sourceProduct.gstRate / 100);
    const total = taxableAmount + taxAmount;

    // Create a Purchase Invoice in the target company
    const purchase = new Purchase({
      targetCompany: targetCompanyId,
      supplierName: sourceProduct.companyId.name + " (Internal Transfer)",
      billNumber: `TRF-${Date.now()}`,
      purchaseDate: new Date(),
      paymentStatus: "Paid",
      itemsTotal: total,
      grandTotal: total,
      items: [
        {
          product: targetProduct._id,
          productName: targetProduct.name,
          qty: transferQty,
          rate: rate,
          gstRate: sourceProduct.gstRate,
          taxAmount: taxAmount,
          total: total,
        },
      ],
    });

    const savedPurchase = await purchase.save();

    // Increment stock in target product
    targetProduct.stock += transferQty;
    await targetProduct.save();

    res.status(201).json({ message: "Transfer successful", purchase: savedPurchase, targetProduct });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
