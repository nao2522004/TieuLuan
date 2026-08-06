# ACTIVITY DIAGRAMS – BACKEND NESTJS (TRẮNG ĐEN MONOCHROME, FONT CHỮ 40PX TO RÕ, TỐI ƯU KHỔ A4 WORD)

> **Ghi chú định dạng**:
> 1. **Kích thước chữ 40px (`DefaultFontSize 40`, `ActivityFontSize 40`, `ArrowFontSize 32`)**: Chữ siêu to, nét đậm, hiển thị rõ ràng ngay cả khi in ấn trên Word.
> 2. **Sắp xếp gọn gàng các nhóm activity**: Nhóm hợp lý các thao tác chuẩn bị liên tiếp (4.1 -> 4.3, 4.4 -> 4.5) để chiều cao sơ đồ vừa vặn, không bị kéo quá dài làm mờ chữ.
> 3. **Phong cách Trắng - Đen (Monochrome)**: Thuần trắng đen 100% không màu sắc.
> 4. **Tối ưu khổ A4 Word (Lề trái 3.4cm, Lề phải 2.0cm)**: Ngắt dòng ngắn bằng `\n`.
> 5. **Rà soát 100% từng bước theo đặc tả Use Case cập nhật**: Đầy đủ các bước và các trường hợp ngoại lệ.

---

## UC-04: BÁN HÀNG POS (FEFO & THANH TOÁN ZALOPAY)

```plantuml
@startuml UC04_BanHangPOS_NestJS
title UC-04: Bán hàng POS & Trừ kho FEFO (Backend NestJS)

scale 1.0
skinparam monochrome true
skinparam DefaultFontSize 40
skinparam ActivityFontSize 40
skinparam ActivityPadding 14
skinparam ActivityMargin 12
skinparam ActivityBorderThickness 2
skinparam ActivityMaxLineWidth 240
skinparam ArrowFontSize 32
skinparam ConditionFontSize 32

|Client (ReactJS SPA)|
start
:4.1 -> 4.3. Chọn giỏ hàng, tự động áp giá\nExpiry Pricing FEFO & nhập coupon nếu có;
:4.4 -> 4.5. Chọn hình thức thanh toán\n& Nhấn "Thanh toán & Hoàn tất";
:4.6. Client gửi POST /orders\n(items, payment_method, promotion/discount);

|Backend (NestJS)|
:4.7. Backend xử lý giao dịch;
:4.7.1. Bắt đầu Transaction CSDL\ndataSource.transaction()\n& Check ca mở ShiftsService.requireActiveShift();

if (Ca làm việc mở & hợp lệ?) then (Không)
  :4.E2. Trả về 400 Bad Request (SHIFT_REQUIRED)\nhoặc 403 Forbidden (SHIFT_USER_NOT_ASSIGNED);
  |Client (ReactJS SPA)|
  :4.E2.3. Hiển thị Modal yêu cầu mở ca;
  stop
else (Có)
endif

|Backend (NestJS)|
:4.7.2. Khóa dòng Sản phẩm & Lô hàng FEFO\nBatchConsumptionService.consumeFefo()\n(pessimistic_write / FOR UPDATE);

if (Tổng số tồn kho các lô đủ xuất?) then (Không)
  :4.E1. Rollback Transaction CSDL\n→ Trả về 409 Conflict (INVENTORY_INSUFFICIENT);
  |Client (ReactJS SPA)|
  :4.E1.4. Hiển thị lỗi "Sản phẩm X không đủ tồn kho";
  stop
else (Có)
endif

|Backend (NestJS)|
:4.7.3. Trừ kho lô FEFO, tính Expiry Pricing,\ntạo Order (completed) & OrderItemBatch;

if (Phương thức thanh toán?) then (Tiền mặt / Thẻ)
  :payment_status = 'paid';
else (Chuyển khoản / ZaloPay)
  :payment_status = 'pending';
endif

:Commit Transaction CSDL & Xóa Cache Redis;

if (Phương thức thanh toán là ZaloPay?) then (Có)
  :4.7.4. Gọi ZaloPay API createOrder\n(Ký HMAC-SHA256 qua @nestjs/axios);
  if (Gọi ZaloPay API thành công?) then (Không)
    :4.E3. Mở Transaction bù trừ:\nrestoreExactBatches(), order.status = 'cancelled',\nevict Redis cache & ném lỗi 500 (ZALOPAY_CREATE_ERROR);
    |Client (ReactJS SPA)|
    :Hiển thị lỗi tạo giao dịch ZaloPay;
    stop
  else (Có)
    :Tạo mã QR động (QR content & Base64 image);
  endif
else (Không - Cash/Card)
endif

|Client (ReactJS SPA)|
if (Phương thức thanh toán?) then (Tiền mặt / Thẻ)
  :4.8.1. Hiển thị "Thanh toán thành công",\nIn hóa đơn – Làm sạch giỏ hàng;
else (ZaloPay)
  :4.8.2. Hiển thị Modal QR ZaloPay\n& Polling / Lắng nghe Webhook;
endif

stop
@enduml
```

