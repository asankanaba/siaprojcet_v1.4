// src/router/index.js
import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

function rootRedirect() {
  const token = localStorage.getItem("token");
  const user  = localStorage.getItem("user");
  if (token && user) return "/dashboard";
  return "/careers";
}

const routes = [
  // PUBLIC
  { path: "/", redirect: rootRedirect },
  { path: "/login",    name: "Login",    component: () => import("@/views/Login.vue"),    meta: { guest: true } },
  { path: "/register", name: "Register", component: () => import("@/views/Register.vue"), meta: { guest: true } },

  // CAREERS
  { path: "/careers", name: "CareersLanding", component: () => import("@/views/CareersLanding.vue"), meta: { public: true, title: "Careers" } },
  { path: "/careers/:slug", name: "CareersJob", component: () => import("@/views/CareersJob.vue"), meta: { public: true, title: "Job Opening" } },

  // ADMIN / CEO
  { path: "/dashboard", name: "Dashboard", component: () => import("@/views/Dashboard.vue"), meta: { requiresAuth: true, module: "dashboard" } },
  { path: "/ceo-dashboard", name: "CEODashboard", component: () => import("@/views/CEO/CEODashboard.vue"), meta: { requiresAuth: true, module: "dashboard" } },

  // PRODUCTS & POS
  { path: "/products", name: "Products", component: () => import("@/views/Products.vue"), meta: { requiresAuth: true, module: "products" } },
  { path: "/pos", name: "POS", component: () => import("@/views/POS.vue"), meta: { requiresAuth: true, module: "pos" } },

  // SALES & CUSTOMERS
  { path: "/sales", name: "Sales", component: () => import("@/views/Sales.vue"), meta: { requiresAuth: true, module: "sales" } },
  { path: "/customers", name: "Customers", component: () => import("@/views/Customers.vue"), meta: { requiresAuth: true, module: "customers" } },

  // REPORTS
  { path: "/reports", name: "Reports", component: () => import("@/views/Reports.vue"), meta: { requiresAuth: true, module: "reports" } },
  { path: "/analytics", name: "Analytics", component: () => import("@/views/Analytics.vue"), meta: { requiresAuth: true, module: "analytics" } },
  { path: "/full-report", name: "FullReport", component: () => import("@/views/FullReport.vue"), meta: { requiresAuth: true, module: "reports" } },

  // PROFILE
  { path: "/profile", name: "Profile", component: () => import("@/views/Profile.vue"), meta: { requiresAuth: true } },
  { path: "/profile/edit", name: "EditProfile", component: () => import("@/views/EditProfile.vue"), meta: { requiresAuth: true } },

  // SETTINGS
  { path: "/settings", name: "Settings", component: () => import("@/views/Settings.vue"), meta: { requiresAuth: true, module: "settings" } },

  // FINANCE
  { path: "/finance/dashboard", name: "FinanceDashboard", component: () => import("@/views/finance/FinanceDashboard.vue"), meta: { requiresAuth: true, module: "finance_dashboard" } },
  { path: "/finance/transactions", name: "FinanceTransactions", component: () => import("@/views/finance/FinanceTransactions.vue"), meta: { requiresAuth: true, module: "transactions" } },
  { path: "/finance/wallet", name: "FinanceWallet", component: () => import("@/views/finance/FinanceWallet.vue"), meta: { requiresAuth: true, module: "wallet" } },
  { path: "/finance/goals", name: "FinanceGoals", component: () => import("@/views/finance/FinanceGoals.vue"), meta: { requiresAuth: true, module: "finance" } },
  { path: "/finance/budget", name: "FinanceBudget", component: () => import("@/views/finance/FinanceBudget.vue"), meta: { requiresAuth: true, module: "budget" } },
  { path: "/finance/budget-requests", name: "FinanceBudgetRequests", component: () => import("@/views/finance/FinanceBudgetRequests.vue"), meta: { requiresAuth: true, module: "budget_requests" } },
  { path: "/finance/budget-approvals", name: "FinanceBudgetApprovals", component: () => import("@/views/finance/FinanceBudgetApprovals.vue"), meta: { requiresAuth: true, module: "budget_approvals" } },
  { path: "/finance/product-approvals", name: "FinanceProductApprovals", component: () => import("@/views/finance/FinanceProductApprovals.vue"), meta: { requiresAuth: true, module: "product_approvals" } },
  { path: "/finance/reports", name: "FinanceReports", component: () => import("@/views/finance/FinanceReports.vue"), meta: { requiresAuth: true, module: "finance_reports" } },

  // HR
  { path: "/hr/dashboard", name: "HRDashboard", component: () => import("@/views/hr/HRDashboard.vue"), meta: { requiresAuth: true, module: "hr_dashboard" } },
  { path: "/hr/employees", name: "HREmployees", component: () => import("@/views/hr/HREmployees.vue"), meta: { requiresAuth: true, module: "employees" } },
  { path: "/hr/archived", name: "HRArchived", component: () => import("@/views/hr/HRArchivedEmployees.vue"), meta: { requiresAuth: true, module: "employees" } },
  { path: "/hr/attendance", name: "HRAttendance", component: () => import("@/views/hr/HRAttendance.vue"), meta: { requiresAuth: true, module: "attendance" } },
  { path: "/hr/notifications", name: "HRNotifications", component: () => import("@/views/hr/HRNotifications.vue"), meta: { requiresAuth: true, module: "attendance" } },
  { path: "/hr/jobs", name: "HRJobs", component: () => import("@/views/hr/HRJobPosts.vue"), meta: { requiresAuth: true, module: "job_posts" } },
  { path: "/hr/add-post", name: "HRAddPost", component: () => import("@/views/hr/HRAddPost.vue"), meta: { requiresAuth: true, module: "job_posts" } },
  { path: "/hr/add-employee", name: "HRAddEmployee", component: () => import("@/views/hr/HRAddEmployee.vue"), meta: { requiresAuth: true, module: "employees" } },
  { path: "/hr/reports", name: "HRReports", component: () => import("@/views/hr/HRReports.vue"), meta: { requiresAuth: true, module: "hr_reports" } },
  { path: "/hr/budget-requests", name: "HRBudgetRequests", component: () => import("@/views/hr/HRBudgetRequests.vue"), meta: { requiresAuth: true, module: "budget_requests" } },
  { path: "/hr/payroll", name: "HRPayroll", component: () => import("@/views/hr/HRPayroll.vue"), meta: { requiresAuth: true, module: "payroll" } },
  { path: "/hr/payroll/:id", name: "HRPayrollDetail", component: () => import("@/views/hr/HRPayrollDetail.vue"), meta: { requiresAuth: true, module: "payroll" } },

  // SUPPLY CHAIN
  {
    path: "/supply-chain",
    name: "SupplyChain",
    component: () => import("@/views/supply-chain/SupplyChain.vue"),
    meta: { requiresAuth: true, module: "supply_chain_dashboard" },
    children: [
      { path: "procurement", name: "ProcurementDashboard", component: () => import("@/views/supply-chain/procurement/ProcurementDashboard.vue"), meta: { requiresAuth: true, module: "supply_chain_dashboard", title: "Procurement" } },
      { path: "procurement/requisitions", name: "Requisitions", component: () => import("@/views/supply-chain/procurement/Requisitions.vue"), meta: { requiresAuth: true, module: "supply_chain_requests", title: "Requisitions" } },
      { path: "procurement/rfqs", name: "RFQManagement", component: () => import("@/views/supply-chain/procurement/RFQManagement.vue"), meta: { requiresAuth: true, module: "suppliers", title: "RFQ Management" } },
      { path: "procurement/goods-receipt", name: "GoodsReceipt", component: () => import("@/views/supply-chain/procurement/GoodsReceipt.vue"), meta: { requiresAuth: true, module: "purchase_orders", title: "Goods Receipt" } },
      { path: "procurement/invoices", name: "SupplierInvoices", component: () => import("@/views/supply-chain/procurement/Invoices.vue"), meta: { requiresAuth: true, module: "supplier_invoices", title: "Invoices" } },
      { path: "procurement/payments", name: "SupplierPayments", component: () => import("@/views/supply-chain/procurement/Payments.vue"), meta: { requiresAuth: true, module: "supplier_payments", title: "Payments" } },
      { path: "procurement/supplier-performance", name: "SupplierPerformance", component: () => import("@/views/supply-chain/procurement/SupplierPerformance.vue"), meta: { requiresAuth: true, module: "suppliers", title: "Supplier Performance" } },
      { path: "", name: "SupplyChainDashboard", component: () => import("@/views/supply-chain/SupplyChainDashboard.vue"), meta: { requiresAuth: true, module: "supply_chain_dashboard" } },
      { path: "suppliers", name: "SupplyChainSuppliers", component: () => import("@/views/supply-chain/Suppliers.vue"), meta: { requiresAuth: true, module: "suppliers" } },
      { path: "inventory", name: "SupplyChainInventory", component: () => import("@/views/supply-chain/InventoryManagement.vue"), meta: { requiresAuth: true, module: "inventory" } },
      { path: "purchase-orders", name: "SupplyChainPurchaseOrders", component: () => import("@/views/supply-chain/PurchaseOrders.vue"), meta: { requiresAuth: true, module: "purchase_orders" } },
      { path: "requests", name: "SupplyChainRequests", component: () => import("@/views/supply-chain/Requests.vue"), meta: { requiresAuth: true, module: "supply_chain_requests" } },
      { path: "notifications", name: "SupplyChainNotifications", component: () => import("@/views/supply-chain/Notifications.vue"), meta: { requiresAuth: true, module: "supply_chain_notifications" } },
    ],
  },

  // MY ATTENDANCE
  { path: "/my-attendance", name: "MyAttendance", component: () => import("@/views/MyAttendance.vue"), meta: { requiresAuth: true, module: "my_attendance" } },

  // MY WALLET
  { path: "/my-wallet", name: "MyWallet", component: () => import("@/views/MyWallet.vue"), meta: { requiresAuth: true, module: "my_wallet" } },

  // STAFF
  { path: "/staff", name: "Staff", component: () => import("@/views/staff/Staff.vue"), meta: { requiresAuth: true, module: "staff" } },
  { path: "/staff-dashboard", name: "StaffDashboard", component: () => import("@/views/staff/StaffDashboard.vue"), meta: { requiresAuth: true, module: "staff" } },

  // PRINT RECEIPT
  { path: "/print-receipt", name: "PrintReceipt", component: () => import("@/views/PrintReceipt.vue"), meta: { requiresAuth: true, module: "pos" } },

  // PAYMENTS RETURN
  { path: "/payments/return", name: "PaymentsReturn", component: () => import("@/views/PaymentsReturn.vue"), meta: { public: true, title: "Payment Result" } },

  // PAYMENT DEMO
  { path: "/payments/demo", name: "PaymentDemo", component: () => import("@/views/PaymentDemo.vue"), meta: { requiresAuth: true, module: "supplier_payments" } },

  // 404
  { path: "/:pathMatch(.*)*", name: "NotFound", component: () => import("@/views/NotFound.vue") },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

function homeForRole(authStore) {
  if (authStore.isAdmin)       return "/dashboard";
  if (authStore.isSupplyChain) return "/supply-chain/requests";
  if (authStore.isFinance)     return "/finance/dashboard";
  if (authStore.isHR)          return "/hr/dashboard";
  if (authStore.isCEO)         return "/ceo-dashboard";

  const userRole = authStore.user?.role || "";
  if (userRole === "staff" || userRole === "cashier") return "/pos";

  return "/login";
}

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.checkAuth();

  if (to.meta.public) return next();

  if (to.meta.requiresAuth && !isAuthenticated) return next("/login");

  if (to.meta.guest && isAuthenticated) return next(homeForRole(authStore));

  if (to.meta.module && to.path !== "/profile" && to.path !== "/profile/edit") {
    const hasAccess = authStore.hasModule(to.meta.module);
    if (!hasAccess) return next(homeForRole(authStore));
  }

  next();
});

export default router;