# Frontend React — Store Management (khớp API backend-nestjs)

## 1. Nguyên tắc kiến trúc

- **Feature-based / Bulletproof React**: mỗi nghiệp vụ backend (`auth`, `products`, `categories`,
  `branches`, `orders`, `shifts`, `inventory`, `returns`, `reports`) map 1-1 sang 1 folder trong
  `src/features/`. Mỗi feature **tự đóng gói** — không import chéo `internal` của feature khác,
  chỉ import qua `index.ts` (public API của feature), giống nguyên tắc "chỉ gọi qua Service công khai"
  bên NestJS (Mục 2 ruleset của bạn).
- `src/components`, `src/hooks`, `src/lib`, `src/utils`, `src/providers`, `src/types` ở tầng gốc
  **chỉ chứa thứ dùng chung thật sự toàn app** (tương đương `common/` bên NestJS).
- **Server state** (dữ liệu từ API): TanStack Query — cache, refetch, invalidate theo `queryKey`.
- **Client state** (UI state, auth session hiện tại): Zustand — nhẹ, không cần Provider lồng nhau,
  dễ debug qua Redux DevTools.
- **Type song song 1-1 với DTO NestJS**: mỗi `*.dto.ts` bên backend có 1 `interface` tương ứng ở
  `features/<feature>/types/index.ts` bên frontend. Khi backend đổi DTO, chỉ cần sửa đúng 1 chỗ.

## 2. Cây thư mục

```
frontend-react/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx                 # Compose toàn bộ Provider + Router
│   │   └── AppProviders.tsx        # QueryClientProvider, ErrorBoundary, Toast, Router
│   ├── components/                 # UI dùng chung thật sự (Button, Modal, Table, Pagination...)
│   │   └── ui/
│   ├── config/
│   │   └── env.ts                  # Đọc & validate biến môi trường Vite (import.meta.env)
│   ├── features/
│   │   ├── auth/                   # ĐÃ code mẫu đầy đủ — dùng làm khuôn cho các feature khác
│   │   │   ├── api/
│   │   │   │   ├── auth.api.ts         # gọi thẳng axios instance, KHÔNG chứa business logic UI
│   │   │   │   └── auth.queries.ts     # bọc React Query (useMutation/useQuery) quanh auth.api.ts
│   │   │   ├── components/
│   │   │   │   └── LoginForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts          # facade: kết hợp store + query, Component chỉ cần hook này
│   │   │   ├── stores/
│   │   │   │   └── auth.store.ts       # Zustand: user hiện tại, accessToken (persist localStorage)
│   │   │   ├── types/
│   │   │   │   └── index.ts            # PublicUser, LoginPayload, LoginResponseData...
│   │   │   ├── routes.tsx              # route con của feature (lazy-loaded)
│   │   │   └── index.ts                # PUBLIC API — export những gì feature khác được phép dùng
│   │   ├── products/                   # cấu trúc y hệt auth/, khớp ProductsController
│   │   ├── categories/                 # khớp CategoriesController
│   │   ├── branches/                   # khớp BranchesController
│   │   ├── orders/                     # khớp OrdersController (VietQR, confirm-payment, cancel)
│   │   ├── shifts/                     # khớp ShiftsController
│   │   ├── inventory/                  # khớp InventoryController
│   │   ├── returns/                    # khớp ReturnsController
│   │   └── reports/                    # khớp ReportsController (chỉ admin)
│   ├── hooks/                      # global hook thật sự (useDebounce, useMediaQuery...)
│   ├── lib/
│   │   ├── api-client.ts           # axios instance + interceptor auth/refresh/error (CHI TIẾT bên dưới)
│   │   ├── query-client.ts         # cấu hình QueryClient (staleTime, retry, error handler mặc định)
│   │   ├── query-keys.ts           # factory queryKey tập trung, tránh hard-code string rải rác
│   │   └── notify.ts               # interface trung gian cho toast — không ép cứng 1 thư viện toast
│   ├── providers/
│   │   └── ErrorBoundary.tsx       # bắt lỗi runtime từng khu vực UI, không sập cả app
│   ├── routes/
│   │   └── index.tsx               # Route-based code splitting (React.lazy theo từng feature)
│   ├── stores/                     # global Zustand store thật sự dùng chung (vd: ui.store.ts)
│   ├── types/
│   │   └── api.ts                  # ApiSuccessResponse<T>, ApiErrorResponse, PaginationMeta
│   │                                # — đúng 1-1 với common/dto/api-response.dto.ts bên NestJS
│   ├── utils/
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 3. Quy tắc ranh giới giữa các feature (tương đương Mục 2 ruleset backend)

- Feature A cần dữ liệu của feature B (VD: `orders` cần hiển thị tên `products`) → chỉ import
  qua `features/products/index.ts` (types/hooks công khai), **không** import trực tiếp
  `features/products/api/products.api.ts` hay component nội bộ.
- Mỗi feature có 1 `routes.tsx` riêng, được `React.lazy()` ở `src/routes/index.tsx` — vừa
  code-splitting theo route, vừa giữ ranh giới rõ ràng giữa các nghiệp vụ.

## 4. Cài đặt dependency (chỉ những gì thực sự dùng — theo đúng Mục 7 ruleset backend của bạn)

```bash
npm create vite@latest frontend-react -- --template react-ts
cd frontend-react

npm install axios @tanstack/react-query zustand react-router-dom
npm install react-hook-form zod @hookform/resolvers   # form + validate, khớp validate message backend
npm install sonner                                     # toast nhẹ, thay được bất cứ lúc nào nhờ lib/notify.ts

npm install -D @tanstack/react-query-devtools
```

Không cài UI kit (MUI/AntD) mặc định — nếu bạn cần, thêm khi thực sự code màn hình cần nó, và
luôn import theo kiểu tree-shaking (`import { Button } from "antd/es/button"` thay vì
`import { Button } from "antd"`).
