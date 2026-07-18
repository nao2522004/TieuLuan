export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  products: {
    all: () => ["products"] as const,
    list: (params: unknown) => ["products", "list", params] as const,
    detail: (id: number) => ["products", "detail", id] as const,
    alerts: (branchId?: number) => ["products", "alerts", branchId] as const,
  },
  categories: {
    all: () => ["categories"] as const,
    list: (params: unknown) => ["categories", "list", params] as const,
    detail: (id: number) => ["categories", "detail", id] as const,
  },
  branches: {
    all: () => ["branches"] as const,
    list: (params: unknown) => ["branches", "list", params] as const,
    detail: (id: number) => ["branches", "detail", id] as const,
  },
  orders: {
    all: () => ["orders"] as const,
    list: (params: unknown) => ["orders", "list", params] as const,
    detail: (id: number) => ["orders", "detail", id] as const,
  },
  shifts: {
    current: () => ["shifts", "current"] as const,
  },
  reports: {
    revenue: (params: unknown) => ["reports", "revenue", params] as const,
  },
  promotions: {
    all: () => ["promotions"] as const,
    list: (params: unknown) => ["promotions", "list", params] as const,
    detail: (id: number) => ["promotions", "detail", id] as const,
  },
} as const;
