import { lazy } from "react";
import type { RouteObject } from "react-router-dom";

const InventoryInboundPage = lazy(() => import("./pages/InventoryInboundPage"));
const InventoryAdjustmentPage = lazy(
  () => import("./pages/InventoryAdjustmentPage"),
);

export const inventoryRoutes: RouteObject[] = [
  { path: "/inventory/inbound", element: <InventoryInboundPage /> },
  { path: "/inventory/adjustments", element: <InventoryAdjustmentPage /> },
];
