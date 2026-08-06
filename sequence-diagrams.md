# SEQUENCE DIAGRAMS – BACKEND NESTJS (TRẮNG ĐEN MONOCHROME, ĐUỔI CHUẨN ĐẶC TẢ A4 WORD)

> **Ghi chú định dạng**:
> 1. **Phong cách Trắng - Đen (Monochrome)**: Loại bỏ toàn bộ màu sắc nền, màu nốt, màu hộp (`box`) để đảm bảo sơ đồ thuần trắng đen chuẩn mực cho tài liệu in ấn / luận văn.
> 2. **Tối ưu khổ A4 trong Word (Lề trái 3.4cm, Lề phải 2.0cm)**: Sử dụng `skinparam DefaultFontSize 30`, `skinparam ParticipantFontSize 30`, ngắt dòng ngắn bằng `\n` (tối đa 20-25 ký tự/dòng) giúp chữ không bị nén hay thu nhỏ.
> 3. **Đã đối chiếu 100% từng mã bước chính xác theo Đặc tả**: [4.6], [4.7.1], [4.7.2], [4.7.3], [4.8.1], [4.8.2],... không bỏ sót mã bước nào.

---

## 1. UC-04: BÁN HÀNG POS & TRỪ KHO FEFO

```plantuml
@startuml UC04_Sequence_NestJS
title UC-04: Bán hàng POS & Trừ kho FEFO\n(Backend NestJS)

scale 1.0
skinparam monochrome true
skinparam DefaultFontSize 30
skinparam ParticipantFontSize 30
skinparam ActorFontSize 30
skinparam BoxFontSize 30
skinparam ArrowFontSize 24
skinparam MaxMessageWidth 220

autonumber

participant "ReactJS SPA\n(Client)" as Client
box "NestJS Server"
participant "OrdersController\n& JwtAuthGuard" as Ctrl
participant "OrdersService &\nBatchConsumption" as Svc
end box
database "PostgreSQL & Redis\n(store_nestjs)" as DB
participant "ZaloPay Gateway\n(@nestjs/axios)" as ZaloPay

Client -> Ctrl: [4.6] POST /orders\n(items, payment_method,\npromotion / discount)
activate Ctrl

Ctrl -> Svc: [4.7] create(dto, req.user)
activate Svc

Svc -> Svc: [4.7.1] requireActiveShift(user)\n(Check ca mở chi nhánh)

alt 4.E2. Thu ngân chưa có ca mở (Shift != OPEN)
  Svc --> Ctrl: BusinessException\n("SHIFT_REQUIRED", 400)\nhoặc ("SHIFT_USER_NOT_ASSIGNED", 403)
  Ctrl --> Client: HTTP 400 / 403\n{ code: "SHIFT_REQUIRED",\nmessage: "Chưa mở ca" }
end

Svc -> DB: [4.7.1] transaction()\n[4.7.2] SELECT product_batches\nORDER BY expiry_date ASC\nFOR UPDATE (Pessimistic Lock)
activate DB
DB --> Svc: Lô hàng FEFO khả dụng

alt 4.E1. Không đủ tồn kho xuất bán
  Svc --> Ctrl: BusinessException\n("INVENTORY_INSUFFICIENT", 409)
  Ctrl --> Client: HTTP 409 Conflict\n{ code: "INVENTORY_INSUFFICIENT" }
end

Svc -> DB: [4.7.2] Trừ batch.quantity_remaining\n+ Ghi OrderItemBatch\n+ Expiry pricing bình quân\n+ UPDATE products.stock_quantity\n+ Tạo Order (status = completed)

alt PTTT = 'cash' (Tiền mặt) / 'card' (Thẻ)
  Svc -> DB: payment_status = 'paid'\nshifts.cash_sales += total\nevict Redis cache + COMMIT
  DB --> Svc: Order Entity (paid)
  Svc --> Ctrl: OrderDataDto
  Ctrl --> Client: [4.8.1] HTTP 201 Created\n{ data: OrderDataDto }

else PTTT = 'transfer' (ZaloPay QR / VietQR)
  Svc -> DB: payment_status = 'pending'\nevict Redis cache + COMMIT
  DB --> Svc: Order Entity (pending)
  
  Svc -> ZaloPay: [4.7.3] ZaloPayService.createOrder()\nPOST /v2/create (HMAC-SHA256)\n(sau khi DB transaction committed)
  activate ZaloPay
  
  alt Gọi ZaloPay API thành công
    ZaloPay --> Svc: { return_code: 1,\norder_url, zp_trans_token }
    deactivate ZaloPay
    Svc -> DB: UPDATE zalopay_app_trans_id
    Svc --> Ctrl: OrderDataDto + QR Base64
    Ctrl --> Client: [4.8.2] HTTP 201 Created\n{ data: { order, qr_code } }
  else 4.E3. Gọi ZaloPay API thất bại
    ZaloPay --> Svc: Error / Exception
    Svc -> DB: Transaction bù trừ:\nrestoreExactBatches(),\norders.status = 'cancelled',\nevict Redis cache + COMMIT
    Svc --> Ctrl: BusinessException\n("ZALOPAY_CREATE_ERROR", 500)
    Ctrl --> Client: HTTP 500 Internal Error\n{ code: "ZALOPAY_CREATE_ERROR" }
  end
end

deactivate DB
deactivate Svc
deactivate Ctrl
@enduml
```

