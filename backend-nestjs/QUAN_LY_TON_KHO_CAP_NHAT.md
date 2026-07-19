# Thiết kế cập nhật: Quản lý Tồn kho + Chức năng bổ sung

> Tài liệu này gộp lại phần thảo luận về "tồn kho cơ bản" trước đó với các mục còn thiếu
> trong `CHUC_NANG_CAN_BO_SUNG.md` (chủ yếu Mục 2 – Stock Adjustment, Mục 3 – Stocktake).
> Mục tiêu: một module tồn kho hoàn chỉnh, đủ dùng cho cửa hàng tiện lợi, không quá nặng.

---

## Phần A — Quản lý Tồn kho (thiết kế lại)

### A.1. Ba loại biến động tồn kho

Trước đây hệ thống chỉ xử lý `type='IN'` (nhập hàng). Cần bổ sung để đủ 3 loại:

| Loại | Khi nào xảy ra | Ai thực hiện | Ảnh hưởng tồn kho |
|---|---|---|---|
| **IN** (nhập) | Nhận hàng từ nhà cung cấp | Nhân viên/ca trưởng | `stock_quantity += qty` |
| **OUT — bán hàng** | Khách mua qua POS | Tự động khi tạo order | `stock_quantity -= qty` (đã có sẵn) |
| **OUT — hao hụt/hủy** | Hàng hỏng, hết hạn, thất thoát | Ca trưởng/quản lý | `stock_quantity -= qty`, **bắt buộc ghi `reason`** |
| **ADJUST — kiểm kê** | Đối soát tồn kho định kỳ | Quản lý mở phiên kiểm kê | Tự động `+`/`-` theo chênh lệch đếm tay vs hệ thống |

### A.2. Bảng dữ liệu liên quan

```sql
-- inventory_transactions: đã có, mở rộng cách dùng
-- type IN ('IN', 'OUT') -- giữ nguyên constraint, phân biệt lý do bằng cột reason + source
ALTER TABLE inventory_transactions
    ADD COLUMN reason VARCHAR(255),          -- bắt buộc khi type='OUT' và source='ADJUSTMENT'
    ADD COLUMN source  VARCHAR(20) NOT NULL DEFAULT 'ORDER'; -- 'ORDER' | 'INBOUND' | 'ADJUSTMENT' | 'STOCKTAKE'
```

```sql
-- Kiểm kê kho (theo đề xuất Mục 3 của bạn bạn)
CREATE TABLE stocktakes (
    id           BIGSERIAL PRIMARY KEY,
    branch_id    BIGINT      NOT NULL REFERENCES branches(id),
    created_by   BIGINT      NOT NULL REFERENCES users(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open' / 'closed'
    note         VARCHAR(255),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at    TIMESTAMPTZ
);

CREATE TABLE stocktake_items (
    id                BIGSERIAL PRIMARY KEY,
    stocktake_id      BIGINT  NOT NULL REFERENCES stocktakes(id),
    product_id        BIGINT  NOT NULL REFERENCES products(id),
    system_quantity   INTEGER NOT NULL, -- tồn kho hệ thống tại thời điểm kiểm
    counted_quantity  INTEGER NOT NULL, -- số đếm thực tế
    difference        INTEGER NOT NULL  -- counted - system
);
```

### A.3. API cần có

| # | Endpoint | Mô tả |
|---|---|---|
| A1 | `POST /inventory/inbound` | Nhập hàng (đã có, giữ nguyên) |
| A2 | `POST /inventory/adjustments` | Ghi nhận hao hụt/hủy hàng — bắt buộc `product_id`, `quantity`, `reason` |
| A3 | `GET /inventory/transactions` | Lịch sử biến động, lọc theo `product_id` / `type` / `source` / khoảng thời gian |
| A4 | `POST /stocktakes` | Mở phiên kiểm kê cho 1 chi nhánh |
| A5 | `POST /stocktakes/:id/items` | Nhập số đếm thực tế từng sản phẩm |
| A6 | `PATCH /stocktakes/:id/close` | Chốt kiểm kê → tự tính chênh lệch, cập nhật `stock_quantity`, ghi `inventory_transactions` (trong 1 DB transaction) |
| A7 | `GET /stocktakes/:id` | Xem kết quả kiểm kê |
| A8 | `GET /products/low-stock` | Danh sách sản phẩm dưới ngưỡng tối thiểu |
| A9 | `GET /products/expiring-soon` | Danh sách sản phẩm sắp hết hạn (nếu có cột `expiry_date`) |

### A.4. Quy tắc nghiệp vụ quan trọng

