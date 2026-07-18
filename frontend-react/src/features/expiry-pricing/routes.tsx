import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const ExpiryPricingPage = lazy(() => import("./pages/ExpiryPricingPage"));

export const expiryPricingRoutes: RouteObject[] = [
  {
    path: "/expiry-pricing",
    element: <ExpiryPricingPage />,
  },
];
