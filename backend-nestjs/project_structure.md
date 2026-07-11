# Hướng Dẫn Cấu Trúc Thư Mục Dự Án (NestJS Backend)

Dự án này được tổ chức theo chuẩn kiến trúc phân lớp (Layered Architecture) kết hợp với Domain-Driven Design (tách theo từng chức năng). Dưới đây là bản đồ chi tiết giúp bạn dễ dàng nắm bắt:

## 1. Các file ở gốc thư mục (`src/`)
- `main.ts`: Điểm bắt đầu (entry point) của ứng dụng. Khởi tạo server NestJS, cấu hình Swagger, Global Validation Pipe, và thiết lập múi giờ (UTC).
- `app.module.ts`: Khối hình xếp trung tâm. Nó kết nối tất cả các thành phần lại với nhau (Database, Cấu hình, và các Modules nghiệp vụ).

---

## 2. Thư mục `src/common/` (Dùng Chung Toàn Hệ Thống)
Chứa những đoạn code có thể dùng đi dùng lại ở mọi nơi mà không phụ thuộc vào một chức năng cụ thể nào.

- **`decorators/` (Đánh dấu tùy chỉnh)**
  - `roles.decorator.ts`: Tạo ra `@Roles('admin')` để bạn gắn lên API, giúp phân quyền nhanh chóng.
- **`dto/` (Định dạng dữ liệu dùng chung)**
  - `api-response.dto.ts`: Cái khuôn chuẩn cho dữ liệu trả về thành công hoặc báo lỗi chung (phân trang, lỗi 400/500).
- **`exceptions/` (Ngoại lệ)**
  - `business.exception.ts`: Lớp lỗi riêng, dùng để ném ra các lỗi nghiệp vụ (VD: `throw new BusinessException('NOT_FOUND', 404, 'Không tìm thấy')`).
- **`filters/` (Lưới lọc lỗi)**
  - `all-exceptions.filter.ts`: Trạm kiểm soát cuối cùng. Bất kỳ lỗi nào xảy ra trong app cũng rơi vào đây để chuẩn hóa thành 1 form JSON duy nhất trước khi trả về cho client.
- **`guards/` (Bảo vệ cổng)**
  - `jwt-auth.guard.ts`: Bảo vệ API, chặn ai không có Token (chưa đăng nhập).
  - `roles.guard.ts`: Kết hợp với `roles.decorator`, chặn ai không có quyền (VD: user thường không được vào API admin).
- **`interceptors/` (Can thiệp dữ liệu)**
  - `response.interceptor.ts`: Tự động bọc dữ liệu trả về của bạn vào một object `{ success: true, data: ..., timestamp: ... }` cho đồng nhất.
- **`middleware/` (Trạm trung chuyển)**
  - `request-id.middleware.ts`: Tạo 1 mã ngẫu nhiên cho mỗi request (Trace ID) để dễ dò log.
  - `http-logger.middleware.ts`: Tự động ghi lại lịch sử các request (như ai gọi, mất bao lâu, HTTP status code) vào file `app.log`.
- **`validation/` (Chuẩn hóa lỗi đầu vào)**
  - `validation-exception-factory.ts`: Gom tất cả các lỗi nhập liệu (class-validator) thành chuỗi thông báo gọn gàng kiểu `"email: không được trống"`.

---

## 3. Thư mục `src/config/` (Cấu Hình)
- `env.validation.ts`: Quy định các biến môi trường (`.env`) phải có định dạng gì. Thiếu hoặc sai định dạng là app sẽ crash không cho chạy, giúp phát hiện lỗi từ sớm.

---

## 4. Thư mục `src/database/` (Cơ Sở Dữ Liệu)
Chứa các script để tạo bảng và dữ liệu mẫu.
- `data-source.ts`: Cấu hình kết nối DB dành riêng cho công cụ chạy Migration của TypeORM.
- `000_schema.sql` / `migrations/`: Lịch sử tạo bảng.
- `seed.ts`: Sinh dữ liệu mẫu (ví dụ: tạo sẵn tài khoản admin).

---

## 5. Thư mục `src/modules/` (Các Chức Năng Nghiệp Vụ)
Đây là nơi bạn code chính! Mỗi thư mục con là một tính năng độc lập.

### 🔑 `auth/` (Xác thực)
- `auth.controller.ts`: Nơi tiếp nhận request từ ngoài vào (`POST /login`, `/refresh`, `/logout`).
- `auth.service.ts`: Xử lý logic nghiệp vụ (kiểm tra mật khẩu, tạo token).
- `dto/`: Định dạng dữ liệu đầu vào/ra của riêng phần Auth (`login.dto.ts`, `refresh-token.dto.ts`).
- `entities/`: Đại diện cho bảng trong Database (`refresh-token.entity.ts`).

### 🧑‍💼 `users/` (Tài khoản)
- `users.controller.ts`: Tiếp nhận request liên quan đến User (`GET /users/me`).
- `users.service.ts`: Các hàm CRUD thao tác với bảng Users (tìm user bằng email, tạo user...).
- `entities/user.entity.ts`: Bảng `users` trong Database.

### 🩺 `health/` (Kiểm tra sức khỏe)
- `health.controller.ts`: Chứa 1 API duy nhất `/health` để Server Ping xem ứng dụng có đang sống không.

---

## 💡 Bí Kíp Ghi Nhớ Nhanh:
1. **Muốn thêm tính năng mới (vd: Hàng hóa)?** ➡️ Tạo thư mục `modules/products/`
2. **Muốn sửa API trả về cái gì?** ➡️ Mở file `.controller.ts`
3. **Muốn sửa công thức tính toán/logic?** ➡️ Mở file `.service.ts`
4. **Muốn thêm cột vào Database?** ➡️ Sửa file `.entity.ts`
5. **Muốn bắt lỗi bắt buộc nhập?** ➡️ Sửa file `.dto.ts`
