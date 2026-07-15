# Tổng hợp chức năng cần bổ sung — Backend NestJS

> Đối chiếu giữa 13 nhóm chức năng đã thống nhất và code thực tế trong `backend-nestjs/`.
> Ưu tiên: 🔴 Cao (ảnh hưởng vận hành cốt lõi) · 🟡 Trung bình · 🟢 Thấp (mở rộng, có thể làm sau)

---

## 1. 🔴 Quản lý nhân sự (Users/Employees)

**Hiện trạng:** `UsersModule` chỉ phục vụ nội bộ cho Auth (JWT guard), chưa có tầng quản trị.

- `users.controller.ts` chỉ có `GET /users/me` và `GET /users/admin-only-demo` (route demo, README ghi rõ cần xóa khi có endpoint admin-only thật).
- `users.service.ts` có sẵn `create()` nhưng **không có controller nào gọi tới**.
- `User` entity đã có đủ field (`branchId`, `role`, `isActive`, `deletedAt`) nhưng chưa được khai thác qua API.
- README mô tả `POST /auth/register` nhưng **route này không tồn tại** trong `auth.controller.ts` → tài liệu và code đang lệch nhau.

### Việc cần làm
| # | Endpoint | Mô tả | Ghi chú |
|---|---|---|---|
| 1.1 | `POST /users` | Admin tạo tài khoản nhân viên mới (thay thế/khôi phục `/auth/register`) | Chống Mass Assignment — chỉ nhận `full_name`, `email`, `password`, `branch_id`, `role` |
| 1.2 | `GET /users` | Danh sách nhân viên, phân trang, lọc theo `branch_id` / `role` / `is_active` | Chỉ admin |
| 1.3 | `GET /users/:id` | Chi tiết 1 nhân viên (khác với `/me`) | Chỉ admin |
| 1.4 | `PATCH /users/:id` | Sửa thông tin: tên, chi nhánh, role, khóa/mở khóa (`is_active`) | Chỉ admin, không cho tự đổi role của chính mình |
| 1.5 | `DELETE /users/:id` | Soft-delete nhân viên (set `deleted_at`) | Chỉ admin, chặn xóa nếu đang có ca làm việc mở |
| 1.6 | `PATCH /users/me/password` | Đổi mật khẩu (self-service, yêu cầu mật khẩu cũ) | Tất cả user đã đăng nhập |
| 1.7 | `PATCH /users/:id/reset-password` | Admin reset mật khẩu cho nhân viên (quên mật khẩu) | Chỉ admin |

**Lưu ý bảo mật:** khi khóa tài khoản (`is_active=false`), cần đồng thời revoke toàn bộ `refresh_tokens` còn hiệu lực của user đó (set `revoked_at`), tránh nhân viên đã bị khóa vẫn refresh được access token mới.

---

## 2. 🔴 Xuất kho hao hụt / Hủy hàng (Stock Adjustment)

**Hiện trạng:** Schema đã chừa sẵn (`chk_inventory_tx_type CHECK (type IN ('IN', 'OUT'))`) nhưng service chỉ xử lý `type='IN'`.

