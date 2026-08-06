# Đặc tả Use Case (đã cập nhật khớp code)

## Bảng 5. Đặc tả usecase bán hàng và thanh toán tại quầy POS

| Trường             | Nội dung                                                                                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mã usecase**     | 4                                                                                                                                                                                                                                            |
| **Tên usecase**    | Thực hiện bán hàng và thanh toán tại quầy POS                                                                                                                                                                                                |
| **Actor**          | Admin, leader, cashier                                                                                                                                                                                                                       |
| **Mô tả**          | Xử lý luồng tạo đơn hàng tại quầy bán hàng, bao gồm quét mã vạch, tự động áp giá cận date (Expiry Pricing), tính khuyến mãi, trừ kho theo thuật toán FEFO với khóa giao dịch chống race-condition, và thanh toán (Tiền mặt / Thẻ / ZaloPay). |
| **Tiền điều kiện** | Trưởng ca hoặc admin mở ca cho chi nhánh (`Shift.closed_at IS NULL`); thu ngân được phân công trong ca đó (hoặc là chính người mở ca, hoặc là admin).                                                                                        |
| **Hậu điều kiện**  | Đơn hàng được tạo thành công (`status = 'completed'`), kho hàng được tự động trừ đúng lô theo FEFO, hóa đơn được trả về Client.                                                                                                              |

**Luồng sự kiện chính**

- **4.1.** Thu ngân thực hiện quét mã vạch (Barcode Scanner) hoặc chọn sản phẩm từ màn hình POS để đưa vào giỏ hàng:
  - **4.1.1.** Hệ thống tự động xác định đơn giá sản phẩm (`sale_price`).
  - **4.1.2.** Hệ thống tự động phát hiện và áp dụng giá cận hạn (Expiry Pricing) theo từng lô hàng được bốc (FEFO), tính bình quân gia quyền ra đơn giá cuối cùng của dòng hàng.
- **4.2.** Thu ngân điều chỉnh số lượng từng mặt hàng trong giỏ hàng.
- **4.3.** _(Tùy chọn)_ Thu ngân nhập mã giảm giá (Coupon) nếu khách hàng yêu cầu. Không được nhập đồng thời cả `discount_amount` thủ công và `promotion_code`.
- **4.4.** Thu ngân chọn hình thức thanh toán:
  - **4.4.1.** Chọn Tiền mặt (`cash`) hoặc Thẻ (`card`): đơn hàng được tạo với `payment_status = 'paid'` ngay lập tức.
  - **4.4.2.** Chọn Chuyển khoản (`transfer`): đơn hàng được tạo với `payment_status = 'pending'`, hệ thống gọi ZaloPay Gateway để tạo giao dịch động và trả về `qr_content`/`qr_code` cho Client hiển thị.
- **4.5.** Thu ngân nhấn nút **"Thanh toán & Hoàn tất"**.
- **4.6.** Client gửi request `POST /orders` chứa danh sách sản phẩm (`items`), hình thức thanh toán (`payment_method`), và mã khuyến mãi (`promotion_code`) hoặc `discount_amount` nếu có. Server tự xác định ca làm việc đang mở của chi nhánh — Client **không** truyền `shift_id`.
- **4.7.** Backend xử lý giao dịch đơn hàng và trừ kho FEFO:
  - **Phía Backend NestJS (`backend-nestjs`):** _(đã đối chiếu với code thực tế)_
    - **4.7.1.** Toàn bộ nghiệp vụ tạo đơn (tính giá, trừ kho, tạo order + order_items) chạy trong 1 transaction CSDL thông qua `DataSource.transaction()`.
    - **4.7.2.** `BatchConsumptionService.consumeFefo()` khóa dòng (`pessimistic_write`) trên bảng `products` và `product_batches`, bốc hàng theo thứ tự hạn dùng gần nhất trước (FEFO).
    - **4.7.3.** Nếu chọn `transfer`: `ZaloPayService` dùng `@nestjs/axios` gửi request ký HMAC-SHA256 (`mac = crypto.createHmac('sha256', key1)...`) tới ZaloPay Gateway **sau khi** transaction CSDL đã commit thành công.
  - **Phía Backend FastAPI (`backend-fastapi`):** _(đã đối chiếu với code thực tế)_
    - **4.7.1.** Sử dụng Async Database Session (`AsyncSession`) với `async with AsyncSessionLocal() as session:` thông qua dependency `get_db()`.
    - **4.7.2.** `BatchConsumptionService.consume_fefo()` thực thi truy vấn khóa dòng (`SELECT ... FOR UPDATE`) trên bảng `products` và `product_batches`, trừ kho theo thứ tự hạn dùng gần nhất (FEFO).
    - **4.7.3.** Nếu chọn `transfer`: `ZaloPayService` sử dụng thư viện bất đồng bộ `httpx.AsyncClient` để gọi API ZaloPay Gateway. Nếu gọi API thất bại, backend thực hiện transaction bù trừ: hoàn lại số lô (`restore_exact_batches`), chuyển `order.status = 'cancelled'`, xóa cache Redis và ném lỗi HTTP `500` (`ZALOPAY_CREATE_ERROR`).
