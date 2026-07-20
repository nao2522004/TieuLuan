import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const StocktakesPage = lazy(() => import("./pages/StocktakesPage"));

export const stocktakesRoutes: RouteObject[] = [
  { path: "/stocktakes", element: <StocktakesPage /> },
];
