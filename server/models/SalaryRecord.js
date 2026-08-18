import mongoose from 'mongoose';

const salaryRecordSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  type: { type: String, enum: ['Salary', 'Advance', 'Bonus', 'Deduction'], default: 'Salary' },
  month: { type: String, required: true }, // e.g. "May 2026"
  amountPaid: { type: Number, required: true },
  paymentDate: { type: Date, default: Date.now },
  paymentMethod: { type: String, enum: ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other'], default: 'Bank Transfer' },
  status: { type: String, enum: ['Paid', 'Pending', 'Partial'], default: 'Paid' },
  notes: { type: String, default: '' }
}, { timestamps: true });

const SalaryRecord = mongoose.model('SalaryRecord', salaryRecordSchema);
export default SalaryRecord;