- **4.8.** Client nhận phản hồi:
  - **4.8.1.** Nếu là Tiền mặt/Thẻ: hiển thị thông báo "Thanh toán thành công", hiển thị hóa đơn và làm sạch giỏ hàng.
  - **4.8.2.** Nếu là ZaloPay: hiển thị Modal chứa mã QR động, Client tự polling `POST /payment/zalopay/query-order` hoặc chờ Webhook `POST /payment/zalopay/callback` để cập nhật trạng thái thanh toán.

**Luồng ngoại lệ**

- **4.E1.** Sản phẩm không đủ tồn kho xuất bán:
  - **4.E1.1.** Trong quá trình bốc hàng FEFO, tổng tồn kho thực tế của các lô nhỏ hơn số lượng khách cần mua.
  - **4.E1.2.** Rollback Transaction CSDL.
  - **4.E1.3.** Backend trả về lỗi HTTP `409 Conflict` (mã lỗi `INVENTORY_INSUFFICIENT`) kèm tên sản phẩm và số tồn còn lại.
  - **4.E1.4.** Client hiển thị thông báo lỗi "Sản phẩm X không đủ tồn kho để xuất bán".
- **4.E2.** Chi nhánh chưa có ca làm việc mở, hoặc thu ngân chưa được phân công vào ca:
  - **4.E2.1.** Backend không tìm thấy ca đang mở (`SHIFT_REQUIRED`) cho chi nhánh của thu ngân, hoặc thu ngân không phải admin/chủ ca/thu ngân được gán vào ca (`SHIFT_USER_NOT_ASSIGNED`).
  - **4.E2.2.** Trả về mã lỗi HTTP `400 Bad Request` (`SHIFT_REQUIRED`) hoặc `403 Forbidden` (`SHIFT_USER_NOT_ASSIGNED`).
  - **4.E2.3.** Client chặn thanh toán và hiển thị Modal yêu cầu "Mở ca làm việc trước khi thực hiện bán hàng" (hoặc thông báo chưa được phân công ca).
- **4.E3.** Tạo giao dịch ZaloPay thất bại (lỗi mạng/lỗi từ Gateway):
  - **4.E3.1.** Backend phát hiện lỗi khi gọi API tạo đơn ZaloPay, ngay sau khi đã commit transaction tạo đơn + trừ kho.
  - **4.E3.2.** Backend tự động mở một transaction bù trừ: hoàn trả đúng số lượng đã trừ về từng lô hàng ban đầu, đổi `order.status = 'cancelled'`, và xóa cache Redis của các sản phẩm liên quan.
  - **4.E3.3.** Backend trả về lỗi HTTP `500` (`ZALOPAY_CREATE_ERROR`) kèm thông báo lỗi.
  - **4.E3.4.** Trường hợp khách hủy thanh toán trên app ZaloPay hoặc hết thời gian chờ: đơn giữ nguyên `payment_status = 'pending'` cho đến khi có xác nhận rõ ràng — hệ thống **hiện chưa có job tự động hủy đơn theo timeout**; việc hủy đơn `pending` phải thực hiện thủ công qua `PATCH /orders/{id}/cancel` hoặc `POST /payment/zalopay/cancel-order`.

