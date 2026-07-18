import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import Companies from './pages/Companies';
import Products from './pages/Products';
import Purchases from './pages/Purchases';
import Sales from './pages/Sales';
import CreateInvoice from './pages/CreateInvoice';
import Settings from './pages/Settings';
import InvoiceProfitReport from './pages/InvoiceProfitReport';
import ViewInvoice from './pages/ViewInvoice';
import GSTR1Report from './pages/GSTR1Report';
import GlobalStock from './pages/GlobalStock';
import StockAdjustment from './pages/StockAdjustment';
import UserRoles from './pages/UserRoles';
import './App.css';

function App() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo'));

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes wrapped in Layout */}
        <Route path="/" element={userInfo ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="companies" element={<Companies />} />
          <Route path="products" element={<Products />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales" element={<Sales />} />
          <Route path="sales/new" element={<CreateInvoice />} />
          <Route path="sales/edit/:id" element={<CreateInvoice />} />
          <Route path="sales/view/:id" element={<ViewInvoice />} />
          <Route path="reports" element={<InvoiceProfitReport />} />
          <Route path="settings" element={<Settings />} />
          <Route path="invoices" element={<div>All Invoices Content</div>} />
          <Route path="global-stock" element={<GlobalStock />} />
          <Route path="stock-adjustment" element={<StockAdjustment />} />
          <Route path="gstr1" element={<GSTR1Report />} />
          <Route path="user-roles" element={<UserRoles />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