---

## 2. UC-05: HỦY ĐƠN HÀNG (PENDING)

```plantuml
@startuml UC05_Sequence_NestJS
title UC-05: Hủy đơn hàng PENDING & Hoàn kho FEFO\n(Backend NestJS)

scale 1.0
skinparam monochrome true
skinparam DefaultFontSize 30
skinparam ParticipantFontSize 30
skinparam ActorFontSize 30
skinparam BoxFontSize 30
skinparam ArrowFontSize 24
skinparam MaxMessageWidth 220

autonumber

participant "ReactJS SPA\n(Client)" as Client
box "NestJS Server"
participant "OrdersController\n& JwtAuthGuard" as Ctrl
participant "OrdersService" as Svc
end box
database "PostgreSQL & Redis\n(store_nestjs)" as DB
participant "ZaloPay Gateway\n(@nestjs/axios)" as ZaloPay

Client -> Ctrl: [5.3] PATCH /orders/:id/cancel
activate Ctrl

Ctrl -> Svc: [5.4] cancel(orderId, req.user)
activate Svc

Svc -> DB: [5.4.1] findOne(id)
activate DB
DB --> Svc: orderToCheck

Svc -> Svc: [5.4.1] requireActiveShift(user, branchId)

alt 5.E1. Đơn đã thanh toán (paymentStatus == 'paid')
  Svc --> Ctrl: BusinessException\n("ORDER_ALREADY_PAID_CANNOT_CANCEL", 400)
  Ctrl --> Client: HTTP 400 Bad Request\n{ code: "ORDER_ALREADY_PAID..." }
else 5.E2. Đơn đã hủy từ trước (status == 'cancelled')
  Svc --> Ctrl: BusinessException\n("ORDER_ALREADY_CANCELLED", 409)
  Ctrl --> Client: HTTP 409 Conflict\n{ code: "ORDER_ALREADY_CANCELLED" }
else 5.E3. 5.4.2. Không phải admin và không phải người tạo
  Svc --> Ctrl: BusinessException\n("FORBIDDEN", 403)
  Ctrl --> Client: HTTP 403 Forbidden\n{ code: "FORBIDDEN" }
end

opt 5.4.3. Đơn ZaloPay đang pending & có zalopayAppTransId
  Svc -> ZaloPay: cancelOrder({ app_trans_id })
  activate ZaloPay
  ZaloPay --> Svc: { return_code: 1 }
  deactivate ZaloPay
end

Svc -> DB: [5.4.4] transaction()\nLock order (pessimistic_write)\n[5.4.5] restoreExactBatches()\nHoàn quantity_taken về lô gốc\n+ UPDATE products.stock_quantity\n[5.4.6] orders.status = 'cancelled'\n[5.4.7] evict Redis + COMMIT
DB --> Svc: Saved Cancelled Order Entity

Svc --> Ctrl: OrderDataDto
Ctrl --> Client: [5.5] HTTP 200 OK\n{ message: "Hủy đơn thành công" }

deactivate DB
deactivate Svc
deactivate Ctrl
@enduml
```