---

## Bảng 6. Đặc tả usecase huỷ đơn hàng

| Trường             | Nội dung                                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mã usecase**     | 5                                                                                                                                                                                                                                              |
| **Tên usecase**    | Huỷ đơn hàng                                                                                                                                                                                                                                   |
| **Actor**          | Admin, hoặc chính người tạo đơn (cashier/leader)                                                                                                                                                                                               |
| **Mô tả**          | Cho phép người tạo đơn hoặc admin hủy một đơn hàng **chưa thanh toán xong** (`payment_status = 'pending'`) — áp dụng cho đơn `transfer` đang chờ chuyển khoản. Đơn đã thanh toán (`payment_status = 'paid'`) không được hủy qua chức năng này. |
| **Tiền điều kiện** | Đơn hàng chưa bị hủy trước đó (`status != 'cancelled'`) và **chưa thanh toán xong** (`payment_status = 'pending'`).                                                                                                                            |
| **Hậu điều kiện**  | Đơn hàng chuyển sang `status = 'cancelled'`; số lượng đã trừ tại từng lô hàng được hoàn trả đúng nguyên trạng; nếu đơn có giao dịch ZaloPay đang chờ thì cũng được hủy trên Gateway.                                                           |

**Luồng sự kiện chính**

- **5.1.** Thu ngân mở danh sách đơn hàng gần đây hoặc màn hình thanh toán ZaloPay chờ xử lý.
- **5.2.** Thu ngân chọn đơn hàng `pending` cần hủy và nhấn nút **"Hủy đơn hàng"**.
- **5.3.** Client gửi request `PATCH /orders/{id}/cancel`.
- **5.4.** Backend kiểm tra quyền và trạng thái, sau đó cập nhật trạng thái đơn hàng và hoàn lại tồn kho:
  - **5.4.1.** Kiểm tra đơn hàng tồn tại, chưa bị hủy trước đó, và **`payment_status = 'pending'`** (nếu đã `paid` → từ chối, xem 5.E1).
  - **5.4.2.** Kiểm tra quyền: chỉ admin hoặc chính người tạo đơn (`created_by`) mới được hủy.
  - **5.4.3.** Nếu đơn dùng `payment_method = 'transfer'` và đã có `zalopay_app_trans_id`: gọi API hủy giao dịch trên ZaloPay Gateway trước.
  - **5.4.4.** Bắt đầu Transaction CSDL, khóa dòng đơn hàng (`pessimistic_write`).
  - **5.4.5.** Với từng dòng sản phẩm trong đơn, hoàn trả đúng số lượng đã bốc về đúng lô hàng gốc (`order_item_batches` → `product_batches.quantity_remaining`) và cộng lại `products.stock_quantity`.
  - **5.4.6.** Đổi trạng thái đơn hàng `orders.status = 'cancelled'`.
  - **5.4.7.** Commit Transaction và xóa Cache Redis của các sản phẩm liên quan.
- **5.5.** Client hiển thị thông báo "Hủy đơn hàng thành công".

**Luồng ngoại lệ**

- **5.E1.** Đơn hàng đã thanh toán xong:
  - **5.E1.1.** Backend phát hiện `orders.payment_status == 'paid'`.
  - **5.E1.2.** Trả về mã lỗi HTTP `400 Bad Request` (`ORDER_ALREADY_PAID_CANNOT_CANCEL`), thông báo "Không thể hủy đơn hàng đã thanh toán hoàn tất, vui lòng sử dụng chức năng Trả hàng."
- **5.E2.** Đơn hàng đã bị hủy trước đó:
  - **5.E2.1.** Backend phát hiện `orders.status == 'cancelled'`.
  - **5.E2.2.** Trả về mã lỗi HTTP `409 Conflict` (`ORDER_ALREADY_CANCELLED`).
- **5.E3.** Không có quyền hủy:
  - **5.E3.1.** Người thực hiện không phải admin và không phải người tạo đơn.
  - **5.E3.2.** Trả về mã lỗi HTTP `403 Forbidden` (`FORBIDDEN`).

