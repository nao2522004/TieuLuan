# API Contract — Hệ thống quản lý cửa hàng tiện lợi mini

> Nguồn tham chiếu DUY NHẤT để đối chiếu hành vi giữa backend NestJS và backend FastAPI
> (Parity Principle — xem `RULESET_NestJS_FastAPI.md`). Cập nhật ngay khi code xong mỗi
> endpoint, KHÔNG để dồn tới cuối mới viết.

## Quy ước chung

- Base path: `/` (chưa versioning ở giai đoạn Ngày 1-2 — sẽ chuẩn hóa `/api/v1` khi vào Ngày 6-7 lúc thêm CRUD)
- ID: số nguyên (`bigint`), không dùng UUID
- Thời gian: ISO 8601 UTC, dạng `YYYY-MM-DDTHH:mm:ss.sssZ`
- Tiền tệ: số thô, không format dấu chấm/phẩy
- **Field JSON convention: `snake_case`** cho cả request/response body (kể cả bên NestJS, dù biến nội bộ TS dùng camelCase) — để khớp mặc định của Pydantic/FastAPI, tránh phải cấu hình alias 2 chiều ở tuần 3.
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

## POST /auth/register

- Auth: không cần
- Status: `201 Created` (tạo mới resource `user`)

**Request:**
```json
{
  "full_name": "Nguyễn Văn A",
  "email": "a@example.com",
  "password": "matkhau123"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "3",
    "full_name": "Nguyễn Văn A",
    "email": "a@example.com",
    "role": "staff",
    "is_active": true,
    "created_at": "2026-07-11T10:00:00.000Z"
  },
  "timestamp": "2026-07-11T10:00:00.000Z"
}
```

**Lỗi có thể có:**
| Case | Status | error.code | message mẫu |
|---|---|---|---|
| Email đã tồn tại | 409 | `EMAIL_EXISTS` | "Email này đã được sử dụng để đăng ký tài khoản." |
| Thiếu/sai field | 400 | `VALIDATION_ERROR` | `"email: phải là email hợp lệ, password: phải có ít nhất 6 ký tự"` |
| Gửi thừa field (VD `role`) | 400 | `VALIDATION_ERROR` | field thừa bị chặn ở tầng ValidationPipe (whitelist) |

**Lưu ý quan trọng:** client KHÔNG được truyền `role` — server luôn gán mặc định `staff` khi đăng ký (chống Mass Assignment, Mục 4 ruleset). Muốn tạo `admin` phải qua thao tác riêng của quản trị viên (chưa có ở Ngày 1-2).

---

## POST /auth/login

- Auth: không cần
- Status: `200 OK` (khai báo tường minh, KHÔNG dùng default 201 của POST)

**Request:**
```json
{ "email": "a@example.com", "password": "matkhau123" }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "3",
      "full_name": "Nguyễn Văn A",
      "email": "a@example.com",
      "role": "staff",
      "is_active": true,
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
| Sai email hoặc sai mật khẩu | 401 | `AUTH_INVALID_CREDENTIALS` | "Email hoặc mật khẩu không đúng." (KHÔNG tiết lộ field nào sai) |
| Tài khoản bị khóa (`is_active=false`) | 401 | `AUTH_ACCOUNT_DISABLED` | "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên." |
| Thiếu/sai field | 400 | `VALIDATION_ERROR` | như trên |

**Ghi chú token:**
- `access_token`: JWT, hạn `JWT_ACCESS_EXPIRATION` giây (mặc định 900s = 15 phút), payload gồm `sub` (user id), `email`, `role`.
- `refresh_token`: chuỗi random 96 hex-char, server chỉ lưu **hash SHA-256** trong bảng `refresh_tokens`, hạn `JWT_REFRESH_EXPIRATION_DAYS` ngày (mặc định 7 ngày). Endpoint `/auth/refresh` và `/auth/logout` sẽ hoàn thiện ở Ngày 3.

---

## TODO — sẽ bổ sung Ngày 3 trở đi
- `POST /auth/logout`
- `POST /auth/refresh`
- Rate limit `POST /auth/login`
- RBAC 403 cho các route admin-only
