import Company from '../models/Company.js';
import User from '../models/User.js';

// @desc    Create new company and its admin user
// @route   POST /api/companies
// @access  Private/SuperAdmin
const createCompany = async (req, res) => {
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
    const companies = await Company.find({}).lean();
    
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
  try {
    const company = await Company.findById(req.params.id);

    if (company) {
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
      res.json(updatedCompany);
    } else {
      res.status(404).json({ message: 'Company not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { createCompany, getCompanies, deleteCompany, updateCompany };