---

## Bảng 7. Đặc tả usecase xử lý trả hàng

| Trường             | Nội dung                                                                                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mã usecase**     | 6                                                                                                                                                                                                                                                             |
| **Tên usecase**    | Xử lý trả hàng                                                                                                                                                                                                                                                |
| **Actor**          | Admin, leader, cashier                                                                                                                                                                                                                                        |
| **Mô tả**          | Cho phép khách hàng trả lại một phần hoặc toàn bộ số lượng của một dòng sản phẩm (`order_item`) đã mua, hỗ trợ trả nhiều lần từng phần. Hệ thống tự động hoàn tiền theo đơn giá snapshot tại thời điểm bán và trả sản phẩm về đúng lô hàng ban đầu trong kho. |
| **Tiền điều kiện** | Đơn hàng chứa dòng sản phẩm chưa bị hủy (`order.status != 'cancelled'`); số lượng xin trả không vượt quá số lượng còn có thể trả của dòng hàng đó.                                                                                                            |
| **Hậu điều kiện**  | Phiếu trả hàng (`returns`) được tạo, số tiền hoàn được ghi nhận, tồn kho sản phẩm và tồn kho lô ban đầu được khôi phục chính xác.                                                                                                                             |

**Luồng sự kiện chính**

- **6.1.** Thu ngân nhập mã đơn hàng (Order ID) khách mang đến trả.
- **6.2.** Client hiển thị chi tiết hóa đơn gồm danh sách dòng sản phẩm, số lượng đã mua và số lượng đã trả trước đó (`returned_quantity`) của từng dòng.
- **6.3.** Thu ngân chọn dòng sản phẩm (`order_item_id`) khách muốn trả, nhập số lượng trả và lý do trả hàng (hàng lỗi, khách đổi ý...).
- **6.4.** Hệ thống tự động tính số tiền hoàn trả = `quantity_trả × unit_price` của dòng hàng đó tại thời điểm bán (snapshot, đã bao gồm giảm giá cận hạn theo lô nếu có).
  > **Lưu ý:** hiện tại số tiền hoàn **chưa phân bổ lại** phần giảm giá tổng đơn (`discount_amount`/mã khuyến mãi cấp đơn hàng) xuống từng dòng sản phẩm — nếu đơn có áp coupon toàn đơn, số tiền hoàn theo `unit_price` gốc của dòng có thể cao hơn số tiền khách thực trả cho đúng phần đó.
- **6.5.** Thu ngân nhấn **"Xác nhận trả hàng & Hoàn tiền"**.
- **6.6.** Client gửi request `POST /returns` với `order_item_id`, `quantity`, `reason`.
- **6.7.** Backend xử lý (trong 1 transaction, khóa dòng `order_item`):
  - Kiểm tra đơn hàng chứa dòng này chưa bị hủy.
  - Kiểm tra quyền: admin hoặc user cùng chi nhánh với đơn hàng.
  - Tính tổng đã trả trước đó, kiểm tra số lượng xin trả không vượt phần còn lại.
  - Tạo bản ghi `returns`, hoàn trả số lượng về đúng lô hàng gốc (`order_item_batches`) và cộng lại `products.stock_quantity`.
  - Xóa cache Redis sản phẩm liên quan.
- **6.8.** Client nhận phản hồi thành công và in phiếu hoàn tiền cho khách.

**Luồng ngoại lệ**

- **6.E1.** Số lượng trả vượt quá số lượng còn có thể trả:
  - **6.E1.1.** Backend phát hiện `quantity trả > remaining` (với `remaining = quantity đã mua - tổng đã trả trước đó`).
  - **6.E1.2.** Trả về mã lỗi HTTP `400 Bad Request` (`RETURN_QUANTITY_EXCEEDS`).
  - **6.E1.3.** Client thông báo lỗi "Số lượng sản phẩm trả lại vượt quá số lượng còn lại có thể trả trên hóa đơn".
