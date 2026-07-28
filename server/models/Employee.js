import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true },
  designation: { type: String },
  phone: { type: String },
  email: { type: String },
  salaryAmount: { type: Number, required: true },
  joiningDate: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const Employee = mongoose.model('Employee', employeeSchema);
export default Employee;
