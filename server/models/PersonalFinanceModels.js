import mongoose from 'mongoose';

// 1. Utility Bills Model
const BillPaymentSchema = new mongoose.Schema({
  datePaid: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  month: { type: Number, required: true }, // 1 to 12
  year: { type: Number, required: true },
  notes: { type: String }
});

const UtilityBillSchema = new mongoose.Schema({
  type: { type: String, required: true },
  name: { type: String, required: true },
  serviceNo: { type: String }, // NEW: Added service connection number
  status: { type: String, required: true, default: 'active' },
  notes: { type: String },
  payments: [BillPaymentSchema]
}, { timestamps: true });

// 2. Insurance Model
const InsurancePaymentSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  month: { type: Number }, // 1 to 12
  year: { type: Number },
  notes: { type: String }
});

const InsuranceSchema = new mongoose.Schema({
  type: { type: String, required: true },
  provider: { type: String, required: true }, // e.g. Tata AIG
  policyName: { type: String, required: true },
  policyNumber: { type: String },
  startDate: { type: Date }, // NEW: Policy Start Date
  endDate: { type: Date },   // NEW: Policy Expiry Date
  termYears: { type: Number }, // NEW: Policy Term in Years
  maturityAmount: { type: Number }, // NEW: Expected Maturity Return
  premiumAmount: { type: Number, required: true },
  frequency: { type: String, required: true, enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'], default: 'yearly' },
  dueDate: { type: Date }, // Optional now
  status: { type: String, required: true, enum: ['active', 'expired', 'lapsed'], default: 'active' },
  carName: { type: String }, // Link to car name if applicable
  notes: { type: String },
  payments: [InsurancePaymentSchema] // NEW: Tracker for individual payments
}, { timestamps: true });

// Pre-save hook to set default dueDate and compute endDate if missing
InsuranceSchema.pre('save', function () {
  // this refers to the document
  if (!this.dueDate && this.startDate) {
    this.dueDate = this.startDate;
  }
  if (!this.endDate && this.startDate && this.termYears) {
    const end = new Date(this.startDate);
    end.setFullYear(end.getFullYear() + this.termYears);
    this.endDate = end;
  }
});

// 3. Interest Loans Model (Lent or Borrowed money)
const InterestLoanPaymentSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  paymentType: { type: String, required: true, enum: ['interest_payment', 'principal_repayment', 'add_principal'] },
  notes: { type: String }
});

const InterestLoanSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['lent', 'borrowed'] },
  personName: { type: String, required: true },
  principalAmount: { type: Number, required: true },
  interestRate: { type: Number, required: true }, // Interest rate percentage
  interestType: { type: String, required: true, enum: ['monthly', 'yearly'], default: 'monthly' },
  interestMethod: { type: String, enum: ['simple', 'compound'], default: 'simple' },
  dateOccurred: { type: Date, required: true, default: Date.now },
  status: { type: String, required: true, enum: ['active', 'settled'], default: 'active' },
  notes: { type: String },
  payments: [InterestLoanPaymentSchema]
}, { timestamps: true });

// 4. Construction Projects Model
const ConstructionExpenseSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  itemDescription: { type: String, required: true },
  supplier: { type: String },
  notes: { type: String }
});

const ConstructionProjectSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  totalBudget: { type: Number, required: true },
  description: { type: String },
  status: { type: String, required: true, enum: ['ongoing', 'completed'], default: 'ongoing' },
  expenses: [ConstructionExpenseSchema]
}, { timestamps: true });

// 5. Personal Debts Model (Hand loans to Friends/Relatives - no interest tracker)
const DebtRepaymentSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  amount: { type: Number, required: true },
  notes: { type: String }
});

const PersonalDebtSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['given', 'taken'] }, // given = lent to friend, taken = borrowed from friend
  personName: { type: String, required: true },
  relationship: { type: String, required: true },
  amount: { type: Number, required: true },
  dateOccurred: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date },
  status: { type: String, required: true, enum: ['pending', 'settled'], default: 'pending' },
  notes: { type: String },
  repayments: [DebtRepaymentSchema]
}, { timestamps: true });

// 6. Cars Model
const CarMaintenanceSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  serviceType: { type: String, required: true },
  cost: { type: Number, required: true },
  odometer: { type: Number },
  serviceCenter: { type: String },
  notes: { type: String }
});

