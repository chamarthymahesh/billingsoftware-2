import Employee from '../models/Employee.js';
import SalaryRecord from '../models/SalaryRecord.js';

// Employee CRUD
export const createEmployee = async (req, res) => {
  try {
    const companyId = req.body.companyId || req.user?.companyId;
    if (!companyId) return res.status(400).json({ message: 'Company ID is required' });

    const emp = new Employee({ ...req.body, companyId });
    await emp.save();
    res.status(201).json(emp);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.role === 'Super Admin';
    const targetCompany = req.query.companyId || req.user?.companyId;

    let filter = {};
    if (targetCompany && targetCompany !== 'ALL') {
      filter.companyId = targetCompany;
    } else if (!isSuperAdmin && req.user?.companyId) {
      filter.companyId = req.user.companyId;
    }

    const employees = await Employee.find(filter).populate('companyId', 'name gstin').sort({ createdAt: -1 });

    // Calculate total salary paid & total advances taken for each employee
    const employeeIds = employees.map(e => e._id);
    const salaryRecords = await SalaryRecord.find({ employeeId: { $in: employeeIds } });

    const employeesWithStats = employees.map(emp => {
      const empObject = emp.toObject();
      const empRecords = salaryRecords.filter(r => r.employeeId.toString() === emp._id.toString());
      
      const totalSalaryPaid = empRecords.filter(r => r.type === 'Salary' || !r.type).reduce((sum, r) => sum + (r.amountPaid || 0), 0);
      const totalAdvanceTaken = empRecords.filter(r => r.type === 'Advance').reduce((sum, r) => sum + (r.amountPaid || 0), 0);
      const totalBonusPaid = empRecords.filter(r => r.type === 'Bonus').reduce((sum, r) => sum + (r.amountPaid || 0), 0);
      const totalDeductions = empRecords.filter(r => r.type === 'Deduction').reduce((sum, r) => sum + (r.amountPaid || 0), 0);
      const totalPaidOverall = totalSalaryPaid + totalAdvanceTaken + totalBonusPaid - totalDeductions;

      return {
        ...empObject,
        totalSalaryPaid,
        totalAdvanceTaken,
        totalBonusPaid,
        totalDeductions,
        totalPaidOverall,
        paymentCount: empRecords.length
      };
    });

    res.json(employeesWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    res.json(emp);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const emp = await Employee.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    await SalaryRecord.deleteMany({ employeeId: req.params.id });
    res.json({ message: 'Employee and salary history deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Salary & Advance Management
export const paySalary = async (req, res) => {
  try {
    const employee = await Employee.findById(req.body.employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const companyId = req.body.companyId || employee.companyId || req.user?.companyId;

    const record = new SalaryRecord({
      companyId,
      employeeId: req.body.employeeId,
      type: req.body.type || 'Salary',
      month: req.body.month,
      amountPaid: Number(req.body.amountPaid),
      paymentDate: req.body.paymentDate || new Date(),
      paymentMethod: req.body.paymentMethod || 'Bank Transfer',
      status: req.body.status || 'Paid',
      notes: req.body.notes || ''
    });

    await record.save();
    const populated = await SalaryRecord.findById(record._id).populate('employeeId', 'name designation salaryAmount').populate('companyId', 'name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSalaryHistory = async (req, res) => {
  try {
    const isSuperAdmin = req.user?.role === 'Super Admin';
    const targetCompany = req.query.companyId || req.user?.companyId;
    const { employeeId, type, month } = req.query;

    let filter = {};
    if (targetCompany && targetCompany !== 'ALL') {
      filter.companyId = targetCompany;
    } else if (!isSuperAdmin && req.user?.companyId) {
      filter.companyId = req.user.companyId;
    }

    if (employeeId) filter.employeeId = employeeId;
    if (type) filter.type = type;
    if (month) filter.month = new RegExp(month, 'i');

    const history = await SalaryRecord.find(filter)
      .populate('employeeId', 'name designation phone salaryAmount')
      .populate('companyId', 'name')
      .sort({ paymentDate: -1, createdAt: -1 });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteSalaryRecord = async (req, res) => {
  try {
    const record = await SalaryRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Salary record not found' });
    res.json({ message: 'Salary/advance record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
