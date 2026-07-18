import Company from '../models/Company.js';
import User from '../models/User.js';

// @desc    Create new company and its admin user
// @route   POST /api/companies
// @access  Private/SuperAdmin
const createCompany = async (req, res) => {
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ message: 'Only Super Admins can create companies' });
  }
  const { name, gstin, phone, email, address, adminEmail, adminPassword } = req.body;

  try {
    // Check if admin email already exists
    const userExists = await User.findOne({ email: adminEmail });
    if (userExists) {
      return res.status(400).json({ message: 'Admin email is already registered to another user' });
    }

    // Create Company
    const company = await Company.create({
      name,
      gstin: gstin || 'N/A',
      phone,
      email,
      address,
    });

    // Create Company Admin User
    const adminUser = await User.create({
      name: `${name} Admin`,
      email: adminEmail,
      password: adminPassword,
      role: 'Company Admin',
      companyId: company._id,
    });

    // Automatically create corresponding Customer record if not exists
    const Customer = (await import('../models/Customer.js')).default;
    const existingCust = await Customer.findOne({ name: new RegExp(`^${company.name.trim()}$`, 'i') });
    if (!existingCust) {
      await Customer.create({
        name: company.name,
        phone: company.phone || '',
        gstin: company.gstin === 'N/A' ? '' : (company.gstin || ''),
        billingAddress: company.address || '',
        shippingAddress: company.address || ''
      });
    }

    // Automatically create corresponding Supplier record if not exists
    const Supplier = (await import('../models/Supplier.js')).default;
    const existingSupp = await Supplier.findOne({ name: new RegExp(`^${company.name.trim()}$`, 'i') });
    if (!existingSupp) {
      await Supplier.create({
        name: company.name,
        phone: company.phone || '',
        gstin: company.gstin === 'N/A' ? '' : (company.gstin || ''),
        address: company.address || ''
      });
    }

    res.status(201).json({ company, adminUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private
const getCompanies = async (req, res) => {
  try {
    const filter = req.user.companyId && req.query.global !== 'true' ? { _id: req.user.companyId } : {};
    const companies = await Company.find(filter).lean();
    
    // Attach admin user details to each company
    const companiesWithAdmins = await Promise.all(
      companies.map(async (company) => {
        const adminUser = await User.findOne({ companyId: company._id, role: 'Company Admin' }).select('-password').lean();
        return {
          ...company,
          adminUser
        };
      })
    );
    
    res.json(companiesWithAdmins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a company
// @route   DELETE /api/companies/:id
// @access  Private/SuperAdmin
const deleteCompany = async (req, res) => {
  if (req.user.role !== 'Super Admin') {
    return res.status(403).json({ message: 'Only Super Admins can delete companies' });
  }
  try {
    const company = await Company.findById(req.params.id);

    if (company) {
      // Also delete all users associated with this company
      await User.deleteMany({ companyId: company._id });
      await company.deleteOne();
      res.json({ message: 'Company and associated users removed' });
    } else {
      res.status(404).json({ message: 'Company not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a company
// @route   PUT /api/companies/:id
// @access  Private/Admin
const updateCompany = async (req, res) => {
  if (req.user.companyId && req.params.id !== req.user.companyId.toString()) {
    return res.status(403).json({ message: 'Not authorized to update this company' });
  }
  try {
    const company = await Company.findById(req.params.id);

    if (company) {
      const oldName = company.name;
      company.name = req.body.name || company.name;
      company.gstin = req.body.gstin || company.gstin;
      company.phone = req.body.phone || company.phone;
      company.email = req.body.email || company.email;
      company.address = req.body.address || company.address;
      company.signatureImage = req.body.signatureImage !== undefined ? req.body.signatureImage : company.signatureImage;

      if (req.body.bankDetails) {
        company.bankDetails = {
          ...company.bankDetails,
          ...req.body.bankDetails
        };
      }

      if (req.body.invoiceTemplates) {
        company.invoiceTemplates = {
          ...company.invoiceTemplates,
          ...req.body.invoiceTemplates
        };
      }

      const updatedCompany = await company.save();

      // Automatically update corresponding Customer and Supplier records
      try {
        const Customer = (await import('../models/Customer.js')).default;
        await Customer.findOneAndUpdate(
          { name: new RegExp(`^${oldName.trim()}$`, 'i') },
          {
            name: updatedCompany.name,
            phone: updatedCompany.phone || '',
            gstin: updatedCompany.gstin === 'N/A' ? '' : (updatedCompany.gstin || ''),
            billingAddress: updatedCompany.address || '',
            shippingAddress: updatedCompany.address || ''
          }
        );

        const Supplier = (await import('../models/Supplier.js')).default;
        await Supplier.findOneAndUpdate(
          { name: new RegExp(`^${oldName.trim()}$`, 'i') },
          {
            name: updatedCompany.name,
            phone: updatedCompany.phone || '',
            gstin: updatedCompany.gstin === 'N/A' ? '' : (updatedCompany.gstin || ''),
            address: updatedCompany.address || ''
          }
        );
      } catch (syncErr) {
        console.error('Error syncing company details with customer/supplier:', syncErr);
      }

      res.json(updatedCompany);
    } else {
      res.status(404).json({ message: 'Company not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { createCompany, getCompanies, deleteCompany, updateCompany };