1. **Chặn tồn kho âm ở tầng Service**, không để DB constraint (`chk_products_stock`) ném lỗi 500 — trả lỗi 400 rõ ràng: *"Không đủ tồn kho để thực hiện thao tác."*
2. **`reason` bắt buộc** với mọi giao dịch `OUT` loại `ADJUSTMENT` — để sau này báo cáo thất thoát biết vì sao (hỏng/hết hạn/mất).
3. Dùng lại **row-lock pattern** đã có ở `createInboundTransaction()` cho cả `adjustments` và `stocktake close`, tránh race condition khi 2 người thao tác cùng sản phẩm.
4. Kiểm kê (`stocktake`) không sửa trực tiếp `stock_quantity` theo từng dòng — chỉ áp dụng **khi đóng phiên** (`PATCH /stocktakes/:id/close`), để tránh tồn kho bị thay đổi giữa chừng khi đang đếm dở.

### A.5. Luồng dùng thực tế

- **Hằng ngày:** nhập hàng (IN) khi xe giao tới; hủy hàng (OUT-ADJUSTMENT) khi phát hiện hộp sữa hỏng, ghi lý do "hết hạn" hoặc "vỡ bao bì".
- **Định kỳ (tuần/tháng):** quản lý mở phiên kiểm kê, nhân viên đếm tay từng mặt hàng, nhập vào hệ thống. Đóng phiên → hệ thống tự đối chiếu, ra danh sách chênh lệch (thiếu/thừa) → đây là số liệu để phát hiện thất thoát.
- **Dashboard hằng ngày:** cảnh báo sản phẩm sắp hết hàng hoặc sắp hết hạn, giúp quyết định nhập thêm hoặc giảm giá xả hàng.

---

## Phần B — Các nhóm chức năng còn thiếu khác (tóm tắt để lên kế hoạch)

Ngoài tồn kho, các mục sau trong `CHUC_NANG_CAN_BO_SUNG.md` vẫn cần làm. Tóm tắt độ ưu tiên:

| Ưu tiên | Nhóm | Việc chính | Ghi chú |
|---|---|---|---|
| 🔴 Cao | **Quản lý nhân sự** | `POST/GET/PATCH/DELETE /users`, đổi mật khẩu, reset mật khẩu | Hiện chưa có cách tạo/quản lý user qua API — cần làm trước vì mọi chức năng khác (ca làm, đơn hàng) đều gắn với `user_id` |
| 🔴 Cao | **Stock Adjustment** | Xem Phần A.2–A.3 ở trên | |
| 🔴 Cao | **Stocktake** | Xem Phần A.2–A.3 ở trên | |
| 🟡 T.bình | **Đơn hàng — mở rộng** | Lọc theo thời gian/nhân viên; **lưu snapshot tên sản phẩm** vào `order_items` | Quan trọng để hóa đơn cũ không bị sai khi sản phẩm đổi tên/xóa |
| 🟢 Thấp | **Báo cáo mở rộng** | Báo cáo thất thoát (từ Adjustment + chênh lệch ca), báo cáo theo ca/nhân viên, sản phẩm bán chạy | Phụ thuộc Mục nhân sự + tồn kho hoàn thành trước |
| 🟢 Thấp | **Khuyến mãi** | Entity `Promotion` + logic tự tính giảm giá | Có thể bỏ qua, giữ giảm giá thủ công như hiện tại |

### Liên kết với chức năng "Ca làm" đã có

Vì bạn đã có mở ca/đóng ca + tiền mặt, khi Mục **Stock Adjustment** và **Báo cáo thất thoát** hoàn thành, có thể gộp thêm vào **PDF báo cáo đóng ca**:
- Số lượng/giá trị hàng hủy trong ca (nếu ca trưởng có hủy hàng trong ca đó)
- Từ đó báo cáo đóng ca không chỉ đối soát **tiền mặt** mà còn phản ánh được **thất thoát hàng hóa** trong ca — bức tranh đầy đủ hơn cho chủ cửa hàng.

---

## Thứ tự triển khai đề xuất

1. **Quản lý nhân sự** (Mục 1) — nền tảng cho mọi thứ khác
2. **Tồn kho: Stock Adjustment** (Phần A.2–A.3, mục 2.x) — đơn giản, hạ tầng đã có sẵn
3. **Đơn hàng: snapshot tên sản phẩm + lọc** (Mục 4.1–4.3) — ảnh hưởng tính đúng của báo cáo/hóa đơn
4. **Tồn kho: Stocktake** (Phần A.2–A.3, mục 3.x) — cần thiết kế schema mới, nền tảng cho báo cáo thất thoát
5. **Báo cáo mở rộng** (Mục 5) — sau khi có đủ dữ liệu từ bước 2 và 4
6. **Khuyến mãi** (Mục 6) — tùy chọn, làm sau cùng nếu còn thời gian