- **6.E2.** Đơn hàng chứa dòng sản phẩm đã bị hủy:
  - **6.E2.1.** Backend phát hiện `order.status == 'cancelled'`.
  - **6.E2.2.** Trả về mã lỗi HTTP `400 Bad Request` (`ORDER_ALREADY_CANCELLED`).

---

## Bảng 8. Đặc tả usecase đóng ca làm việc

| Trường          | Nội dung                                                                                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mã usecase**  | 7.2                                                                                                                                                                                                                                    |
| **Tên usecase** | Đóng ca làm việc đối soát quỹ                                                                                                                                                                                                          |
| **Actor**       | Admin, hoặc chính Trưởng ca đã mở ca                                                                                                                                                                                                   |
| **Mô tả**       | Thu ngân/Trưởng ca kiểm đếm tiền mặt thực tế khi hết ca, hệ thống tự động đối soát với doanh thu tiền mặt trên phần mềm (đã trừ các khoản hoàn tiền mặt phát sinh trong ca) và tính số tiền chênh lệch ngay tại thời điểm trả kết quả. |

**Luồng sự kiện chính**

- **7.2.1.** Tại màn hình POS, Trưởng ca nhấn nút **"Kết thúc ca làm việc"**.
- **7.2.2.** Hệ thống hiển thị biểu mẫu Đóng ca.
- **7.2.3.** Trưởng ca đếm tổng số tiền mặt thực tế đang có trong két và nhập vào hệ thống (`closing_cash`).
- **7.2.4.** _(Tùy chọn)_ Trưởng ca nhập ghi chú (`note`).
- **7.2.5.** Trưởng ca nhấn nút **"Chốt ca & Đóng ca"**.
- **7.2.6.** Client gửi request `PATCH /shifts/{id}/close` chứa `{ closing_cash, note }`.
- **7.2.7.** Backend tính toán đối soát tài chính ca và đóng ca:
  - **7.2.7.1.** Kiểm tra quyền (chỉ admin hoặc chính Trưởng ca đã mở ca) và `shift.closed_at IS NULL`.
  - **7.2.7.2.** Tính `expected_cash = opening_cash + tổng total_amount các đơn payment_method='cash' đã completed trong ca - tổng refund_amount của các Return thuộc đơn cash trong ca`.
  - **7.2.7.3.** Cập nhật `shifts.closing_cash`, `shifts.expected_cash`, `shifts.closed_at`.
  - **7.2.7.4.** Trả về báo cáo kết thúc ca gồm: `cash_difference = closing_cash - expected_cash`, tổng doanh thu theo từng phương thức thanh toán, danh sách đơn hàng và danh sách phiếu trả hàng phát sinh trong ca.
- **7.2.8.** Client hiển thị phụ lục đối soát ca bao gồm: tổng doanh thu tiền mặt ghi nhận, tổng tiền lý thuyết kỳ vọng, số tiền chênh lệch (thừa/thiếu) và trạng thái đóng ca thành công.

**Luồng ngoại lệ**

- **7.2.E1.** Phát hiện chênh lệch tiền mặt:
  - **7.2.E1.1.** `cash_difference ≠ 0` (thừa hoặc thiếu tiền mặt).
  - **7.2.E1.2.** Hệ thống vẫn cho phép đóng ca; `cash_difference` được **tính và trả về ngay trong response** của API đóng ca để Leader/Admin xem xét, không lưu thành một cờ cảnh báo riêng trong CSDL. Admin hoặc chính Trưởng ca đã mở ca có thể chỉnh lại `closing_cash`/`note` sau đó qua `PATCH /shifts/{id}/correction`.

---

## Bảng 9. Đặc tả usecase kiểm kê kho

| Trường          | Nội dung                                                                                                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mã usecase**  | 13.1                                                                                                                                                                                                                                                                               |
| **Tên usecase** | Kiểm kê kho định kỳ và tự động điều chỉnh tồn kho                                                                                                                                                                                                                                  |
| **Actor**       | Admin, leader (tạo/chốt phiên); admin, leader, cashier (ghi nhận số đếm)                                                                                                                                                                                                           |
| **Mô tả**       | Hỗ trợ nhân viên tạo phiếu kiểm kê, nhập số lượng đếm thực tế cho từng **sản phẩm** (có thể kèm chi tiết theo từng lô hàng nếu cần độ chính xác cao hơn). Hệ thống tự tính toán chênh lệch và tự động tạo phiếu xuất/nhập bù trừ để khớp số sổ sách với số thực tế khi chốt phiên. |

