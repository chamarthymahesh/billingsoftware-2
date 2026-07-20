import Product from '../models/Product.js';
import Purchase from '../models/Purchase.js';
import Invoice from '../models/Invoice.js';

export const syncProductStock = async (productId) => {
  if (!productId) return;
  try {
    const prodIdStr = productId.toString();
    const [allPurchases, allInvoices] = await Promise.all([
      Purchase.find({ 'items.product': productId }).lean(),
      Invoice.find({ 'items.product': productId }).lean(),
    ]);

    let totalPurchased = 0;
    allPurchases.forEach(p => {
      p.items?.forEach(item => {
        if (item.product?.toString() === prodIdStr) {
          totalPurchased += Number(item.qty) || 0;
        }
      });
    });

    let totalSold = 0;
    allInvoices.forEach(inv => {
      inv.items?.forEach(item => {
        if (item.product?.toString() === prodIdStr) {
          totalSold += Number(item.qty) || 0;
        }
      });
    });

    const universalStock = totalPurchased - totalSold;
    await Product.findByIdAndUpdate(productId, { $set: { stock: universalStock } });
    console.log(`[StockSync] Synced Product ${productId}. Universal Stock: ${universalStock}`);
    return universalStock;
  } catch (err) {
    console.error(`[StockSync] Error syncing stock for product ${productId}:`, err);
  }
};
