import { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { authRoutes } from "@/features/auth";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { ErrorBoundary } from "@/providers/ErrorBoundary";

// Lazy-load all pages for code splitting
const DashboardPage = lazy(
  () => import("@/features/products/pages/DashboardPage"),
);
const ProductsPage = lazy(
  () => import("@/features/products/pages/ProductsPage"),
);
const ProductAlertsPage = lazy(
  () => import("@/features/products/pages/ProductAlertsPage"),
);
const CategoriesPage = lazy(
  () => import("@/features/categories/pages/CategoriesPage"),
);
const BranchesPage = lazy(
  () => import("@/features/branches/pages/BranchesPage"),
);
const ShiftsPage = lazy(() => import("@/features/shifts/pages/ShiftsPage"));
const POSPage = lazy(() => import("@/features/orders/pages/POSPage"));
const OrdersPage = lazy(() => import("@/features/orders/pages/OrdersPage"));
const ReturnsPage = lazy(() => import("@/features/returns/pages/ReturnsPage"));
const ReportsPage = lazy(() => import("@/features/reports/pages/ReportsPage"));
const UsersPage = lazy(() => import("@/features/users/pages/UsersPage"));
const ExpiryPricingPage = lazy(
  () => import("@/features/expiry-pricing/pages/ExpiryPricingPage"),
);

function withSuspense(element: React.ReactNode) {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div
            style={{
              padding: "48px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
            Đang tải trang...
          </div>
        }
      >
        {element}
      </Suspense>
    </ErrorBoundary>
  );
}

// 403 Forbidden page
function ForbiddenPage() {
  return (
    <div style={{ padding: "48px", textAlign: "center" }}>
      <div style={{ fontSize: "4rem", marginBottom: "16px" }}>🔒</div>
      <h2>403 – Không có quyền truy cập</h2>
      <p>Bạn không có quyền để xem trang này.</p>
    </div>
  );
}

export const router = createBrowserRouter([
  // Public auth routes (login etc) — no layout
  ...authRoutes.map((r) => ({ ...r, element: withSuspense(r.element) })),

  // Protected routes — RequireAuth wraps DashboardLayout + Outlet
  {
    element: <RequireAuth />,
    children: [
      { path: "/", element: withSuspense(<DashboardPage />) },
      { path: "/products", element: withSuspense(<ProductsPage />) },
      {
        path: "/products/alerts",
        element: withSuspense(<ProductAlertsPage />),
      },
      { path: "/categories", element: withSuspense(<CategoriesPage />) },
      { path: "/branches", element: withSuspense(<BranchesPage />) },
      { path: "/shifts", element: withSuspense(<ShiftsPage />) },
      { path: "/pos", element: withSuspense(<POSPage />) },
      { path: "/orders", element: withSuspense(<OrdersPage />) },
      { path: "/returns", element: withSuspense(<ReturnsPage />) },
      { path: "/403", element: withSuspense(<ForbiddenPage />) },
    ],
  },

  // Admin-only routes
  {
    element: <RequireAuth roles={["admin"]} />,
    children: [
      { path: "/reports", element: withSuspense(<ReportsPage />) },
      { path: "/users", element: withSuspense(<UsersPage />) },
      { path: "/expiry-pricing", element: withSuspense(<ExpiryPricingPage />) },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
