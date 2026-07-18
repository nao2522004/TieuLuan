import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const PromotionsPage = lazy(() => import("./pages/PromotionsPage"));

export const promotionsRoutes: RouteObject[] = [
  {
    path: "/promotions",
    element: <PromotionsPage />,
  },
];