---

## UC-05: HỦY ĐƠN HÀNG (PENDING)

```plantuml
@startuml UC05_HuyDonHang_NestJS
title UC-05: Hủy đơn hàng PENDING & Hoàn kho FEFO (Backend NestJS)

scale 1.0
skinparam monochrome true
skinparam DefaultFontSize 40
skinparam ActivityFontSize 40
skinparam ActivityPadding 14
skinparam ActivityMargin 12
skinparam ActivityBorderThickness 2
skinparam ActivityMaxLineWidth 240
skinparam ArrowFontSize 32
skinparam ConditionFontSize 32

|Client (ReactJS SPA)|
start
:5.1 -> 5.2. Thu ngân chọn đơn PENDING\n& Nhấn nút "Hủy đơn hàng";
:5.3. Client gửi PATCH /orders/{id}/cancel;

|Backend (NestJS)|
:5.4.1. Check ca làm việc chi nhánh\n& Truy vấn đơn hàng theo ID;

if (Đơn đã thanh toán (payment_status == 'paid')?) then (Có)
  :5.E1. Trả về 400 Bad Request\n(ORDER_ALREADY_PAID_CANNOT_CANCEL);
  |Client (ReactJS SPA)|
  :Hiển thị lỗi: "Không thể hủy\nđơn đã thanh toán, dùng Trả hàng";
  stop
else (Chưa paid)
endif

|Backend (NestJS)|
if (Đơn đã hủy từ trước (status == 'cancelled')?) then (Có)
  :5.E2. Trả về 409 Conflict\n(ORDER_ALREADY_CANCELLED);
  |Client (ReactJS SPA)|
  :Hiển thị lỗi: "Đơn hàng đã được hủy trước đó";
  stop
else (Chưa hủy)
endif

|Backend (NestJS)|
if (5.4.2. Quyền (Admin hoặc chính người tạo)?) then (Không)
  :5.E3. Trả về 403 Forbidden (FORBIDDEN);
  |Client (ReactJS SPA)|
  :Hiển thị lỗi: "Bạn không có quyền hủy đơn này";
  stop
else (Hợp lệ)
endif

if (5.4.3. Đơn ZaloPay & có zalopayAppTransId?) then (Có)
  :Gọi ZaloPay Gateway cancelOrder API;
else (Không)
endif

|Backend (NestJS)|
:5.4.4 -> 5.4.6. Transaction CSDL, lock order,\nhoàn quantity_taken về lô gốc & cộng tồn SP,\ncập nhật orders.status = 'cancelled';
:5.4.7. Commit Transaction CSDL & Evict Redis;

|Client (ReactJS SPA)|
:5.5. Hiển thị thông báo "Hủy đơn hàng thành công";

stop
@enduml
```

---

## UC-06: XỬ LÝ TRẢ HÀNG VÀ HOÀN TIỀN

```plantuml
@startuml UC06_TraHang_NestJS
title UC-06: Xử lý trả hàng và hoàn tiền (Backend NestJS)

scale 1.0
skinparam monochrome true
skinparam DefaultFontSize 40
skinparam ActivityFontSize 40
skinparam ActivityPadding 14
skinparam ActivityMargin 12
skinparam ActivityBorderThickness 2
skinparam ActivityMaxLineWidth 240
skinparam ArrowFontSize 32
skinparam ConditionFontSize 32

|Client (ReactJS SPA)|
start
:6.1 -> 6.3. Nhập mã đơn gốc (Order ID),\nchọn SP trả, nhập số lượng & lý do;
:6.4. Tự động tính tiền hoàn =\nquantity_trả * unit_price snapshot;
:6.5. Nhấn "Xác nhận trả hàng & Hoàn tiền";
:6.6. Client gửi POST /returns\n(order_item_id, quantity, reason);

|Backend (NestJS)|
:6.7. Transaction CSDL, lock order_item\n(pessimistic_write);

if (6.E2. Đơn hàng gốc đã bị hủy?) then (Có)
  :Rollback Transaction → Trả về 400\n(ORDER_ALREADY_CANCELLED);
  |Client (ReactJS SPA)|
  :Thông báo đơn hàng đã bị hủy;
  stop
else (Hợp lệ)
endif

|Backend (NestJS)|
:Check ca mở, phân quyền (Admin / Cùng branch)\n& Check số lượng xin trả <= remaining;

if (Số lượng xin trả <= remaining?) then (Không)
  :6.E1. Rollback Transaction → Trả về 400\n(RETURN_QUANTITY_EXCEEDS);
  |Client (ReactJS SPA)|
  :6.E1.3. Báo lỗi: "Số lượng trả vượt quá còn lại";
  stop
else (Hợp lệ)
endif

|Backend (NestJS)|
:Tạo bản ghi returns, hoàn trả số lượng\nvề đúng lô gốc & cộng lại tồn kho SP;
:Commit Transaction CSDL & Evict Redis cache;

|Client (ReactJS SPA)|
:6.8. Client nhận phản hồi thành công,\nHiển thị "Trả hàng thành công" & In phiếu hoàn tiền;

stop
@enduml
```