**Luồng sự kiện chính**

- **13.1.1.** Người dùng (admin/leader) truy cập phân hệ "Kiểm kê kho" và nhấn **"Tạo phiên kiểm kê mới"** (`POST /stocktakes`). Mỗi chi nhánh chỉ được có 1 phiên `open` tại một thời điểm.
- **13.1.2.** Nhân viên (admin/leader/cashier) đếm hàng thực tế tại kệ/kho và nhập số lượng đếm được cho từng **sản phẩm** (`product_id`) qua `POST /stocktakes/{id}/items` hoặc `POST /stocktakes/{id}/items/bulk`. `system_quantity` (tồn kho sổ sách) của từng dòng được chụp lại **tại đúng thời điểm nhập dòng đó** (không phải chụp toàn bộ tồn kho ngay khi mở phiên).
  - _(Tùy chọn)_ Có thể gửi kèm `batch_counts[]` để ghi chi tiết số đếm theo từng lô hàng cụ thể — nếu có, hệ thống sẽ dùng đúng lô đó khi chốt phiên thay vì bốc theo FEFO.
- **13.1.3.** Hệ thống hiển thị số lượng chênh lệch (`difference = counted_quantity - system_quantity`) theo từng sản phẩm (và theo từng lô nếu có `batch_counts`).
- **13.1.4.** Người dùng có thể xóa một dòng đếm nhầm (`DELETE /stocktakes/{id}/items/{itemId}`) khi phiên còn `open`.
- **13.1.5.** Người dùng (admin/leader) kiểm tra và nhấn **"Chốt kiểm kê & Cập nhật kho"**.
- **13.1.6.** Client gửi request `PATCH /stocktakes/{id}/close`.
- **13.1.7.** Backend tự động cân bằng tồn kho và tạo nhật ký điều chỉnh, trong 1 Transaction CSDL:
  - **13.1.7.1.** Với mỗi dòng có `difference != 0`: nếu có chi tiết theo lô (`batch_counts` đã ghi trước đó), điều chỉnh đúng từng lô; nếu không, dùng FEFO (trừ) hoặc tạo lô mới (thừa) làm phương án dự phòng.
  - **13.1.7.2.** Cập nhật `product_batches.quantity_remaining` và `products.stock_quantity`, sinh bản ghi lịch sử điều chỉnh kho trong bảng `inventory_transactions` với `source = 'STOCKTAKE'`.
  - **13.1.7.3.** Sản phẩm đã bị xóa mềm sau khi được đếm sẽ bị **bỏ qua** khỏi bước điều chỉnh và liệt kê vào `skipped_items` trong response.
  - **13.1.7.4.** Đổi trạng thái phiên kiểm kê `stocktakes.status = 'closed'`.
  - **13.1.7.5.** Commit Transaction và xóa Cache Redis của các sản phẩm liên quan.
- **13.1.8.** Client thông báo "Hoàn tất kiểm kê kho thành công", hiển thị `skipped_items` (nếu có) để người dùng biết dòng nào không được áp dụng.

**Luồng ngoại lệ**

- **13.1.E1.** Phiên kiểm kê đã chốt từ trước:
  - **13.1.E1.1.** Backend kiểm tra `stocktakes.status != 'open'`.
  - **13.1.E1.2.** Trả về mã lỗi HTTP `400 Bad Request` (`STOCKTAKE_CLOSED`), thông báo "Phiên kiểm kê đã đóng."
- **13.1.E2.** Sản phẩm không thuộc chi nhánh của phiên kiểm kê:
  - **13.1.E2.1.** Backend phát hiện `product.branch_id != stocktake.branch_id`.
  - **13.1.E2.2.** Trả về mã lỗi HTTP `400 Bad Request` (`PRODUCT_BRANCH_MISMATCH`).