const CarSchema = new mongoose.Schema({
  name: { type: String, required: true },
  plateNumber: { type: String },
  insuranceProvider: { type: String },
  insuranceDueDate: { type: Date },
  notes: { type: String },
  maintenanceLog: [CarMaintenanceSchema]
}, { timestamps: true });

// 7. Rental Income Model
const RentalPaymentSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 1 to 12
  amountPaid: { type: Number, required: true },
  datePaid: { type: Date, required: true, default: Date.now },
  status: { type: String, required: true, enum: ['paid', 'partial', 'unpaid'], default: 'paid' },
  notes: { type: String }
});

const RentalIncomeSchema = new mongoose.Schema({
  buildingName: { type: String, required: true }, // e.g. Commercial Complex A
  unitNumber: { type: String, required: true }, // e.g. Shop #1
  tenantName: { type: String, required: true },
  tenantPhone: { type: String },
  monthlyRent: { type: Number, required: true },
  status: { type: String, required: true, enum: ['active', 'vacated'], default: 'active' },
  notes: { type: String },
  payments: [RentalPaymentSchema]
}, { timestamps: true });

// 8. Money Transfers Model
const TransferSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true, default: Date.now },
  sentByAccount: { type: String, required: true },
  sentToPerson: { type: String, required: true },
  onBehalfOf: { type: String, required: true }, // e.g., Father
  transferMethod: { type: String, required: true }, // UPI, NEFT, Cash
  notes: { type: String }
}, { timestamps: true });

// 9. Admin Configuration Model (Singleton - stores all dropdown options)
const AdminConfigSchema = new mongoose.Schema({
  configKey: { type: String, default: 'main', unique: true },

  // Utility Bill Types & Connections
  billTypes: { type: [String], default: ['electricity', 'water', 'internet', 'phone', 'gas', 'other'] },
  utilityConnections: { type: [String], default: [] }, // NEW: Added utility connections

  // Insurance Types & Providers
  insuranceTypes: { type: [String], default: ['term', 'health', 'car', 'life', 'property', 'other'] },
  insuranceProviders: { type: [String], default: ['Tata AIG', 'LIC', 'HDFC Ergo', 'ICICI Lombard', 'Star Health', 'Bajaj Allianz', 'Other'] },
  insuranceFrequencies: { type: [String], default: ['monthly', 'quarterly', 'half-yearly', 'yearly'] },

  // Loan Interest Types
  loanInterestTypes: { type: [String], default: ['monthly', 'yearly'] },

  // Construction Expense Categories
  constructionCategories: { type: [String], default: ['materials', 'labor', 'permits', 'contractor', 'transport', 'electrical', 'plumbing', 'other'] },

  // Personal Debt Relationship Types
  relationshipTypes: { type: [String], default: ['friend', 'brother', 'sister', 'relative', 'colleague', 'other'] },

  // Car Service Types
  carServiceTypes: { type: [String], default: ['general_service', 'repair', 'insurance_claim', 'tyre_change', 'oil_change', 'other'] },

  // Building Names for Rental
  buildingNames: { type: [String], default: [] },

  // Money Transfers Configuration
  bankAccounts: { type: [String], default: ['HDFC', 'SBI', 'ICICI', 'Paytm', 'GPay', 'Cash'] },
  transferMethods: { type: [String], default: ['UPI', 'NEFT/IMPS', 'Cash', 'Cheque', 'Other'] },
}, { timestamps: true });

export const UtilityBill = mongoose.model('UtilityBill', UtilityBillSchema);
export const Insurance = mongoose.model('Insurance', InsuranceSchema);
export const InterestLoan = mongoose.model('InterestLoan', InterestLoanSchema);
export const ConstructionProject = mongoose.model('ConstructionProject', ConstructionProjectSchema);
export const PersonalDebt = mongoose.model('PersonalDebt', PersonalDebtSchema);
export const Car = mongoose.model('Car', CarSchema);
export const RentalIncome = mongoose.model('RentalIncome', RentalIncomeSchema);
export const Transfer = mongoose.model('Transfer', TransferSchema);
export const AdminConfig = mongoose.model('AdminConfig', AdminConfigSchema);
