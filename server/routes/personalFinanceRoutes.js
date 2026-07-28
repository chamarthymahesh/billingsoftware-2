import express from 'express';
import {
  UtilityBill,
  Insurance,
  InterestLoan,
  ConstructionProject,
  PersonalDebt,
  Car,
  RentalIncome,
  Transfer,
  AdminConfig
} from '../models/PersonalFinanceModels.js';

const router = express.Router();

// ======================
// Admin Config Routes
// ======================
router.get('/config', async (req, res) => {
  try {
    let config = await AdminConfig.findOne({ configKey: 'main' });
    if (!config) {
      config = await AdminConfig.create({ configKey: 'main' });
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/config', async (req, res) => {
  try {
    const config = await AdminConfig.findOneAndUpdate(
      { configKey: 'main' },
      req.body,
      { new: true, upsert: true }
    );
    res.json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dashboard Aggregate Summary Route
router.get('/dashboard/summary', async (req, res) => {
  try {
    const [bills, insurances, loans, debts, projects, rentals] = await Promise.all([
      UtilityBill.find(),
      Insurance.find(),
      InterestLoan.find(),
      PersonalDebt.find({ status: 'pending' }),
      ConstructionProject.find(),
      RentalIncome.find({ status: 'active' })
    ]);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    let currentMonthBillsPaid = 0;
    
    bills.forEach(b => {
      const pay = b.payments?.find(p => p.year === currentYear && p.month === currentMonth);
      if (pay) {
        currentMonthBillsPaid += pay.amount;
      }
    });

    const pendingBillsCount = 0;
    const pendingBillsAmount = 0;

    const activeInsurancesCount = insurances.filter(i => i.status === 'active').length;
    
    let totalLentPrincipal = 0;
    let totalBorrowedPrincipal = 0;
    
    loans.forEach(loan => {
      if (loan.status === 'active') {
        const principalAdjustment = loan.payments
          .filter(p => p.paymentType === 'add_principal')
          .reduce((sum, p) => sum + p.amount, 0);
        const principalRepaid = loan.payments
          .filter(p => p.paymentType === 'principal_repayment')
          .reduce((sum, p) => sum + p.amount, 0);
        const currentPrincipal = loan.principalAmount + principalAdjustment - principalRepaid;

        if (loan.type === 'lent') {
          totalLentPrincipal += currentPrincipal;
        } else {
          totalBorrowedPrincipal += currentPrincipal;
        }
      }
    });

    let totalDebtsGiven = 0;
    let totalDebtsTaken = 0;

    debts.forEach(d => {
      const repaid = d.repayments.reduce((sum, r) => sum + r.amount, 0);
      const remaining = d.amount - repaid;
      if (d.type === 'given') {
        totalDebtsGiven += remaining;
      } else {
        totalDebtsTaken += remaining;
      }
    });

    const totalConstructionSpent = projects.reduce((total, project) => {
      const projectSpent = project.expenses.reduce((sum, e) => sum + e.amount, 0);
      return total + projectSpent;
    }, 0);

    const totalMonthlyRentExpectation = rentals.reduce((sum, r) => sum + r.monthlyRent, 0);
    
    let currentMonthRentReceived = 0;
    rentals.forEach(r => {
      const pay = r.payments.find(p => p.year === currentYear && p.month === currentMonth);
      if (pay) {
        currentMonthRentReceived += pay.amountPaid;
      }
    });

    const feed = [];
    
    bills.forEach(b => {
      if (b.payments) {
        b.payments.forEach(p => {
          feed.push({
            date: p.datePaid,
            type: 'Bill Payment',
            title: `Paid bill: ${b.name} (${b.type})`,
            amount: -p.amount,
            color: '#f87171'
          });
        });
      }
    });

    insurances.forEach(i => {
      feed.push({
        date: i.createdAt,
        type: 'Insurance Policy',
        title: `Policy added: ${i.policyName} (${i.provider})`,
        amount: -i.premiumAmount,
        color: '#fbbf24'
      });
    });

    loans.forEach(l => {
      l.payments.forEach(p => {
        let amt = p.amount;
        if (l.type === 'borrowed') amt = -amt;

        feed.push({
          date: p.date,
          type: 'Interest Loan Transaction',
          title: `${l.personName} - ${p.paymentType.replace('_', ' ')}`,
          amount: amt,
          color: amt >= 0 ? '#34d399' : '#f87171'
        });
      });
    });

    debts.forEach(d => {
      d.repayments.forEach(r => {
        const isGiven = d.type === 'given';
        let amt = r.amount;
        if (!isGiven) amt = -amt;
        feed.push({
          date: r.date,
          type: 'Debt Repayment',
          title: `${isGiven ? 'Received from' : 'Paid to'} ${d.personName}`,
          amount: amt,
          color: amt >= 0 ? '#34d399' : '#f87171'
        });
      });
    });

    projects.forEach(p => {
      p.expenses.forEach(e => {
        feed.push({
          date: e.date,
          type: 'Construction Expense',
          title: `[${p.projectName}] ${e.itemDescription} (${e.category})`,
          amount: -e.amount,
          color: '#60a5fa'
        });
      });
    });

    rentals.forEach(r => {
      r.payments.forEach(p => {
        feed.push({
          date: p.datePaid,
          type: 'Rental Income',
          title: `Rent: ${r.tenantName} - Unit ${r.unitNumber}`,
          amount: p.amountPaid,
          color: '#34d399'
        });
      });
    });

    feed.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      summary: {
        pendingBillsCount,
        pendingBillsAmount,
        activeInsurancesCount,
        totalLentPrincipal,
        totalBorrowedPrincipal,
        totalDebtsGiven,
        totalDebtsTaken,
        totalConstructionSpent,
        totalMonthlyRentExpectation,
        currentMonthRentReceived
      },
      recentFeed: feed.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'Server error fetching dashboard summary' });
  }
});

// Dropdowns Master Data Route
router.get('/dropdowns', async (req, res) => {
  try {
    const cars = await Car.find({}, 'name plateNumber');
    const insurances = await Insurance.find({}, 'policyName provider type');
    const projects = await ConstructionProject.find({}, 'projectName');
    const rentals = await RentalIncome.find({}, 'buildingName unitNumber tenantName');
    
    const loanContacts = await InterestLoan.distinct('personName');
    const debtContacts = await PersonalDebt.distinct('personName');
    const contacts = Array.from(new Set([...loanContacts, ...debtContacts])).sort();

    res.json({
      cars,
      insurances,
      projects,
      rentals,
      contacts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Utility Bills Routes
router.get('/bills', async (req, res) => {
  try {
    const bills = await UtilityBill.find().sort({ name: 1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bills', async (req, res) => {
  try {
    const newBill = new UtilityBill(req.body);
    await newBill.save();
    res.status(201).json(newBill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/bills/:id', async (req, res) => {
  try {
    const updated = await UtilityBill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/bills/:id/payments', async (req, res) => {
  try {
    const bill = await UtilityBill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill connection not found' });
    
    bill.payments.push(req.body);
    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/bills/:id/payments/:paymentId', async (req, res) => {
  try {
    const bill = await UtilityBill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill connection not found' });
    const payment = bill.payments.id(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    Object.assign(payment, req.body);
    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/bills/:id/payments/:paymentId', async (req, res) => {
  try {
    const bill = await UtilityBill.findById(req.params.id);
    if (!bill) return res.status(404).json({ error: 'Bill connection not found' });
    bill.payments.pull({ _id: req.params.paymentId });
    await bill.save();
    res.json(bill);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/bills/:id', async (req, res) => {
  try {
    await UtilityBill.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Insurances Routes
router.get('/insurances', async (req, res) => {
  try {
    const insurances = await Insurance.find().sort({ dueDate: 1 });
    res.json(insurances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/insurances', async (req, res) => {
  try {
    const newIns = new Insurance(req.body);
    await newIns.save();
    res.status(201).json(newIns);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/insurances/:id', async (req, res) => {
  try {
    const updated = await Insurance.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/insurances/:id/payments', async (req, res) => {
  try {
    const policy = await Insurance.findById(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    
    policy.payments.push(req.body);

    if (policy.dueDate && policy.frequency) {
      const newDueDate = new Date(policy.dueDate);
      if (policy.frequency === 'monthly') {
        newDueDate.setMonth(newDueDate.getMonth() + 1);
      } else if (policy.frequency === 'quarterly') {
        newDueDate.setMonth(newDueDate.getMonth() + 3);
      } else if (policy.frequency === 'half-yearly') {
        newDueDate.setMonth(newDueDate.getMonth() + 6);
      } else if (policy.frequency === 'yearly') {
        newDueDate.setFullYear(newDueDate.getFullYear() + 1);
      }
      policy.dueDate = newDueDate;
    }

    await policy.save();
    res.json(policy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/insurances/:id/payments/:paymentId', async (req, res) => {
  try {
    const policy = await Insurance.findById(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    const payment = policy.payments.id(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    
    Object.assign(payment, req.body);
    await policy.save();
    res.json(policy);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/insurances/:id/payments/:paymentId', async (req, res) => {
  try {
    const policy = await Insurance.findById(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    policy.payments.pull({ _id: req.params.paymentId });
    await policy.save();
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/insurances/:id', async (req, res) => {
  try {
    await Insurance.findByIdAndDelete(req.params.id);
    res.json({ message: 'Insurance policy deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/insurances/alerts', async (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);
  const alerts = await Insurance.find({
    status: 'active',
    dueDate: { $gte: now, $lte: future }
  }).sort({ dueDate: 1 });
  res.json(alerts);
});

router.post('/insurances/:id/autofill', async (req, res) => {
  try {
    const policy = await Insurance.findById(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    if (!policy.startDate) return res.status(400).json({ error: 'Policy has no start date set.' });
    if (!policy.premiumAmount) return res.status(400).json({ error: 'Policy has no premium amount set.' });

    const start = new Date(policy.startDate);
    const now = new Date();
    const stopYear = now.getFullYear();
    const stopMonth = now.getMonth() + 1;

    let startYear = start.getFullYear();
    let startMonth = start.getMonth() + 1;

    const recorded = new Set(
      policy.payments.map(p => `${p.year}-${p.month}`)
    );

    const toAdd = [];
    let y = startYear, m = startMonth;
    while (y < stopYear || (y === stopYear && m <= stopMonth)) {
      const key = `${y}-${m}`;
      if (!recorded.has(key)) {
        toAdd.push({
          amount: policy.premiumAmount,
          month: m,
          year: y,
          date: new Date(y, m - 1, 1),
          notes: 'Auto-filled'
        });
      }
      m++;
      if (m > 12) { m = 1; y++; }
    }

    if (toAdd.length === 0) {
      return res.json({ message: 'All months already have payments recorded.', added: 0, policy });
    }

    policy.payments.push(...toAdd);
    await policy.save();
    res.json({ message: `Successfully auto-filled ${toAdd.length} month(s).`, added: toAdd.length, policy });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Interest Loans Routes
router.get('/loans', async (req, res) => {
  try {
    const loans = await InterestLoan.find().sort({ createdAt: -1 });
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/loans', async (req, res) => {
  try {
    const newLoan = new InterestLoan(req.body);
    await newLoan.save();
    res.status(201).json(newLoan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/loans/:id', async (req, res) => {
  try {
    const updated = await InterestLoan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/loans/:id/payments', async (req, res) => {
  try {
    const loan = await InterestLoan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    
    loan.payments.push(req.body);
    await loan.save();
    res.json(loan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/loans/:id', async (req, res) => {
  try {
    await InterestLoan.findByIdAndDelete(req.params.id);
    res.json({ message: 'Loan deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Construction Projects Routes
router.get('/construction', async (req, res) => {
  try {
    const projects = await ConstructionProject.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/construction', async (req, res) => {
  try {
    const newProject = new ConstructionProject(req.body);
    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/construction/:id', async (req, res) => {
  try {
    const updated = await ConstructionProject.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/construction/:id/expenses', async (req, res) => {
  try {
    const project = await ConstructionProject.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    project.expenses.push(req.body);
    await project.save();
    res.json(project);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/construction/:id', async (req, res) => {
  try {
    await ConstructionProject.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Personal Debts Routes
router.get('/debts', async (req, res) => {
  try {
    const debts = await PersonalDebt.find().sort({ createdAt: -1 });
    res.json(debts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/debts', async (req, res) => {
  try {
    const newDebt = new PersonalDebt(req.body);
    await newDebt.save();
    res.status(201).json(newDebt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/debts/:id', async (req, res) => {
  try {
    const updated = await PersonalDebt.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/debts/:id/repayments', async (req, res) => {
  try {
    const debt = await PersonalDebt.findById(req.params.id);
    if (!debt) return res.status(404).json({ error: 'Debt record not found' });
    
    debt.repayments.push(req.body);
    
    const totalRepaid = debt.repayments.reduce((sum, r) => sum + r.amount, 0);
    if (totalRepaid >= debt.amount) {
      debt.status = 'settled';
    }
    
    await debt.save();
    res.json(debt);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/debts/:id', async (req, res) => {
  try {
    await PersonalDebt.findByIdAndDelete(req.params.id);
    res.json({ message: 'Debt record deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cars Routes
router.get('/cars', async (req, res) => {
  try {
    const cars = await Car.find().sort({ createdAt: -1 });
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/cars', async (req, res) => {
  try {
    const newCar = new Car(req.body);
    await newCar.save();
    res.status(201).json(newCar);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/cars/:id', async (req, res) => {
  try {
    const updated = await Car.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/cars/:id/maintenance', async (req, res) => {
  try {
    const car = await Car.findById(req.params.id);
    if (!car) return res.status(404).json({ error: 'Car not found' });
    
    car.maintenanceLog.push(req.body);
    await car.save();
    res.json(car);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/cars/:id', async (req, res) => {
  try {
    await Car.findByIdAndDelete(req.params.id);
    res.json({ message: 'Car deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rental Income Routes
router.get('/rentals', async (req, res) => {
  try {
    const rentals = await RentalIncome.find().sort({ buildingName: 1, unitNumber: 1 });
    res.json(rentals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/rentals', async (req, res) => {
  try {
    const newRental = new RentalIncome(req.body);
    await newRental.save();
    res.status(201).json(newRental);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/rentals/:id', async (req, res) => {
  try {
    const updated = await RentalIncome.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/rentals/:id/payments', async (req, res) => {
  try {
    const rental = await RentalIncome.findById(req.params.id);
    if (!rental) return res.status(404).json({ error: 'Rental property not found' });
    
    rental.payments.push(req.body);
    await rental.save();
    res.json(rental);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/rentals/:id', async (req, res) => {
  try {
    await RentalIncome.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rental property deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Transfers Routes ---
router.get('/transfers', async (req, res) => {
  try {
    const transfers = await Transfer.find().sort({ createdAt: -1 });
    res.json(transfers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transfers', async (req, res) => {
  try {
    const newTransfer = new Transfer(req.body);
    await newTransfer.save();
    res.status(201).json(newTransfer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/transfers/:id', async (req, res) => {
  try {
    const updated = await Transfer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/transfers/:id', async (req, res) => {
  try {
    await Transfer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Transfer deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Admin Config Route (Extra route alignment) ---
router.get('/admin/config', async (req, res) => {
  try {
    let config = await AdminConfig.findOne({ configKey: 'main' });
    if (!config) {
      config = new AdminConfig({ configKey: 'main' });
      await config.save();
    }
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
