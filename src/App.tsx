import { BrowserRouter as Router, Routes, Route } from "react-router";
import NotFound from "./pages/OtherPage/NotFound";
import AppLayout from "./layout/AppLayout";
import { AuthProvider } from "./context/AuthContext";
import RequireAuth from "./components/auth/RequireAuth";
import SignIn from "./pages/AuthPages/SignIn";
import MfaVerify from "./pages/AuthPages/MfaVerify";
import MfaSetup from "./pages/AuthPages/MfaSetup";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import OrdersList from "./pages/orders/OrdersList";
import OrderDetails from "./pages/orders/OrderDetails";
import ReturnsList from "./pages/returns/ReturnsList";
import ExchangesList from "./pages/exchanges/ExchangesList";
import StockManagement from "./pages/stock/StockManagement";
import CostManagement from "./pages/cost/CostManagement";
import AddCoupon from "./pages/coupons/AddCoupon";
import HomeCMS from "./pages/homeCMS/HomeCMS";
import AddSection from "./pages/homeCMS/AddSection";
import EditSection from "./pages/homeCMS/EditSection";
import SectionItems from "./pages/homeCMS/SectionItems";
import AddSectionItem from "./pages/homeCMS/AddSectionItem";
import EditSectionItem from "./pages/homeCMS/EditSectionItem";
import Category from "./pages/Category";
import Size from "./pages/Size";
import Color from "./pages/Color";
import Collection from "./pages/Collection";
import ProductManagement from "./pages/Productmanagement";
import ReviewDashboard from "./pages/ReviewDashboard";
import AnalyticsDashboard from "./pages/analytics/AnalyticsDashboard";
import ExpenseManagement from "./pages/expenses/ExpenseManagement";
import GstReport from "./pages/gst/GstReport";
import AdminUserManagement from "./pages/adminUsers/AdminUserManagement";

export default function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          {/* Signed-out flow. Each screen redirects itself if the auth state
            doesn't match, so /mfa can't be deep-linked without a token. */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/mfa" element={<MfaVerify />} />
          <Route path="/mfa/setup" element={<MfaSetup />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />

              {/* Catalog */}
              <Route path="/products" element={<ProductManagement />} />
              <Route path="/categories" element={<Category />} />
              <Route path="/collections" element={<Collection />} />
              <Route path="/sizes" element={<Size />} />
              <Route path="/colors" element={<Color />} />
              <Route path="/stock" element={<StockManagement />} />
              <Route path="/costs" element={<CostManagement />} />

              {/* Sales */}
              <Route path="/orders" element={<OrdersList />} />
              <Route path="/orders/:orderId" element={<OrderDetails />} />
              <Route path="/returns" element={<ReturnsList />} />
              <Route path="/exchanges" element={<ExchangesList />} />
              <Route path="/coupons/add" element={<AddCoupon />} />

              {/* Engagement */}
              <Route path="/reviews" element={<ReviewDashboard />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/expenses" element={<ExpenseManagement />} />
              <Route path="/gst-report" element={<GstReport />} />

              {/* Settings */}
              <Route path="/admin-users" element={<AdminUserManagement />} />

              {/* Content */}
              <Route path="/home-cms" element={<HomeCMS />} />
              <Route path="/home-cms/add-section" element={<AddSection />} />
              <Route path="/home-cms/edit/:id" element={<EditSection />} />
              <Route
                path="/home-cms/section/:sectionId/items"
                element={<SectionItems />}
              />
              <Route
                path="/home-cms/section/:sectionId/items/add"
                element={<AddSectionItem />}
              />
              <Route
                path="/home-cms/section/:sectionId/items/edit/:itemId"
                element={<EditSectionItem />}
              />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