---

## 3. UC-06: XỬ LÝ TRẢ HÀNG VÀ HOÀN TIỀN

```plantuml
@startuml UC06_Sequence_NestJS
title UC-06: Xử lý trả hàng và hoàn tiền\n(Backend NestJS)

scale 1.0
skinparam monochrome true
skinparam DefaultFontSize 30
skinparam ParticipantFontSize 30
skinparam ActorFontSize 30
skinparam BoxFontSize 30
skinparam ArrowFontSize 24
skinparam MaxMessageWidth 220

autonumber

participant "ReactJS SPA\n(Client)" as Client
box "NestJS Server"
participant "ReturnsController\n& JwtAuthGuard" as Ctrl
participant "ReturnsService" as Svc
end box
database "PostgreSQL & Redis\n(store_nestjs)" as DB

Client -> Ctrl: [6.6] POST /returns\n(order_item_id, quantity, reason)
activate Ctrl

Ctrl -> Svc: [6.7] create(dto, req.user)
activate Svc

Svc -> DB: [6.7.1] transaction()\nLock order_item (pessimistic_write)\nSELECT order
activate DB
DB --> Svc: orderItem + order

alt 6.E2. 6.7.1. Đơn gốc đã bị hủy (status == 'cancelled')
  Svc --> Ctrl: BusinessException\n("ORDER_ALREADY_CANCELLED", 400)
  Ctrl --> Client: HTTP 400 Bad Request\n{ code: "ORDER_ALREADY_CANCELLED" }
end

Svc -> Svc: [6.7.2] requireActiveShift(user, branchId)

Svc -> DB: [6.7.3] SUM(quantity) FROM returns\nWHERE order_item_id = :id
DB --> Svc: alreadyReturned

Svc -> Svc: remaining = quantity - alreadyReturned

alt 6.E1. 6.7.3. Số lượng xin trả > còn lại (quantity > remaining)
  Svc --> Ctrl: BusinessException\n("RETURN_QUANTITY_EXCEEDS", 400)
  Ctrl --> Client: HTTP 400 Bad Request\n{ code: "RETURN_QUANTITY_EXCEEDS" }
end

Svc -> Svc: [6.4] refundAmount =\nNumber(unitPrice) * quantity

Svc -> DB: [6.7.4] INSERT INTO returns\nrestoreQuantityForReturnedItem()\nHoàn về product_batches gốc\n+ UPDATE products.stock_quantity\n[6.7.5] evict Redis + COMMIT
DB --> Svc: Saved Return Entity

Svc --> Ctrl: ReturnDto
Ctrl --> Client: [6.8] HTTP 201 Created\n{ data: ReturnDto }

deactivate DB
deactivate Svc
deactivate Ctrl
@enduml
```

---

## 4. UC-07.2: ĐÓNG CA LÀM VIỆC VÀ ĐỐI SOÁT QUỸ

```plantuml
@startuml UC072_Sequence_NestJS
title UC-07.2: Đóng ca làm việc và đối soát quỹ\n(Backend NestJS)

scale 1.0
skinparam monochrome true
skinparam DefaultFontSize 30
skinparam ParticipantFontSize 30
skinparam ActorFontSize 30
skinparam BoxFontSize 30
skinparam ArrowFontSize 24
skinparam MaxMessageWidth 220

autonumber

participant "ReactJS SPA\n(Client)" as Client
box "NestJS Server"
participant "ShiftsController\n& JwtAuthGuard" as Ctrl
participant "ShiftsService" as Svc
end box
database "PostgreSQL DB\n(store_nestjs)" as DB

Client -> Ctrl: [7.2.6] PATCH /shifts/:id/close\n(closing_cash, note)
activate Ctrl

Ctrl -> Svc: [7.2.7] close(shiftId, dto, req.user)
activate Svc

Svc -> DB: [7.2.7.1] transaction()\nLock shift (pessimistic_write)
activate DB
DB --> Svc: shift entity

alt Không phải admin và không phải chính người mở ca
  Svc --> Ctrl: BusinessException("FORBIDDEN", 403)
  Ctrl --> Client: HTTP 403 Forbidden\n{ code: "FORBIDDEN" }
else Ca làm việc đã đóng từ trước (closedAt IS NOT NULL)
  Svc --> Ctrl: BusinessException("SHIFT_ALREADY_CLOSED", 409)
  Ctrl --> Client: HTTP 409 Conflict\n{ code: "SHIFT_ALREADY_CLOSED" }
end

Svc -> DB: [7.2.7.2] SUM(total_amount + rounding_amount)\nFROM orders (cash & completed)\nSELECT SUM(refund_amount)\nFROM returns (cash)
DB --> Svc: cashRevenue + cashReturns

Svc -> Svc: [7.2.7.3] expectedCash = openingCash\n+ cashRevenue - cashReturns\ncashDifference = closing_cash - expectedCash

Svc -> DB: [7.2.7.3] shiftRepo.save(shift) + COMMIT
DB --> Svc: Saved Closed Shift Entity

Svc --> Ctrl: [7.2.7.4] ShiftDataDto\n(kèm cashDifference)
deactivate DB

Ctrl --> Client: [7.2.8] HTTP 200 OK\n{ data: ShiftDataDto }
deactivate Svc
deactivate Ctrl
@enduml
```

