# backend-nestjs — Ngày 1-2

Setup hạ tầng + Đăng ký/Đăng nhập, theo `RULESET_NestJS_FastAPI.md` và `schema.sql` dùng chung.

## Cách chạy

```bash
# 1. Cài dependency
npm install

# 2. Copy env mẫu, tự chỉnh secret nếu cần
cp .env.example .env

# 3. Bật Postgres + Redis (Mục 8 ruleset)
# Postgres đang chạy chế độ trust (không cần mật khẩu) - chỉ dùng cho local dev, KHÔNG dùng cho production
docker compose up -d db_nestjs redis_nestjs

# 4. Chạy migration (schema.sql + bảng refresh_tokens)
npm run migration:run

# 5. Seed 1 admin + 1 staff + category
npm run seed

# 6. Chạy app (dev, watch mode)
npm run start:dev
```

## Kiểm tra DoD Ngày 1

```bash
curl -i http://localhost:3000/health
# -> 200, body: {"success":true,"data":{"status":"ok",...},"timestamp":"..."}
```

## Kiểm tra DoD Ngày 2

```bash
# Đăng ký
curl -i -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Test User","email":"test@example.com","password":"matkhau123"}'
# -> 201

# Login sai mật khẩu -> đúng error code
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"sai_mat_khau"}'
# -> 401, error.code = "AUTH_INVALID_CREDENTIALS"

# Login đúng -> 200 + access_token/refresh_token
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"matkhau123"}'
# -> 200

# Thử Mass Assignment - gửi thừa field "role"
curl -i -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Hacker","email":"hacker@example.com","password":"matkhau123","role":"admin"}'
# -> 400 VALIDATION_ERROR (field "role" không nằm trong whitelist DTO)
```

## Chạy toàn bộ bằng Docker (thay vì npm cục bộ)

```bash
docker compose up --build
# Lưu ý: cần tự chạy migration + seed 1 lần bên trong container hoặc từ máy host
# trỏ DB_HOST=localhost, DB_PORT=5433 (đã map ra ngoài) rồi chạy npm run migration:run / npm run seed
```

## Tài khoản seed sẵn

| Email | Mật khẩu | Role |
|---|---|---|
| admin@store.local | Admin@123 | admin |
| staff@store.local | Staff@123 | staff |

## Cấu trúc thư mục (Mục 2 ruleset)

```
src/
 ├── common/         # filter/interceptor/exception/validation dùng chung
 ├── config/          # validate biến môi trường
 ├── database/         # data-source (CLI), migrations, seed
 ├── modules/
 │    ├── health/
 │    ├── users/
 │    └── auth/
 ├── app.module.ts
 └── main.ts
```

Xem chi tiết request/response mẫu tại `API_CONTRACT.md` (bắt đầu ghi từ Ngày 2, sẽ dùng để áp
sang FastAPI ở tuần 3).
