import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));

export const categoriesRoutes: RouteObject[] = [
  {
    path: "/categories",
    element: <CategoriesPage />,
  },
];