---

## 5. UC-13.1: KIỂM KÊ KHO VÀ TỰ ĐỘNG ĐIỀU CHỈNH TỒN KHO

```plantuml
@startuml UC131_Sequence_NestJS
title UC-13.1: Kiểm kê kho & Điều chỉnh tồn kho\n(Backend NestJS)

scale 1.0
skinparam monochrome true
skinparam DefaultFontSize 30
skinparam ParticipantFontSize 30
skinparam ActorFontSize 30
skinparam BoxFontSize 30
skinparam ArrowFontSize 24
skinparam MaxMessageWidth 220

autonumber

participant "ReactJS SPA\n(Client)" as Client
box "NestJS Server"
participant "StocktakesController\n& JwtAuthGuard" as Ctrl
participant "StocktakesService" as Svc
end box
database "PostgreSQL & Redis\n(store_nestjs)" as DB

Client -> Ctrl: [13.1.6] PATCH /stocktakes/:id/close
activate Ctrl

Ctrl -> Svc: [13.1.7] close(stocktakeId, req.user)
activate Svc

Svc -> DB: [13.1.7.1] transaction()\nLock Stocktake (pessimistic_write)\nfind items
activate DB
DB --> Svc: stocktake + items

alt 13.1.E1. Phiên kiểm kê đã đóng (status != 'open')
  Svc --> Ctrl: BusinessException("STOCKTAKE_CLOSED", 400)
  Ctrl --> Client: HTTP 400 Bad Request\n{ code: "STOCKTAKE_CLOSED" }
else 13.1.E2. Không có quyền chi nhánh
  Svc --> Ctrl: BusinessException("FORBIDDEN", 403)
  Ctrl --> Client: HTTP 403 Forbidden\n{ code: "FORBIDDEN" }
end

loop Duyệt qua từng dòng kiểm kê (sortedItems)
  Svc -> DB: [13.1.7.2] Lock Product (pessimistic_write)
  
  alt Sản phẩm đã bị xóa mềm (deletedAt IS NOT NULL)
    Svc -> Svc: [13.1.7.3] Đẩy vào skippedItems\n(không điều chỉnh tồn)
  else Sản phẩm bình thường (difference != 0)
    alt Có đếm chi tiết theo lô (batch_counts)
      Svc -> DB: Điều chỉnh tồn kho đúng lô
    else Không có chi tiết lô
      Svc -> DB: Điều chỉnh theo FEFO\nhoặc tạo/cộng lô mới
    end
    Svc -> DB: UPDATE product_batches & products\nINSERT InventoryTransaction\n(source = 'STOCKTAKE')
  end
end

Svc -> DB: [13.1.7.4] stocktake.status = 'closed'\n[13.1.7.5] evict Redis + COMMIT
DB --> Svc: Saved Closed Stocktake Entity

Svc --> Ctrl: StocktakeDto (kèm skippedItems)
Ctrl --> Client: [13.1.8] HTTP 200 OK\n{ data: StocktakeDto }

deactivate DB
deactivate Svc
deactivate Ctrl
@enduml
```
