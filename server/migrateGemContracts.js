import mongoose from 'mongoose';

const V1_MONGO_URI = 'mongodb+srv://billing:Nehaal2026@billing.sptqh4u.mongodb.net/';
const V2_MONGO_URI = 'mongodb+srv://testbilling:Nehaal2026@testbilling.nru5qp8.mongodb.net/billbook_gst';

async function migrate() {
  console.log('Connecting to V1 database...');
  const connV1 = await mongoose.createConnection(V1_MONGO_URI).asPromise();
  console.log('Connected to V1.');

  // Define minimal v1 Invoice schema
  const V1InvoiceSchema = new connV1.base.Schema({
    invoiceNumber: String,
    gemContractNumber: String,
  }, { strict: false });
  const V1Invoice = connV1.model('Invoice', V1InvoiceSchema, 'invoices');

  console.log('Fetching invoices with gemContractNumber from V1...');
  const v1Invoices = await V1Invoice.find({ 
    gemContractNumber: { $exists: true, $ne: '' } 
  }).lean();
  console.log(`Found ${v1Invoices.length} invoices with GeM Contract Numbers in V1.`);

  await connV1.close();
  console.log('Disconnected from V1.');

  if (v1Invoices.length === 0) {
    console.log('No GeM Contract Numbers to migrate.');
    return;
  }

  console.log('Connecting to V2 database...');
  const connV2 = await mongoose.createConnection(V2_MONGO_URI).asPromise();
  console.log('Connected to V2.');

  // Define minimal v2 Invoice schema
  const V2InvoiceSchema = new connV2.base.Schema({
    invoiceNumber: String,
    gemContractNumber: String,
  }, { strict: false });
  const V2Invoice = connV2.model('Invoice', V2InvoiceSchema, 'invoices');

  let updatedCount = 0;
  for (const v1Inv of v1Invoices) {
    const result = await V2Invoice.updateOne(
      { invoiceNumber: v1Inv.invoiceNumber },
      { $set: { gemContractNumber: v1Inv.gemContractNumber } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Updated invoice ${v1Inv.invoiceNumber} with GeM Contract: ${v1Inv.gemContractNumber}`);
      updatedCount++;
    }
  }

  console.log(`Migration complete. Updated ${updatedCount} invoices in V2.`);
  await connV2.close();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
