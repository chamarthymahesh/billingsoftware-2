import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import Companies from "./pages/Companies";
import Products from "./pages/Products";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import CreateInvoice from "./pages/CreateInvoice";
import Settings from "./pages/Settings";
import InvoiceDesigner from "./pages/InvoiceDesigner";
import InvoiceProfitReport from "./pages/InvoiceProfitReport";
import ViewInvoice from "./pages/ViewInvoice";
import GSTR1Report from "./pages/GSTR1Report";
import GlobalStock from "./pages/GlobalStock";
import StockAdjustment from "./pages/StockAdjustment";
import UserRoles from "./pages/UserRoles";
import Employees from "./pages/Employees";
import Quotations from "./pages/Quotations";
import CreateQuotation from "./pages/CreateQuotation";
import ViewQuotation from "./pages/ViewQuotation";
import PreOrders from "./pages/PreOrders";
import CreatePreOrder from "./pages/CreatePreOrder";
import ViewPreOrder from "./pages/ViewPreOrder";
import DeliveryChallans from "./pages/DeliveryChallans";
import CreateDeliveryChallan from "./pages/CreateDeliveryChallan";
import ViewDeliveryChallan from "./pages/ViewDeliveryChallan";

// Personal Finance Imports
import Landing from "./components/personal/Landing";
import DashboardPersonal from "./components/personal/Dashboard";
import Bills from "./components/personal/Bills";
import Insurances from "./components/personal/Insurances";
import Loans from "./components/personal/Loans";
import Construction from "./components/personal/Construction";
import Debts from "./components/personal/Debts";
import Cars from "./components/personal/Cars";
import Rentals from "./components/personal/Rentals";
import Transfers from "./components/personal/Transfers";
import ReportsPersonal from "./components/personal/Reports";
import AdminSettings from "./components/personal/AdminSettings";

import "./App.css";

const ProtectedRoute = ({ allowedRole }) => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  if (!userInfo) return <Navigate to="/login" />;

  if (allowedRole === "personal" && userInfo.role !== "Personal Admin") {
    return <Navigate to="/dashboard" />;
  }
  if (allowedRole === "billing" && userInfo.role === "Personal Admin") {
    return <Navigate to="/personal/home" />;
  }

  return <Layout />;
};

const IndexRedirect = () => {
  const userInfo = JSON.parse(localStorage.getItem("userInfo"));
  if (userInfo?.role === "Personal Admin") {
    return <Navigate to="/personal/home" />;
  }
  return <Navigate to="/dashboard" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Billing Routes */}
        <Route path="/" element={<ProtectedRoute allowedRole="billing" />}>
          <Route index element={<IndexRedirect />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="companies" element={<Companies />} />
          <Route path="products" element={<Products />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="sales" element={<Sales />} />
          <Route path="sales/new" element={<CreateInvoice />} />
          <Route path="sales/edit/:id" element={<CreateInvoice />} />
          <Route path="sales/view/:id" element={<ViewInvoice />} />
          <Route path="quotations" element={<Quotations />} />
          <Route path="quotations/new" element={<CreateQuotation />} />
          <Route path="quotations/edit/:id" element={<CreateQuotation />} />
          <Route path="quotations/view/:id" element={<ViewQuotation />} />
          <Route path="pre-orders" element={<PreOrders />} />
          <Route path="pre-orders/new" element={<CreatePreOrder />} />
          <Route path="pre-orders/edit/:id" element={<CreatePreOrder />} />
          <Route path="pre-orders/view/:id" element={<ViewPreOrder />} />
          <Route path="delivery-challans" element={<DeliveryChallans />} />
          <Route path="delivery-challans/new" element={<CreateDeliveryChallan />} />
          <Route path="delivery-challans/edit/:id" element={<CreateDeliveryChallan />} />
          <Route path="delivery-challans/view/:id" element={<ViewDeliveryChallan />} />
          <Route path="reports" element={<InvoiceProfitReport />} />
          <Route path="settings" element={<Settings />} />
          <Route path="settings/designer" element={<InvoiceDesigner />} />
          <Route path="invoices" element={<div>All Invoices Content</div>} />
          <Route path="global-stock" element={<GlobalStock />} />
          <Route path="stock-adjustment" element={<StockAdjustment />} />
          <Route path="gstr1" element={<GSTR1Report />} />
          <Route path="user-roles" element={<UserRoles />} />
          <Route path="employees" element={<Employees />} />
        </Route>

        {/* Protected Personal Finance Routes */}
        <Route path="/" element={<ProtectedRoute allowedRole="personal" />}>
          <Route path="personal/home" element={<Landing />} />
          <Route path="personal/dashboard" element={<DashboardPersonal />} />
          <Route path="personal/bills" element={<Bills />} />
          <Route path="personal/insurances" element={<Insurances />} />
          <Route path="personal/loans" element={<Loans />} />
          <Route path="personal/construction" element={<Construction />} />
          <Route path="personal/debts" element={<Debts />} />
          <Route path="personal/transfers" element={<Transfers />} />
          <Route path="personal/cars" element={<Cars />} />
          <Route path="personal/rentals" element={<Rentals />} />
          <Route path="personal/reports" element={<ReportsPersonal />} />
          <Route path="personal/settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
