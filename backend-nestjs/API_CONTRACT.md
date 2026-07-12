# API Contract — Hệ thống quản lý cửa hàng tiện lợi mini

> Nguồn tham chiếu DUY NHẤT để đối chiếu hành vi giữa backend NestJS và backend FastAPI
> (Parity Principle — xem `RULESET_NestJS_FastAPI.md`). Cập nhật ngay khi code xong mỗi
> endpoint, KHÔNG để dồn tới cuối mới viết.
>
> **Cập nhật lần này:** bổ sung `categories` CRUD (đã có controller/service thật trong code)
> và bổ sung chi tiết `users`. Các module `branches`, `shifts`, `returns` hiện mới chỉ có
> `entity`/DTO, **chưa có controller/service** nên chưa đưa vào phần đặc tả bên dưới — sẽ bổ
> sung khi có route thật, tránh ghi sai hành vi.

## Quy ước chung

- Base path: `/` — **lưu ý:** `CategoriesController` hiện dùng `@Controller("categories")`
  không có prefix, và `main.ts` chưa gọi `setGlobalPrefix`, nên thực tế base path vẫn là `/`,
  CHƯA chuyển sang `/api/v1` như dự kiến ban đầu ở Ngày 6. Cần xác nhận lại kế hoạch.
- ID: số nguyên (`bigint`), không dùng UUID
- Thời gian: ISO 8601 UTC, dạng `YYYY-MM-DDTHH:mm:ss.sssZ`
- Tiền tệ: số thô, không format dấu chấm/phẩy
- **Field JSON convention: `snake_case`** cho cả request/response body (kể cả bên NestJS, dù biến nội bộ TS dùng camelCase)
- **Auth mặc định (đã xác nhận với chủ dự án):** vì đây là app chạy nội bộ (local), quy tắc chung
  là **mọi endpoint nghiệp vụ đều bắt buộc đăng nhập (Bearer token)**, kể cả các API `GET` chỉ đọc
  dữ liệu — không có khái niệm "public read" trong hệ thống này. Chỉ các endpoint hạ tầng/xác thực
  (`GET /health`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`) là không cần
  token, vì bản chất chúng phục vụ việc lấy token hoặc kiểm tra server sống. Khi viết
  controller/router mới (cả NestJS lẫn FastAPI), mặc định gắn guard/`Depends` xác thực ngay từ
  đầu, chỉ bỏ khi endpoint thuộc đúng 1 trong 4 route hạ tầng/xác thực nói trên.
- Tài khoản seed sẵn để test:
  - `admin@store.local` / `Admin@123` (role `admin`)
  - `staff@store.local` / `Staff@123` (role `staff`)
- Response thành công:
  ```json
  { "success": true, "data": {}, "timestamp": "2026-07-11T10:00:00.000Z" }
  ```
- Response thành công (có phân trang):
  ```json
  {
    "success": true,
    "data": [{ "...": "..." }],
    "meta": {
      "current_page": 1,
      "limit": 10,
      "total_items": 150,
      "total_pages": 15
    },
    "timestamp": "2026-07-11T10:00:00.000Z"
  }
  ```
- Response lỗi:
  ```json
  {
    "success": false,
    "error": { "code": "STRING", "message": "..." },
    "timestamp": "...",
    "trace_id": "uuid"
  }
  ```
- Lỗi validate path-param dạng ID: nếu không phải số nguyên dương → `400 VALIDATION_ERROR`,
  message dạng `"<field>: phải là số nguyên dương"` (xem `ParseIntIdPipe`).

---

## GET /health

- Auth: không cần
- Status: `200 OK`

**Response 200:**

```json
{
  "success": true,
  "data": { "status": "ok", "service": "backend-nestjs" },
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

---

## POST /auth/login

- Auth: không cần
- Status: `200 OK`
- Rate limit: **5 lần/60 giây** — vượt quá trả `429`

**Request:**

```json
{ "email": "admin@store.local", "password": "Admin@123" }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "full_name": "Quản trị viên",
      "email": "admin@store.local",
      "role": "admin",
      "is_active": true,
      "branch_id": null,
      "created_at": "2026-07-11T10:00:00.000Z"
    },
    "access_token": "eyJhbGciOi...",
    "refresh_token": "9f1c2e...(hex 96 ký tự)"
  },
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

**Lỗi có thể có:**
| Case | Status | error.code | message mẫu |
|---|---|---|---|
| Sai email hoặc sai mật khẩu | 401 | `AUTH_INVALID_CREDENTIALS` | "Email hoặc mật khẩu không đúng." |
| Tài khoản bị khóa | 401 | `AUTH_ACCOUNT_DISABLED` | "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." |
| Thiếu/sai field | 400 | `VALIDATION_ERROR` | danh sách lỗi join bằng ", " |
| Vượt rate limit | 429 | `RATE_LIMIT_EXCEEDED` | — |

**Ghi chú token:**

- `access_token`: JWT, hạn 900s (15 phút), payload: `{ sub, email, role, branchId }`
- `refresh_token`: hex 96 ký tự, server lưu hash SHA-256, hạn 7 ngày

---

## POST /auth/refresh

- Auth: không cần
- Status: `200 OK`

**Request:**

```json
{ "refresh_token": "9f1c2e...(hex 96 ký tự)" }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOi...(mới)",
    "refresh_token": "a3b4c5...(mới, hex 96 ký tự)"
  },
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

> **Token Rotation:** refresh token cũ bị thu hồi ngay lập tức. Dùng lại token cũ → `401`.

**Lỗi có thể có:**
| Case | Status | error.code |
|---|---|---|
| Token không tồn tại / đã thu hồi / hết hạn | 401 | `AUTH_INVALID_REFRESH_TOKEN` |

---

## POST /auth/logout

- Auth: không cần
- Status: `200 OK`

**Request:**

```json
{ "refresh_token": "9f1c2e..." }
```

**Response 200:**

```json
{
  "success": true,
  "data": { "message": "Đăng xuất thành công." },
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

> Luôn trả `200` dù token có tồn tại hay không (tránh leak thông tin).

---

## GET /users/me

- Auth: bắt buộc (`JwtAuthGuard`), Bearer token
- Status: `200 OK`
- Đây là endpoint demo dùng để test `JwtAuthGuard`, trả về đúng object `request.user` mà guard gán,
  **không phải** full profile user trong DB.

**Response 200:**

```json
{
  "success": true,
  "data": { "id": 1, "email": "admin@store.local", "role": "admin" },
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

**Lỗi có thể có:**
| Case | Status | error.code |
|---|---|---|
| Thiếu/sai Bearer token | 401 | `UNAUTHORIZED` |

---

## GET /users/admin-only-demo

- Auth: bắt buộc (`JwtAuthGuard` + `RolesGuard`), role `admin`
- Status: `200 OK`
- Ghi chú trong code: đây là endpoint demo để test `RolesGuard`, **sẽ bị xóa** khi Categories/Products
  có endpoint admin-only thật — nên coi đây là tạm thời, không cần port sang FastAPI.

**Response 200:**

```json
{
  "success": true,
  "data": { "message": "Chỉ admin mới thấy được message này." },
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

**Lỗi có thể có:**
| Case | Status | error.code |
|---|---|---|
| Thiếu/sai Bearer token | 401 | `UNAUTHORIZED` |
| Đúng token nhưng không phải role `admin` | 403 | `FORBIDDEN` |

---

## Categories (`/categories`)

Toàn bộ endpoint dưới `CategoriesController` bắt buộc `JwtAuthGuard` ở mức Controller — tức là
**kể cả `GET` cũng cần Bearer token hợp lệ**, không chỉ riêng thao tác ghi. Đây đúng theo quy tắc
auth mặc định của toàn hệ thống (xem "Quy ước chung"), không phải ngoại lệ riêng của module này.

### GET /categories

- Auth: bắt buộc (bất kỳ role nào đã đăng nhập)
- Status: `200 OK`
- Query param: `page` (mặc định 1), `limit` (mặc định 10, tối đa 100), `search` (tìm theo `name`, `ILIKE`)

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Đồ uống",
      "description": "Nước ngọt, bia, nước suối...",
      "is_active": true,
      "created_at": "2026-07-11T10:00:00.000Z",
      "updated_at": "2026-07-11T10:00:00.000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "limit": 10,
    "total_items": 1,
    "total_pages": 1
  },
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

**Lỗi có thể có:**
| Case | Status | error.code | message mẫu |
|---|---|---|---|
| `page`/`limit` sai định dạng | 400 | `VALIDATION_ERROR` | "page: phải là số nguyên", "limit: tối đa là 100" (join bằng ", ") |
| Thiếu/sai Bearer token | 401 | `UNAUTHORIZED` | — |

### GET /categories/:id

- Auth: bắt buộc (bất kỳ role nào)
- Status: `200 OK`
- Chỉ trả category chưa bị soft-delete (`deleted_at IS NULL`)

**Response 200:** (object `CategoryDto` như trên, không bọc mảng)

**Lỗi có thể có:**
| Case | Status | error.code | message mẫu |
|---|---|---|---|
| `id` không phải số nguyên dương | 400 | `VALIDATION_ERROR` | "id: phải là số nguyên dương" |
| Không tìm thấy / đã bị xóa | 404 | `CATEGORY_NOT_FOUND` | "Không tìm thấy category." |

### POST /categories

- Auth: bắt buộc, role **`admin`** (`RolesGuard` + `@Roles("admin")`)
- Status: `201 Created`

**Request:**

```json
{
  "name": "Đồ uống",
  "description": "Nước ngọt, bia, nước suối...",
  "is_active": true
}
```

- `name`: bắt buộc, string, tối đa 150 ký tự
- `description`: tùy chọn, string, tối đa 255 ký tự
- `is_active`: tùy chọn, boolean, mặc định `true` nếu không gửi

**Response 201:** (object `CategoryDto`)

**Lỗi có thể có:**
| Case | Status | error.code | message mẫu |
|---|---|---|---|
| Thiếu/sai field | 400 | `VALIDATION_ERROR` | "name: không được để trống, name: tối đa 150 ký tự" |
| Gửi thừa field ngoài DTO (mass assignment) | 400 | `VALIDATION_ERROR` | do `whitelist + forbidNonWhitelisted` toàn cục |
| `name` đã tồn tại (trong các category chưa xóa) | 409 | `CATEGORY_NAME_DUPLICATE` | "Tên category đã tồn tại." |
| Không phải role `admin` | 403 | `FORBIDDEN` | — |

### PATCH /categories/:id

- Auth: bắt buộc, role **`admin`**
- Status: `200 OK`
- Request: cùng shape `POST` nhưng tất cả field đều tùy chọn (`PartialType`)
- Chỉ kiểm tra trùng tên nếu `name` gửi lên khác với tên hiện tại

**Response 200:** (object `CategoryDto` đã cập nhật)

**Lỗi có thể có:**
| Case | Status | error.code |
|---|---|---|
| `id` sai định dạng | 400 | `VALIDATION_ERROR` |
| Không tìm thấy / đã xóa | 404 | `CATEGORY_NOT_FOUND` |
| Đổi `name` trùng category khác | 409 | `CATEGORY_NAME_DUPLICATE` |
| Không phải role `admin` | 403 | `FORBIDDEN` |

### DELETE /categories/:id

- Auth: bắt buộc, role **`admin`**
- Status: `200 OK` (khai báo tường minh `@HttpCode(HttpStatus.OK)`, không phải 204)
- Hành vi: soft delete — set `deleted_at = now()`, **không xóa thật** khỏi DB

**Response 200:**

```json
{
  "success": true,
  "data": { "message": "Xóa category thành công." },
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

**Lỗi có thể có:**
| Case | Status | error.code |
|---|---|---|
| `id` sai định dạng | 400 | `VALIDATION_ERROR` |
| Không tìm thấy / đã xóa trước đó | 404 | `CATEGORY_NOT_FOUND` |
| Không phải role `admin` | 403 | `FORBIDDEN` |

---

## GET/POST/PATCH/DELETE /branches

- Auth: `JwtAuthGuard` cho mọi route
- `GET`: mọi role đã đăng nhập
- `POST`/`PATCH`/`DELETE`: chỉ `admin` — vượt quyền trả `403 FORBIDDEN`
- Status: `GET/PATCH/DELETE -> 200`, `POST -> 201`
- Soft delete + pagination chuẩn (Mục 3, 9 ruleset)

**BranchDto:**

```json
{
  "id": 1,
  "name": "Chi nhánh Quận 1",
  "address": "123 Lê Lợi, Q.1, TP.HCM",
  "phone": "028-1234-5678",
  "is_active": true,
  "bank_bin": "970422",
  "bank_account_no": "0123456789",
  "bank_account_name": "NGUYEN VAN A",
  "created_at": "2026-07-11T10:00:00.000Z",
  "updated_at": "2026-07-11T10:00:00.000Z"
}
```

**Lỗi:** `BRANCH_NOT_FOUND` (404), `VALIDATION_ERROR` (400), `FORBIDDEN` (403).

---

## GET/POST/PATCH/DELETE /products

- Auth: `JwtAuthGuard` cho mọi route
- `GET`: mọi role đã đăng nhập — **có cache Redis** (`products:detail:{id}`, `products:list:*`, TTL = `REDIS_CACHE_TTL`)
- `POST`/`PATCH`/`DELETE`: chỉ `admin`
- **`PATCH /products/:id` bắt buộc evict cache ngay trong request** trước khi trả response — không chờ TTL
- Barcode unique theo từng `branch_id` (đúng `uq_products_branch_barcode`)

**Lỗi:** `PRODUCT_NOT_FOUND` (404), `BRANCH_NOT_FOUND`/`CATEGORY_NOT_FOUND` (404, khi branch_id/category_id không tồn tại), `PRODUCT_BARCODE_DUPLICATE` (409), `VALIDATION_ERROR` (400).

---

## RBAC — Phân quyền (tổng hợp)

| Endpoint                                                              | Guard                         | Role yêu cầu    |
| --------------------------------------------------------------------- | ----------------------------- | --------------- |
| `GET /users/me`                                                       | `JwtAuthGuard`                | Bất kỳ role nào |
| `GET /users/admin-only-demo`                                          | `JwtAuthGuard` + `RolesGuard` | `admin`         |
| `GET /categories`, `GET /categories/:id`                              | `JwtAuthGuard`                | Bất kỳ role nào |
| `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id` | `JwtAuthGuard` + `RolesGuard` | `admin`         |

**Lỗi phân quyền (áp dụng chung):**
| Case | Status | error.code |
|---|---|---|
| Không có / sai Bearer token | 401 | `UNAUTHORIZED` |
| Đúng token nhưng sai role | 403 | `FORBIDDEN` |

---

## Response Header — Trace ID

Mọi response đều có header `X-Request-ID: <uuid-v4>`.

- Nếu client gửi `X-Request-ID` trong request → server dùng lại giá trị đó
- Nếu không → server tự sinh UUID v4
- `trace_id` trong response body lỗi khớp với `X-Request-ID`

---

## TODO — chưa có controller/route thật, CHƯA đưa vào contract

> Các mục dưới đây chỉ mới có `entity` (và đôi khi 1 DTO tạo), **chưa có** `*.controller.ts` /
> `*.service.ts` / `*.module.ts` trong những gì đã xem — không tự suy diễn route path/status
> code/quy tắc phân quyền cho các mục này. Cập nhật phần trên khi có code thật.

- `branches` — có `Branch` entity + `CreateBranchDto`, chưa có controller/service/module
- `shifts` — chỉ có `Shift` entity
- `returns` — chỉ có `Return` entity
- `products` — chưa thấy entity/controller nào
- `orders`, `order_items` — chưa thấy entity/controller nào (chỉ có trong `000_schema.sql`)
- `inventory_transactions` — chỉ có trong `000_schema.sql`
- QR thanh toán VietQR (`confirm-payment`) — chưa có code

---

## Câu hỏi cần bạn xác nhận

1. Base path: có đúng ý là **vẫn giữ `/`** cho tới khi có module cần versioning, hay đã tới lúc
   thêm `setGlobalPrefix('api/v1')` (theo kế hoạch cũ ghi "từ Ngày 6")?

> Đã chốt: mọi endpoint nghiệp vụ (kể cả `GET`) đều bắt buộc đăng nhập — xem mục "Auth mặc định"
> ở "Quy ước chung". Không còn là điểm cần hỏi lại.
