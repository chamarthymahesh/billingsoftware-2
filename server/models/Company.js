import mongoose from 'mongoose';

const companySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    gstin: {
      type: String,
      required: true,
      unique: true,
    },
    address: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    bankDetails: {
      accountName: String,
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String,
    },
    signatureImage: {
      type: String,
    },
    invoiceTemplates: {
      headerStyle: { type: String, default: 'Professional (Logo Left)' },
      financialYear: { type: String, default: '2026-27' },
      fyPrefix: { type: String, default: '26-27' },
      invoicePrefix: { type: String, default: 'JE' },
      termsAndConditions: { 
        type: String, 
        default: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is not made within due date.' 
      },
      primaryColor: { type: String, default: '#2563eb' },
      secondaryColor: { type: String, default: '#475569' },
      logoImage: { type: String, default: '' },
      fontFamily: { type: String, default: 'Inter' },
      showLogo: { type: Boolean, default: true },
      showSignature: { type: Boolean, default: true },
      invoiceTitle: { type: String, default: 'TAX INVOICE' },
      companyAddressFontSize: { type: String, default: '14px' },
      logoPosition: { type: String, default: 'left' },
      metaPosition: { type: String, default: 'right' },
      addressLayout: { type: String, default: 'side-by-side' },
      signaturePosition: { type: String, default: 'right' },
      termsPosition: { type: String, default: 'left' },
      tableStyle: { type: String, default: 'bordered' },
      canvasLayout: { type: String, default: '' },
      canvasLayoutDraft: { type: String, default: '' }
    }
  },
  {
    timestamps: true,
  }
);

const Company = mongoose.model('Company', companySchema);

export default Company;