### Việc cần làm
| # | Endpoint | Mô tả |
|---|---|---|
| 2.1 | `POST /inventory/adjustments` (hoặc mở rộng `POST /inventory/transactions` nhận thêm `type`) | Ghi nhận `type='OUT'`: hàng hỏng/hết hạn/thất thoát, trừ thẳng `stock_quantity` |
| 2.2 | — | Bắt buộc có `reason` (lý do), tái sử dụng row-lock pattern giống `createInboundTransaction()` |
| 2.3 | — | Chặn trừ kho xuống âm (đã có `chk_products_stock CHECK (stock_quantity >= 0)` ở DB, nhưng nên validate sớm ở Service để trả lỗi rõ ràng thay vì để DB constraint ném lỗi 500 |

---

## 3. 🔴 Kiểm kê kho (Stocktake)

**Hiện trạng:** Chưa có bảng, entity, module nào — cần thiết kế mới hoàn toàn.

### Schema đề xuất bổ sung vào `000_schema.sql`
```sql
CREATE TABLE stocktakes (
    id              BIGSERIAL PRIMARY KEY,
    branch_id       BIGINT          NOT NULL REFERENCES branches(id),
    created_by      BIGINT          NOT NULL REFERENCES users(id),
    status          VARCHAR(20)     NOT NULL DEFAULT 'open', -- 'open' / 'closed'
    note            VARCHAR(255),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    closed_at       TIMESTAMPTZ
);

CREATE TABLE stocktake_items (
    id                  BIGSERIAL PRIMARY KEY,
    stocktake_id        BIGINT      NOT NULL REFERENCES stocktakes(id),
    product_id          BIGINT      NOT NULL REFERENCES products(id),
    system_quantity     INTEGER     NOT NULL, -- tồn kho hệ thống tại thời điểm kiểm
    counted_quantity    INTEGER     NOT NULL, -- số đếm thực tế
    difference          INTEGER     NOT NULL  -- counted - system (âm = thiếu, dương = thừa)
);
```

### Việc cần làm
| # | Endpoint | Mô tả |
|---|---|---|
| 3.1 | `POST /stocktakes` | Mở phiên kiểm kê mới cho 1 chi nhánh |
| 3.2 | `POST /stocktakes/:id/items` | Nhập số đếm thực tế từng sản phẩm |
| 3.3 | `PATCH /stocktakes/:id/close` | Chốt kiểm kê → tự động cập nhật `stock_quantity` theo chênh lệch, ghi `inventory_transactions` (`IN`/`OUT` tương ứng) trong 1 transaction |
| 3.4 | `GET /stocktakes/:id` | Xem kết quả kiểm kê (chênh lệch từng sản phẩm) |

---

## 4. 🟡 Quản lý đơn hàng — mở rộng

**Hiện trạng:** Đã có tạo/list/chi tiết/hủy/xác nhận thanh toán, nhưng còn thiếu vài phần vận hành thực tế.

| # | Việc cần làm | Vị trí | Ghi chú |
|---|---|---|---|
| 4.1 | Lọc đơn theo khoảng thời gian | `QueryOrderDto` | Thêm `from_date` / `to_date`, join theo `created_at` |
| 4.2 | Lọc đơn theo nhân viên tạo | `QueryOrderDto` | Thêm `created_by`, cột đã có sẵn ở DB |
| 4.3 | Lưu snapshot tên sản phẩm tại thời điểm bán | `OrderItem` entity + `order_items` table | Thêm cột `product_name VARCHAR(200)`. Hiện tại nếu sản phẩm bị đổi tên/soft-delete, hóa đơn cũ hiển thị sai hoặc phải join ngược — vi phạm nguyên tắc "hóa đơn cũ không bị ảnh hưởng" ở Mục 9 ruleset |
| 4.4 | Sửa đơn hàng một phần (thêm/bớt dòng trước khi hoàn tất) | Mới | Cân nhắc mức độ cần thiết — có thể bỏ qua nếu quy trình bán hàng luôn "chốt 1 lần" |
| 4.5 | Đơn hàng tạm giữ (draft/held) | Mới | Khách chưa thanh toán ngay, giữ giỏ hàng — có thể bỏ qua ở bản tối giản |

---

## 5. 🟢 Báo cáo & Phân tích — mở rộng

**Hiện trạng:** Đã có `GET /reports/revenue` (tính đúng, không lọc `deleted_at`).

| # | Việc cần làm | Phụ thuộc |
|---|---|---|
| 5.1 | Báo cáo thất thoát (tổng hợp từ Stock Adjustment + chênh lệch tiền két từ Shifts) | Cần hoàn thành Mục 2 và 3 trước |
| 5.2 | Báo cáo theo ca / theo nhân viên | Thêm `shift_id` / `created_by` filter vào `ReportsService.revenue()` |
| 5.3 | Sản phẩm bán chạy / tồn lâu | Query group-by `product_id` từ `order_items`, kết hợp `products.created_at`/ngày bán cuối |

---

## 6. 🟢 Khuyến mãi cơ bản (Promotions) — tùy chọn

**Hiện trạng:** `CreateOrderDto.discount_amount` chỉ là số tiền giảm nhập tay theo từng đơn, chưa phải cơ chế khuyến mãi thật sự.

| # | Việc cần làm |
|---|---|
| 6.1 | Entity `Promotion` (tên, loại giảm % hoặc số tiền cố định, áp dụng theo sản phẩm/category, thời gian hiệu lực) |
| 6.2 | Logic tự tính giảm giá khi thêm sản phẩm vào đơn, thay vì admin/staff tự nhập `discount_amount` |

> Có thể **bỏ qua nếu chấp nhận mức tối giản hiện tại** (giảm giá thủ công theo từng đơn) — không bắt buộc theo phạm vi đồ án đã chốt.

---

## 7. 🟢 Dọn dẹp kỹ thuật (không phải chức năng mới, nhưng nên xử lý)

| # | Vấn đề | Đề xuất |
|---|---|---|
| 7.1 | `vietqr.util.ts` sinh QR chuẩn EMVCo từ `bank_bin`/`bank_account_no` nhưng **không được `OrdersService` gọi tới** — luồng thực tế đang dùng ZaloPay | Xác nhận đây là code dự phòng hay code thừa, cập nhật lại `API_CONTRACT.md` cho khớp thực tế |
| 7.2 | README mô tả `POST /auth/register` nhưng route không tồn tại | Đồng bộ lại README sau khi hoàn thành Mục 1 (User Management) |

---

## Bảng ưu tiên tổng hợp

| Thứ tự | Nhóm chức năng | Độ phức tạp | Lý do ưu tiên |
|---|---|---|---|
| 1 | Quản lý nhân sự (Mục 1) | Trung bình | Vận hành cốt lõi — hiện không có cách nào tạo/quản lý user qua API |
| 2 | Stock Adjustment (Mục 2) | Thấp | Hạ tầng row-lock đã có sẵn, chỉ cần thêm method + endpoint |
| 3 | Order Management mở rộng (Mục 4.1–4.3) | Thấp–Trung bình | Ảnh hưởng trực tiếp tính đúng đắn của báo cáo & hóa đơn lịch sử |
| 4 | Stocktake (Mục 3) | Trung bình–Cao | Cần thiết kế schema mới, nhưng là nền tảng cho báo cáo thất thoát |
| 5 | Báo cáo mở rộng (Mục 5) | Trung bình | Phụ thuộc dữ liệu từ Mục 2, 3 |
| 6 | Promotions (Mục 6) | Cao | Tùy chọn, không bắt buộc |
