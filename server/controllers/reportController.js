import mongoose from 'mongoose';
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import asyncHandler from 'express-async-handler';

// Get Invoice-wise Profit Report
// Route: GET /api/reports/invoice-profit
export const getInvoiceProfitReport = asyncHandler(async (req, res) => {
  const company = req.user.companyId || req.query.companyId;
  const matchStage = {};
  if (company) {
    matchStage.company = new mongoose.Types.ObjectId(company);
  }

  // Aggregate invoices with their items and product purchase price
  const report = await Invoice.aggregate([
    { $match: matchStage },
    // Match invoices for the company (assuming req.user.companyId is available, else we can skip if not needed for now, but better to match by company if it exists in the system)
    {
      $lookup: {
        from: 'products',
        localField: 'items.product',
        foreignField: '_id',
        as: 'productDetails'
      }
    },
    // We need to calculate Total SP and Total Cost
    // Total SP incl GST is already grandTotal of the invoice
    // We need to sum up Total Cost for all items in the invoice
    {
      $addFields: {
        totalCost: {
          $reduce: {
            input: '$items',
            initialValue: 0,
            in: {
              $add: [
                '$$value',
                {
                  // Let's find the product for this item to get purchase price and gst rate
                  $let: {
                    vars: {
                      matchedProduct: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$productDetails',
                              as: 'pd',
                              cond: { $eq: ['$$pd._id', '$$this.product'] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: {
                      // Total cost of item = qty * purchasePrice * (1 + gstRate/100)
                      $multiply: [
                        '$$this.qty',
                        { $ifNull: ['$$matchedProduct.purchasePrice', 0] },
                        { $add: [1, { $divide: [{ $ifNull: ['$$matchedProduct.gstRate', 18] }, 100] }] }
                      ]
                    }
                  }
                }
              ]
            }
          }
        }
      }
    },
    // Now calculate Final Profit
    // Final Profit = ((Total SP - Total Cost) * (1 - GST_Percentage / 100)) - Transport - Commission - Other Charges
    {
      $addFields: {
        grossProfit: { $subtract: ['$grandTotal', '$totalCost'] },
        gstOnProfitPercentage: 18, // Defaulting to 18% for GST on profit as per standard, could be configurable
      }
    },
    {
      $addFields: {
        profitAfterGst: {
          $subtract: [
            '$grossProfit',
            {
              $multiply: [
                '$grossProfit',
                { $divide: ['$gstOnProfitPercentage', 100] }
              ]
            }
          ]
        }
      }
    },
    {
      $addFields: {
        finalProfit: {
          $subtract: [
            {
              $subtract: [
                {
                  $subtract: [
                    '$profitAfterGst',
                    { $ifNull: ['$transportCharges', 0] }
                  ]
                },
                { $ifNull: ['$commissionAmount', 0] }
              ]
            },
            { $ifNull: ['$otherCharges', 0] }
          ]
        }
      }
    },
    {
      $project: {
        _id: 1,
        invoiceNumber: 1,
        invoiceDate: 1,
        customerName: 1,
        grandTotal: 1,
        totalCost: 1,
        grossProfit: 1,
        profitAfterGst: 1,
        transportCharges: 1,
        commissionAmount: 1,
        commissionStatus: 1,
        otherCharges: 1,
        finalProfit: 1
      }
    },
    { $sort: { invoiceDate: -1 } }
  ]);

  res.json(report);
});

// ----------------------------------------------------------------
// GSTR-1 Report
// Route: GET /api/reports/gstr1?companyId=xxx&month=MM&year=YYYY
//
// Tax Rules:
//   Intra-state (same state code) → CGST = tax/2 + SGST = tax/2
//   Inter-state (different state)  → IGST = full tax
//
// State code = first 2 digits of GSTIN
// ----------------------------------------------------------------
export const getGSTR1Report = asyncHandler(async (req, res) => {
  const companyId = req.user.companyId || req.query.companyId;
  const { month, year } = req.query;
  if (!companyId) {
    res.status(400);
    throw new Error('companyId is required');
  }

  // Fetch company to get its GSTIN state code
  const Company = (await import('../models/Company.js')).default;
  const company = await Company.findById(companyId).lean();
  // First 2 chars of GSTIN = state code (e.g. "29" for Karnataka)
  const sellerStateCode = company?.gstin?.substring(0, 2) || '';

  // Build date filter
  const matchStage = { company: new mongoose.Types.ObjectId(companyId) };
  if (month && year) {
    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate   = new Date(Number(year), Number(month), 1);
    matchStage.invoiceDate = { $gte: startDate, $lt: endDate };
  } else if (year) {
    const startDate = new Date(Number(year), 0, 1);
    const endDate   = new Date(Number(year) + 1, 0, 1);
    matchStage.invoiceDate = { $gte: startDate, $lt: endDate };
  }

  const invoices = await Invoice.find(matchStage).lean();

  const b2b = []; // Business-to-Business (customer has GSTIN)
  const b2c = []; // Business-to-Consumer (no GSTIN)

  // Aggregate HSN Summary for B2B and B2C across ALL invoices
  const hsnB2B = {};
  const hsnB2C = {};

  invoices.forEach(inv => {
    // Determine if intra-state or inter-state
    const customerGSTIN   = inv.customerGSTIN?.trim() || '';
    const buyerStateCode  = customerGSTIN.length >= 2 ? customerGSTIN.substring(0, 2) : '';
    const isInterState    = sellerStateCode && buyerStateCode
                            ? sellerStateCode !== buyerStateCode
                            : false; // default intra if unknown

    const isB2B = customerGSTIN.length > 0;

    // Group items of this invoice by gstRate
    const rateGroups = {};
    inv.items.forEach(item => {
      const rate = Number(item.gstRate) || 0;
      if (!rateGroups[rate]) {
        rateGroups[rate] = {
          taxableValue: 0,
          taxAmount: 0
        };
      }
      rateGroups[rate].taxableValue += Number(item.taxableAmount) || 0;
      rateGroups[rate].taxAmount += Number(item.taxAmount) || 0;
    });

    if (isB2B) {
      Object.entries(rateGroups).forEach(([rateStr, vals]) => {
        const rate = Number(rateStr);
        const cgst = isInterState ? 0 : vals.taxAmount / 2;
        const sgst = isInterState ? 0 : vals.taxAmount / 2;
        const igst = isInterState ? vals.taxAmount : 0;

        b2b.push({
          customerGSTIN,
          customerName: inv.customerName,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          invoiceValue: inv.grandTotal || 0,
          placeOfSupply: inv.placeOfSupply || inv.customerState || '',
          invoiceType: 'Regular',
          reverseCharge: '0',
          applicableTaxRate: '',
          rate: rate,
          taxableValue: vals.taxableValue,
          cessAmount: 0,
          cgst,
          sgst,
          igst
        });
      });
    } else {
      const taxableValue = inv.subtotal || 0;
      const totalTax     = inv.totalTax || 0;
      const cgst = isInterState ? 0 : totalTax / 2;
      const sgst = isInterState ? 0 : totalTax / 2;
      const igst = isInterState ? totalTax : 0;

      b2c.push({
        invoiceNumber: inv.invoiceNumber,
        invoiceDate  : inv.invoiceDate,
        customerName : inv.customerName,
        customerGSTIN: customerGSTIN,
        placeOfSupply: inv.placeOfSupply || '',
        taxType      : isInterState ? 'IGST' : 'CGST+SGST',
        taxableValue,
        cgst,
        sgst,
        igst,
        totalTax,
        grandTotal   : inv.grandTotal || 0
      });
    }

    // Populate HSN aggregates
    const targetHsnMap = isB2B ? hsnB2B : hsnB2C;
    inv.items.forEach(item => {
      const hsn    = item.hsnCode || 'NA';
      const desc   = item.productName || 'NA';
      const uqc    = item.unit || 'Pcs';
      const rate   = item.gstRate || 0;
      const key    = `${hsn}_${desc}_${uqc}_${rate}`;
      const taxAmt = Number(item.taxAmount) || 0;

      if (!targetHsnMap[key]) {
        targetHsnMap[key] = {
          hsn,
          description: desc,
          uqc,
          qty: 0,
          totalValue: 0,
          rate,
          taxableAmount: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          taxAmount: 0,
          cessAmount: 0,
        };
      }
      targetHsnMap[key].qty           += Number(item.qty) || 0;
      targetHsnMap[key].totalValue    += Number(item.total) || 0;
      targetHsnMap[key].taxableAmount += Number(item.taxableAmount) || 0;
      targetHsnMap[key].cgst          += isInterState ? 0 : taxAmt / 2;
      targetHsnMap[key].sgst          += isInterState ? 0 : taxAmt / 2;
      targetHsnMap[key].igst          += isInterState ? taxAmt : 0;
      targetHsnMap[key].taxAmount     += taxAmt;
    });
  });

  // Overall totals
  const allCGST = invoices.reduce((s, inv) => {
    const buyer = inv.customerGSTIN?.trim() || '';
    const isInter = sellerStateCode && buyer.length >= 2 ? sellerStateCode !== buyer.substring(0,2) : false;
    return s + (isInter ? 0 : (inv.totalTax || 0) / 2);
  }, 0);
  const allSGST = allCGST;
  const allIGST = invoices.reduce((s, inv) => {
    const buyer = inv.customerGSTIN?.trim() || '';
    const isInter = sellerStateCode && buyer.length >= 2 ? sellerStateCode !== buyer.substring(0,2) : false;
    return s + (isInter ? (inv.totalTax || 0) : 0);
  }, 0);

  // Calculate DOCS summary
  const sortedInvoices = [...invoices].sort((a, b) => {
    return a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true, sensitivity: 'base' });
  });

  const docs = [];
  if (sortedInvoices.length > 0) {
    docs.push({
      nature: 'Invoices for outward supply',
      from: sortedInvoices[0].invoiceNumber,
      to: sortedInvoices[sortedInvoices.length - 1].invoiceNumber,
      total: sortedInvoices.length,
      cancelled: 0,
      netIssued: sortedInvoices.length
    });
  }

  res.json({
    period         : { month: month || 'All', year: year || 'All' },
    sellerStateCode,
    b2b,
    b2c,
    hsnB2B         : Object.values(hsnB2B),
    hsnB2C         : Object.values(hsnB2C),
    docs,
    totals         : {
      totalInvoices  : invoices.length,
      totalTaxable   : invoices.reduce((s, i) => s + (i.subtotal || 0), 0),
      totalCGST      : allCGST,
      totalSGST      : allSGST,
      totalIGST      : allIGST,
      totalTax       : invoices.reduce((s, i) => s + (i.totalTax || 0), 0),
      totalGrandTotal: invoices.reduce((s, i) => s + (i.grandTotal || 0), 0),
    }
  });
});

