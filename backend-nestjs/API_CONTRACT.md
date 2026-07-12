# API Contract — Hệ thống quản lý cửa hàng tiện lợi mini

> Nguồn tham chiếu DUY NHẤT để đối chiếu hành vi giữa backend NestJS và backend FastAPI
> (Parity Principle — xem `RULESET_NestJS_FastAPI.md`). Cập nhật ngay khi code xong mỗi
> endpoint, KHÔNG để dồn tới cuối mới viết.

## Quy ước chung

- Base path: `/` (sẽ chuẩn hóa `/api/v1` từ Ngày 6 khi thêm CRUD)
- ID: số nguyên (`bigint`), không dùng UUID
- Thời gian: ISO 8601 UTC, dạng `YYYY-MM-DDTHH:mm:ss.sssZ`
- Tiền tệ: số thô, không format dấu chấm/phẩy
- **Field JSON convention: `snake_case`** cho cả request/response body (kể cả bên NestJS, dù biến nội bộ TS dùng camelCase)
- Tài khoản seed sẵn để test:
  - `admin@store.local` / `Admin@123` (role `admin`)
  - `staff@store.local` / `Staff@123` (role `staff`)
- Response thành công:
  ```json
  { "success": true, "data": { }, "timestamp": "2026-07-11T10:00:00.000Z" }
  ```
- Response lỗi:
  ```json
  { "success": false, "error": { "code": "STRING", "message": "..." }, "timestamp": "...", "trace_id": "uuid" }
  ```

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

## RBAC — Phân quyền

| Endpoint | Guard | Role yêu cầu |
|---|---|---|
| `GET /users/me` | `JwtAuthGuard` | Bất kỳ role nào |
| `GET /users/admin-only-demo` | `JwtAuthGuard` + `RolesGuard` | `admin` |

**Lỗi phân quyền:**
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

## TODO — sẽ bổ sung từ Ngày 6 (CRUD)

- `GET/POST /branches`
- `GET/POST/PATCH/DELETE /products`
- `GET/POST /orders`
- `GET/POST /shifts` (open/close shift)
- `POST /returns`
- `PATCH /orders/:id/confirm-payment` (VietQR)