---

## UC-07.2: ĐÓNG CA LÀM VIỆC VÀ ĐỐI SOÁT QUỸ

```plantuml
@startuml UC072_DongCa_NestJS
title UC-07.2: Đóng ca làm việc và đối soát quỹ (Backend NestJS)

scale 1.0
skinparam monochrome true
skinparam DefaultFontSize 40
skinparam ActivityFontSize 40
skinparam ActivityPadding 14
skinparam ActivityMargin 12
skinparam ActivityBorderThickness 2
skinparam ActivityMaxLineWidth 240
skinparam ArrowFontSize 32
skinparam ConditionFontSize 32

|Client (ReactJS SPA)|
start
:7.2.1 -> 7.2.5. Đếm tiền két thực tế,\nnhập closing_cash, note & Nhấn "Chốt ca";
:7.2.6. Client gửi PATCH /shifts/{id}/close\n(closing_cash, note);

|Backend (NestJS)|
:7.2.7.1. Lock Shift (pessimistic_write),\nCheck quyền (Admin/Chủ ca) & ca đang mở;

if (Quyền hợp lệ (Admin / Chủ ca)?) then (Không)
  :Trả về 403 Forbidden;
  |Client (ReactJS SPA)|
  :Báo lỗi không có quyền đóng ca;
  stop
else (Hợp lệ)
endif

|Backend (NestJS)|
if (Ca đang mở (closed_at IS NULL)?) then (Không)
  :Trả về 409 Conflict (SHIFT_ALREADY_CLOSED);
  |Client (ReactJS SPA)|
  :Báo lỗi ca làm việc đã đóng từ trước;
  stop
else (Đang mở)
endif

|Backend (NestJS)|
:7.2.7.2 -> 7.2.7.4. Tính doanh thu tiền mặt,\ntiền hoàn tiền mặt, expected_cash\n& cash_difference = closing - expected;
:Cập nhật shifts.closing_cash, expected_cash,\nclosed_at = NOW() & Trả về báo cáo đóng ca;

|Client (ReactJS SPA)|
:7.2.8. Hiển thị Phụ lục đối soát ca\n& Số tiền chênh lệch (7.2.E1 nếu có);

stop
@enduml
```

---

## UC-13.1: KIỂM KÊ KHO VÀ TỰ ĐỘNG ĐIỀU CHỈNH TỒN KHO

```plantuml
@startuml UC131_KiemKeKho_NestJS
title UC-13.1: Kiểm kê kho & Điều chỉnh tồn kho (Backend NestJS)

scale 1.0
skinparam monochrome true
skinparam DefaultFontSize 40
skinparam ActivityFontSize 40
skinparam ActivityPadding 14
skinparam ActivityMargin 12
skinparam ActivityBorderThickness 2
skinparam ActivityMaxLineWidth 240
skinparam ArrowFontSize 32
skinparam ConditionFontSize 32

|Client (ReactJS SPA)|
start
:13.1.1 -> 13.1.5. Tạo phiên kiểm kê, nhập số đếm\ntừng SP (kèm batch_counts) & Nhấn "Chốt kiểm kê";
:13.1.6. Client gửi PATCH /stocktakes/{id}/close;

|Backend (NestJS)|
:13.1.7. Transaction CSDL, Lock Stocktake\n(pessimistic_write);

if (13.1.E1. Phiên kiểm kê đang mở (status == 'open')?) then (Không)
  :Trả về 400 Bad Request (STOCKTAKE_CLOSED);
  |Client (ReactJS SPA)|
  :Báo lỗi "Phiên kiểm kê đã đóng";
  stop
else (Đang mở)
endif

|Backend (NestJS)|
if (13.1.E2. Quyền chi nhánh (Admin / Cùng branch_id)?) then (Không)
  :Trả về 403 Forbidden;
  |Client (ReactJS SPA)|
  :Báo lỗi không có quyền chốt phiên;
  stop
else (Hợp lệ)
endif

|Backend (NestJS)|
:13.1.7.1. Duyệt từng dòng SP: Lock Product\n(pessimistic_write);

if (Sản phẩm đã bị xóa mềm (deletedAt IS NOT NULL)?) then (Có)
  :13.1.7.3. Bỏ qua điều chỉnh dòng này\n& Đẩy vào danh sách skipped_items;
else (Bình thường)
  if (Chênh lệch difference != 0?) then (Có)
    :13.1.7.2. Điều chỉnh tồn kho theo batch_counts\nhoặc FEFO/lô mới, ghi InventoryTransaction;
  else (Khớp 0)
  endif
endif

:13.1.7.4. Cập nhật stocktakes.status = 'closed'\n& Commit Transaction CSDL, Evict Redis;

|Client (ReactJS SPA)|
:13.1.8. Thông báo "Hoàn tất kiểm kê kho thành công"\n& Hiển thị skipped_items (nếu có);

stop
@enduml
```
