import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import purchaseRoutes from "./routes/purchaseRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import quotationRoutes from "./routes/quotationRoutes.js";
import preOrderRoutes from "./routes/preOrderRoutes.js";
import deliveryChallanRoutes from "./routes/deliveryChallanRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import personalFinanceRoutes from "./routes/personalFinanceRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import { protect } from "./middleware/authMiddleware.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

app.get("/api/healthz", (_req, res) => res.status(200).json({ message: "everything is healthy" }));

// Routes
app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/products", productRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/pre-orders", preOrderRoutes);
app.use("/api/delivery-challans", deliveryChallanRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/personal", protect, personalFinanceRoutes);
app.use("/api/employees", protect, employeeRoutes);

// Basic route
app.get("/", (req, res) => {
  res.send("GST Billing API is running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
