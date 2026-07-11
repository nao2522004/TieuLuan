# Bộ Rule Chuẩn Hóa Kiến Trúc & Coding (Bản Cập Nhật Chi Tiết)
### Dự án: Hệ thống quản lý cửa hàng tiện lợi mini (NestJS vs FastAPI)

Mục tiêu của bộ rule này: đảm bảo 2 bản backend (NestJS + FastAPI)
- Được xây dựng theo cùng 1 chuẩn kiến trúc → so sánh công bằng
- Dễ debug, dễ mở rộng (scale) dù hiện tại chỉ phục vụ cửa hàng nhỏ
- Có thể trình bày rõ ràng trong báo cáo tiểu luận (mỗi rule đều có lý do)

> **Nguyên tắc bao trùm (Parity Principle):** bất kỳ khác biệt hành vi (response, status code, format lỗi, side-effect) nào giữa 2 backend so với 1 bản đặc tả API chung (API contract) đều được coi là **bug cần sửa**, không phải "đặc thù của framework". Chỉ hiệu năng, tốc độ phát triển, độ dễ maintain là những thứ được phép khác nhau và cần đo lường — còn **hành vi API quan sát được từ phía client thì bắt buộc giống hệt nhau**. Khuyến nghị: viết 1 file `API_CONTRACT.md` mô tả chi tiết từng endpoint, request/response, quy ước chung (định dạng ID, tiền tệ, thời gian, HTTP status code, mã lỗi) trước khi code, dùng làm nguồn tham chiếu duy nhất khi review chéo giữa 2 backend.

---

## 1. Kiến trúc phân lớp (Layered Architecture) & Cơ chế Dependency Injection

Cùng 1 tư tưởng kiến trúc, nhưng **mỗi framework dùng đúng thuật ngữ/tên gọi bản địa của mình** (không ép FastAPI dùng tên của NestJS/Spring Boot) — đây cũng là điểm bạn có thể nêu trong báo cáo: cùng pattern nhưng cách đặt tên/convention khác nhau phản ánh triết lý thiết kế khác nhau của 2 hệ sinh thái.

```
Nhận request  →  Xử lý nghiệp vụ  →  Truy xuất dữ liệu  →  Database
```

| Khái niệm chung | Tên trong NestJS | Tên trong FastAPI | Nhiệm vụ | Không được làm |
|---|---|---|---|---|
| Tầng nhận request | **Controller** (`*.controller.ts`) | **Router / Path Operation** (`*.py` trong `api/` hoặc `routers/`) | Nhận request, validate input, gọi tầng xử lý, trả response | Không viết business logic, không query DB trực tiếp |
| Tầng nghiệp vụ | **Service** (`*.service.ts`) | **Service** (`service.py`, cộng đồng FastAPI cũng dùng tên này) | Xử lý nghiệp vụ (tính tiền, kiểm tra tồn kho...) | Không biết chi tiết SQL, không xử lý HTTP request/response |
| Tầng truy xuất dữ liệu | **Repository** (`*.repository.ts`) | **CRUD module** (`crud.py`) — tên gọi đặc trưng của cộng đồng FastAPI thay cho "Repository" | Truy vấn DB (CRUD) | Không chứa business logic |
| Định nghĩa dữ liệu vào/ra | **DTO** (`*.dto.ts`) | **Schema** (`schemas.py`, dùng Pydantic `BaseModel`) | Định nghĩa hình dạng dữ liệu request/response | — |
| Định nghĩa bảng DB (ORM) | **Entity** (`*.entity.ts`, TypeORM) | **Model** (`models.py`, SQLAlchemy) | Ánh xạ bảng DB | Không chứa logic nghiệp vụ |
| Nơi gom nhóm route/DI | **Module** (`*.module.ts`) | **`APIRouter()`**, gộp qua `app.include_router()` trong `main.py` | Gom nhóm & đăng ký các thành phần cùng nghiệp vụ | — |

**Quy tắc Dependency Injection (DI) & Quản lý Connection:**
- **Nguyên tắc chung:** không dùng từ khóa `new`/khởi tạo trực tiếp Service/CRUD bên trong Controller/Router, nhằm đảm bảo tính lỏng lẻo (loose coupling) và phục vụ viết Unit Test dễ dàng (Mocking).
- **NestJS:** khai báo Service/Repository là `@Injectable()`, đăng ký trong `Module`, inject qua constructor.
- **FastAPI:** dùng cơ chế **`Depends()`** — cơ chế DI riêng của FastAPI, dùng để inject DB Session hoặc các hàm ở tầng `crud.py`/`service.py` vào Router. Các hàm `Depends` dùng chung được gom vào 1 file riêng tên **`dependencies.py`** (quy ước phổ biến của cộng đồng FastAPI, tương đương vai trò tổ chức của `common/` bên NestJS).
- **Quản lý DB Session (FastAPI):** hàm cung cấp DB Session (đặt trong `db/session.py`) bắt buộc dùng `yield` trong block `try...finally` để đảm bảo đóng kết nối (`session.close()`) ngay sau khi request kết thúc, tránh Connection Leak khi hệ thống scale.

---

## 2. Quy tắc đặt tên & tổ chức thư mục

Vì 2 hệ sinh thái có convention thư mục khác nhau, dùng 2 cây thư mục riêng — **không** ép chung 1 layout:

**NestJS:**
```
src/
 ├── modules/                # mỗi nghiệp vụ 1 module (auth, product, order, inventory...)
 │    └── product/
 │         ├── product.controller.ts
 │         ├── product.service.ts
 │         ├── product.repository.ts
 │         ├── dto/
 │         └── entities/
 ├── common/                 # middleware, guard, exception filter, decorator dùng chung
 ├── config/                 # đọc biến môi trường, cấu hình DB, Redis
 └── main.ts
```

**FastAPI — kiến trúc theo Module nghiệp vụ** (mỗi domain 1 folder, cùng tinh thần với `modules/` của NestJS, nhưng bên trong vẫn giữ đúng tên gọi bản địa của FastAPI — đây là cấu trúc "Package by Feature" được cộng đồng FastAPI khuyến nghị cho dự án quy mô vừa/lớn):

```
app/
 ├── modules/
 │    ├── auth/
 │    │    ├── router.py           # Router (tương đương Controller)
 │    │    ├── service.py          # Business logic
 │    │    ├── schemas.py          # Pydantic Schema (tương đương DTO)
 │    │    ├── models.py           # SQLAlchemy Model (tương đương Entity)
 │    │    ├── dependencies.py     # Depends() riêng của module (VD: get_current_user)
 │    │    ├── exceptions.py       # Exception riêng của module
 │    │    └── constants.py        # Hằng số riêng của module
 │    ├── product/
 │    │    ├── router.py
 │    │    ├── service.py
 │    │    ├── crud.py             # CRUD module (tương đương Repository)
 │    │    ├── schemas.py
 │    │    ├── models.py
 │    │    └── exceptions.py
 │    ├── inventory/
 │    │    └── ... (cùng cấu trúc như trên)
 │    └── order/
 │         └── ... (cùng cấu trúc như trên)
 ├── core/                         # tương đương common/ của NestJS
 │    ├── config.py                # đọc biến môi trường (Pydantic Settings)
 │    ├── security.py              # JWT, hash password
 │    ├── exceptions.py            # Base Exception & Global Exception Handler
 │    └── logging.py               # cấu hình structured logging + trace id
 ├── db/
 │    ├── base.py                  # Base class cho models
 │    └── session.py               # tạo DB session (dùng trong dependencies)
 └── main.py                       # khởi tạo app, include_router() từng module
```

**Cách "đăng ký module"** (tương đương việc import Module vào `AppModule` bên NestJS):
```python
# main.py
from app.modules.auth.router import router as auth_router
from app.modules.product.router import router as product_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(product_router, prefix="/api/v1/products", tags=["products"])
```

**Quy tắc ranh giới giữa các module:**
- Mỗi module (`auth`, `product`, `inventory`, `order`...) tự chứa toàn bộ router/service/schema/model của riêng nó — không import chéo `models.py`/`crud.py` của module khác một cách tùy tiện.
- Nếu module A cần dùng logic của module B (VD: `order` cần kiểm tra tồn kho ở `inventory`), chỉ được gọi qua tầng `service.py` công khai của module B (giống nguyên tắc chỉ gọi qua Service của Module khác bên NestJS), không query thẳng vào `models.py` của module B.
- Các thành phần dùng chung toàn hệ thống (base exception, cấu hình, logging, security) đặt ở `core/`, không lặp lại trong từng module.

- Tên file NestJS: `kebab-case` (VD: `create-product.dto.ts`)
- Tên file FastAPI: `snake_case` (VD: `create_product.py`) — đúng chuẩn PEP8 của Python, không dùng kebab-case
- Tên class: `PascalCase` ở cả hai (VD: `ProductService`, `ProductSchema`)
- Tên biến/hàm: `camelCase` (TS), `snake_case` (Python)
- Tên bảng DB: số nhiều, `snake_case` (VD: `products`, `order_items`) — áp dụng chung cho cả hai vì cùng 1 database

---

## 3. Quy tắc thiết kế API & Chuẩn hóa dữ liệu (RESTful)

- Endpoint là danh từ số nhiều, không dùng động từ: `/api/v1/products`
- Dùng đúng HTTP method: `GET` đọc, `POST` tạo, `PATCH` sửa 1 phần, `PUT` sửa toàn bộ, `DELETE` xóa
- Versioning bắt buộc từ đầu: `/api/v1/...` để tránh phá vỡ client cũ khi nâng cấp hệ thống

**Quy tắc HTTP status code theo đúng ngữ nghĩa, không dựa vào default của framework:**
- Không mặc định tin tưởng status code framework tự chọn — cả NestJS và FastAPI đều có xu hướng trả `201` cho mọi `POST` theo default, nhưng **`201 Created` chỉ dùng khi thực sự tạo mới 1 resource**. Các action xác thực/hành vi (VD: `POST /auth/login`, `POST /auth/logout`) phải khai báo tường minh `200 OK` (NestJS: `@HttpCode(HttpStatus.OK)`; FastAPI: `status_code=200` trong decorator route)
- Vì đây là lỗi rất dễ bị bỏ sót ở NestJS (do `@HttpCode` không tự suy luận, phải khai báo thủ công cho từng route lệch default), nên **liệt kê tường minh trong tài liệu API_CONTRACT.md của bạn: route nào trả 200, route nào trả 201** — không để mặc định quyết định thay

**Quy tắc định danh (ID):**
- Dùng **ID tăng tự động** (`BIGSERIAL`/`SERIAL` ở Postgres, tương đương `AUTO_INCREMENT`/`IDENTITY` ở các DB khác) làm khóa chính cho mọi bảng — không dùng UUID, vì ở quy mô 1 cửa hàng đơn lẻ, UUID chỉ thêm chi phí (index nặng hơn, không sắp xếp được theo thời gian tạo, khó đọc khi debug bằng mắt) mà không mang lại lợi ích gì (UUID chủ yếu hữu ích khi cần sinh ID phân tán ở nhiều service/node độc lập, hoặc không muốn lộ số lượng bản ghi qua ID — không áp dụng ở đây).
- ID trả về API dưới dạng số nguyên (`integer`/`bigint`), không ép về string trừ khi ngôn ngữ client có giới hạn độ chính xác số (không phát sinh ở phạm vi dự án này).
- Path param dạng ID sai định dạng (không phải số nguyên dương, VD: `/products/abc`) phải trả **`400 VALIDATION_ERROR`** với message rõ ràng (VD: `"id: must be a positive integer"`) — không được để lộ lỗi 500 do driver/ORM ném ra khi parse thất bại.
  - NestJS: dùng `ParseIntPipe` tùy biến (bắt lỗi mặc định, map sang format lỗi chung ở mục 4) thay vì để lỗi mặc định của `ParseIntPipe` lộ ra.
  - FastAPI: khai báo type `int` trực tiếp trên path param (`product_id: int`), FastAPI tự trả `422` — cấu hình lại `exception_handler` để map về đúng format `400 VALIDATION_ERROR` chung của hệ thống thay vì để nguyên `422` mặc định.

**Quy tắc định dạng dữ liệu (Data Types):**
- **Tiền tệ (Currency):** trong Database bắt buộc dùng kiểu `DECIMAL`/`NUMERIC` (tuyệt đối không dùng `FLOAT`/`DOUBLE` vì gây sai số làm tròn khi tính tiền hóa đơn). Trả về API dưới dạng số thô chính xác, không tự ý format thêm dấu chấm/phẩy (việc format hiển thị là trách nhiệm của Frontend).
- **Thời gian (Timestamp):** mọi trường thời gian trả về API phải theo chuẩn **ISO 8601** dạng chuỗi UTC (`YYYY-MM-DDTHH:mm:ssZ`).

**Đồng bộ múi giờ (Timezone) — bắt buộc giống nhau ở MỌI thành phần:**
- Chuẩn ISO 8601 UTC ở trên chỉ đúng nếu **cả hệ thống cùng lấy giờ theo 1 múi giờ thống nhất** — nếu 1 thành phần lấy giờ hệ điều hành/container theo múi giờ local (VD: `Asia/Ho_Chi_Minh`, UTC+7) còn thành phần khác lấy theo UTC, thì giá trị `created_at`/`updated_at` ghi vào DB sẽ lệch nhau dù cùng đo tại 1 thời điểm — dẫn tới hóa đơn hiển thị lệch giờ giữa 2 backend dù chạy song song, đặc biệt dễ bị phát hiện khi giảng viên phản biện so sánh trực tiếp 2 hệ thống.
- **Quy tắc bắt buộc — ép toàn bộ hệ thống chạy theo UTC (khuyến nghị, thay vì `Asia/Ho_Chi_Minh`, vì UTC là quy ước trung lập và đúng với format `Z` đã khai báo ở Mục 3):**
  - **Postgres container:** set biến môi trường `TZ=UTC` và `PGTZ=UTC` trong `docker-compose.yml` cho cả `db_nestjs` lẫn `db_fastapi`; đồng thời cột lưu thời gian trong schema/migration nên dùng kiểu `TIMESTAMPTZ` (có timezone), không dùng `TIMESTAMP` (không timezone) — `TIMESTAMPTZ` tự quy đổi và lưu chuẩn UTC bất kể session đang ở timezone nào, tránh phụ thuộc vào cấu hình runtime.
  - **Node.js runtime (NestJS):** set biến môi trường `TZ=UTC` khi chạy container (`environment: TZ: UTC` trong `docker-compose.yml`, hoặc `process.env.TZ = 'UTC'` đặt ở đầu `main.ts` trước khi bất kỳ code nào dùng `Date`), vì Node.js mặc định lấy giờ theo múi giờ của OS/container nếu không set.
  - **Python runtime (FastAPI):** không dùng `datetime.now()` (lấy theo local timezone của máy) — bắt buộc dùng `datetime.now(timezone.utc)` (hoặc `datetime.utcnow()` — lưu ý hàm này sẽ deprecated ở Python mới, ưu tiên cách đầu) ở mọi nơi sinh timestamp; đồng thời set `TZ=UTC` cho container FastAPI trong `docker-compose.yml` để nhất quán với 2 thành phần trên.
  - Viết 1 test đơn giản: tạo 1 đơn hàng ở cả 2 backend tại cùng 1 thời điểm thực tế (hoặc mock giờ hệ thống giống nhau), so sánh giá trị `created_at` trả về — phải khớp chính xác đến từng giây, không lệch 7 tiếng (dấu hiệu kinh điển của lỗi UTC vs `Asia/Ho_Chi_Minh` bị lẫn lộn).

**Quy tắc phân trang (Pagination) — bắt buộc cho mọi API lấy danh sách:**

Mọi API dạng `GET /products`, `GET /orders`... bắt buộc hỗ trợ query param `page` (mặc định = 1) và `limit` (mặc định = 10, tối đa = 100). Response phải bọc trong object có `meta`:

```json
{
  "success": true,
  "data": [ { "...": "..." }, { "...": "..." } ],
  "meta": {
    "current_page": 1,
    "limit": 10,
    "total_items": 150,
    "total_pages": 15
  },
  "timestamp": "2026-07-11T10:00:00Z"
}
```

**Format response lỗi (đồng nhất toàn hệ thống):**

```json
{
  "success": false,
  "error": {
    "code": "INVENTORY_INSUFFICIENT",
    "message": "Không đủ số lượng hàng tồn kho để bán."
  },
  "timestamp": "2026-07-11T10:00:00Z",
  "trace_id": "req-xxxxxx"
}
```

**Quy tắc tài liệu hóa API (Swagger/OpenAPI):**
- Cấm viết tay trực tiếp cấu trúc schema JSON (VD: `schema: { example: ... }`) lồng vào bên trong file Controller/Router vì làm rối code và khó tái sử dụng.
- **Bắt buộc dùng DTO làm Single Source of Truth:** Mọi cấu trúc dữ liệu trả về đều phải được định nghĩa trong Response DTO class/schema (VD: `LoginResponseDto`, `ApiErrorResponse`) kết hợp cùng các decorator mô tả (như `@ApiProperty()` của NestJS hoặc cấu hình `Field()` của Pydantic/FastAPI). Ở Controller, chỉ được tham chiếu tới class DTO này (VD: `@ApiResponse({ type: LoginResponseDto })`) để Swagger tự động quét và sinh tài liệu.

---

## 4. Validate dữ liệu đầu vào & Bảo mật dữ liệu

- Không tin tưởng dữ liệu từ client dưới bất kỳ hình thức nào
- **Bắt buộc validate tường minh (Strict Validation):** Bắt buộc phải khai báo rõ `@IsNotEmpty()` (hoặc `@IsOptional()`) trên **tất cả** các thuộc tính của Request DTO. Không được chỉ dùng mỗi decorator định dạng (như `@IsEmail()`, `@IsString()`) vì tuỳ phiên bản mà chúng có thể không tự động bắt lỗi nếu chuỗi rỗng/undefined.
- **NestJS:** dùng `class-validator` + DTO (`@IsNotEmpty()`, `@IsNumber()`...)
- **FastAPI:** dùng Pydantic Schema, tự validate theo type hint

**Chống Mass Assignment Attack** (hacker truyền thêm field ẩn nguy hiểm, VD `role: "admin"` khi đăng ký):
- **NestJS:** cấu hình `ValidationPipe` toàn cục với `{ whitelist: true, forbidNonWhitelisted: true }` → API tự động trả lỗi 400 nếu client gửi field không định nghĩa trong DTO.
- **FastAPI:** cấu hình Pydantic với `model_config = ConfigDict(extra="forbid")` trong từng Schema nhận input để từ chối dữ liệu thừa.

**Thống nhất format message lỗi validate giữa 2 backend:**
- 2 framework có format lỗi mặc định khác nhau hoàn toàn (NestJS: mảng message của `class-validator`; FastAPI: mảng object `loc`/`msg`/`type` của Pydantic) — **không được để lộ format mặc định này ra API**, vì đây là chỗ dễ khiến 2 backend "khác hành vi" nhất dù cùng 1 validate logic.
- Tự định nghĩa 1 format chung, ví dụ: `"<field>: <lý do>"`, nhiều lỗi nối nhau bằng `", "` (VD: `"email: must be a valid email, password: must be at least 6 characters"`).
- NestJS: override `exceptionFactory` trong `ValidationPipe` để map lỗi `class-validator` sang format chung. FastAPI: viết `exception_handler` riêng cho `RequestValidationError` để map lỗi Pydantic sang cùng format.
- Viết 1 test case duy nhất (VD: gửi email sai định dạng) và so sánh message trả về giữa 2 backend — nếu khác nhau tức là chưa đồng bộ xong.

---

## 5. Xử lý lỗi, Logging & Caching (Chiến lược Debug và Scale)

### 5.1. Exception Handling tập trung
- Trả HTTP Status Code chung ở ngoài (400, 401, 422, 500) kết hợp Error Code cụ thể bằng chữ trong body response (VD: `AUTH_INVALID_TOKEN`, `PRODUCT_NOT_FOUND`).
- **NestJS:** dùng 1 `Global Exception Filter` duy nhất.
- **FastAPI:** dùng 1 `exception_handler` toàn cục cho từng loại Base Exception.
- **Pass-through error code, không đè thành `INTERNAL_ERROR`:** tầng transport (Exception Filter/Handler, hoặc lớp trung gian như WebSocket Gateway) **không được tự ý đổi một business error code hợp lệ** (VD: `INVENTORY_INSUFFICIENT`, `EMAIL_EXISTS`) **thành `INTERNAL_ERROR`** chỉ vì code đó không nằm trong 1 whitelist cứng được hard-code sẵn ở tầng đó. Chỉ fallback về `INTERNAL_ERROR` khi exception ném ra thực sự **không phải** 1 Business Exception đã được định nghĩa (VD: lỗi không bắt được, lỗi driver DB). Đây là lỗi rất dễ mắc khi có nhiều tầng xử lý exception lồng nhau (VD: Controller → Gateway → Global Filter), mỗi tầng lại tự ý áp thêm 1 lớp lọc code.

### 5.2. Phân tầng Log Level & Cơ chế Trace ID (Request ID)
- Nghiêm cấm dùng `console.log()`/`print()` tùy tiện. Log phải có cấu trúc JSON gồm: `timestamp`, `level`, `requestId`, `userId`, `message`.
- **Cơ chế Trace ID:** khi request vào hệ thống, Middleware bắt buộc tạo/lấy `X-Request-ID` (UUIDv4). ID này phải đính kèm mọi dòng log phát sinh trong request đó, và trả về trong Response Header cho client để phục vụ debug.
- **Quy định Log Level:**
  - `INFO`: sự kiện hệ thống quan trọng (khởi động app, kết nối DB/Redis thành công)
  - `WARN`: lỗi do phía client (validate failed, sai mật khẩu, access denied)
  - `ERROR`: lỗi hệ thống nghiêm trọng (sập DB, lỗi logic gây sập luồng) — bắt buộc kèm Stack Trace nội bộ, nhưng chỉ trả lỗi chung chung kèm `trace_id` ra cho client để đảm bảo bảo mật
- Tuyệt đối không log thông tin nhạy cảm (mật khẩu thô, số thẻ, mã PIN...)
- **(Điều chỉnh cho quy mô local)** Đây là app chạy trong mạng nội bộ 1 cửa hàng mini, không cần hệ thống log tập trung (Loki/Elasticsearch) — chỉ cần ghi log JSON có cấu trúc như trên vào file `app.log` cục bộ (hoặc terminal) là đủ. Vẫn giữ `requestId` trong từng dòng log vì đây là thứ dễ chấm điểm kỹ thuật và không tốn thêm hạ tầng.

### 5.3. Chiến lược Caching & Rate Limiting bằng Redis
- **Cache dữ liệu đọc nhiều, ít thay đổi:** danh mục sản phẩm, cấu hình cửa hàng. Khi API thay đổi dữ liệu (`POST`/`PATCH`/`PUT`/`DELETE`), Service phụ trách bắt buộc làm sạch cache cũ (evict cache) để đảm bảo tính nhất quán.
  - **Ngoại lệ bắt buộc:** API cảnh báo tồn kho thấp / cảnh báo gần hết hạn sử dụng **không được đọc từ cache** — xem quy tắc chi tiết ở Mục 10.
  - **Ví dụ bắt buộc phải xử lý đúng — cập nhật giá sản phẩm:** khi Admin `PATCH /products/:id` để sửa giá (VD: 20.000đ → 25.000đ), Service xử lý request này **bắt buộc gọi `redis.del(key)` xóa đúng cache key của sản phẩm đó** (VD: `products:detail:{id}`) và cache danh sách liên quan (VD: `products:list:*` nếu có) **trong cùng logic xử lý, trước khi trả response thành công** — không được để việc evict cache là bước "tùy chọn" hay chạy bất đồng bộ không kiểm soát. Nếu bỏ sót bước này, quầy POS quét mã vạch sẽ tiếp tục đọc cache cũ và tính sai giá cho khách đến khi cache tự hết hạn theo TTL — đây là lỗi nghiệp vụ nghiêm trọng (thất thoát tiền hoặc tính sai tiền khách hàng), không chỉ là vấn đề hiệu năng.
  - Viết 1 test: cập nhật giá qua API, sau đó gọi lại API lấy sản phẩm/API tính tiền ngay lập tức (không chờ TTL) và verify giá trả về là giá mới, ở cả 2 backend.
- **TTL (Time To Live):** cấu hình tường minh qua `.env`, không hard-code (VD: `REDIS_CACHE_TTL=3600`).
- **Fault Tolerance:** nếu Redis sập, hệ thống KHÔNG được crash — khối gọi Redis phải có try/catch để fallback về truy vấn trực tiếp Database.
- **Rate Limiting (thu gọn cho quy mô local):** app chạy trong mạng nội bộ cửa hàng, số tài khoản thu ngân rất ít, nên **không áp dụng Rate Limiting cho các API nghiệp vụ** (tạo đơn hàng, quét sản phẩm...) — nếu cấu hình không khéo sẽ khóa nhầm tài khoản thu ngân khi khách mua nhiều món, quét liên tục 20-30 lần trong thời gian ngắn.
  - **Ngoại lệ vẫn cần giữ:** `POST /auth/login` vẫn nên có Rate Limiting (đếm số lần thử sai trong 1 khoảng thời gian, lưu Redis hoặc kể cả biến in-memory) để chống brute-force mật khẩu — rủi ro này không phụ thuộc vào việc app chạy nội bộ hay ra Internet.

---

## 6. Quản lý cấu hình & môi trường

- Không hard-code thông tin nhạy cảm: kết nối DB, thông tin xác thực Redis, JWT Secret
- Dùng `.env` kết hợp thư viện validate biến môi trường ngay khi khởi động app (thiếu biến bắt buộc → app crash ngay lập tức để phát hiện sớm)
- Có tối thiểu 3 môi trường: `development`, `test`, `production`

**Ép kiểu tường minh cho biến môi trường số/thời gian — không tin vào type hint compile-time:**
- Mọi biến môi trường đọc từ `process.env`/`os.getenv()` đều là **string thô** ở runtime, bất kể có khai báo type hint gì ở compile-time. NestJS dùng generic `configService.get<number>('JWT_EXPIRATION')` chỉ ép kiểu lúc biên dịch TypeScript — **runtime vẫn nhận về string**, dẫn tới bug kinh điển: thư viện JWT hiểu nhầm giá trị dạng string không đơn vị là mili-giây (do cơ chế `ms()` bên trong) thay vì giây, khiến token hết hạn sai lệch nghiêm trọng so với bên FastAPI (vốn ép kiểu tường minh bằng `int(os.getenv(...))`).
- **Quy tắc bắt buộc:** luôn ép kiểu tường minh tại runtime cho biến môi trường dạng số/thời gian, ở cả 2 backend:
  - NestJS: `parseInt(configService.get<string>('JWT_EXPIRATION') ?? '3600', 10)`
  - FastAPI: `int(os.getenv('JWT_EXPIRATION', '3600'))`, hoặc khai báo type `int` trong Pydantic Settings (Pydantic tự ép kiểu đúng ở runtime, không chỉ compile-time)
- Đây là ví dụ điển hình cho việc **cùng 1 config, 2 framework xử lý runtime type khác nhau** — nên viết 1 test riêng để verify giá trị `exp` trong JWT payload đúng bằng `JWT_EXPIRATION` giây kể từ lúc phát hành, chạy test này trên cả 2 backend để đối chiếu.

---

## 7. Quản lý thư viện (Dependency Management) — Chỉ cài khi thực sự dùng

**Nguyên tắc bắt buộc:** không cài sẵn thư viện "phòng khi cần" — chỉ khi code thực sự cần dùng đến một chức năng (VD: bắt đầu viết logic cache thì mới cài Redis client, bắt đầu viết test thì mới cài Pytest) thì mới thêm thư viện đó vào dự án.

**Lý do:**
- Tránh phình `node_modules`/`.venv` với thư viện không dùng tới → ảnh hưởng thời gian build, thời gian cài đặt (CI/CD), và cả dung lượng Docker image khi deploy
- Thư viện thừa = thêm bề mặt tấn công bảo mật (mỗi package là 1 điểm có thể bị lỗ hổng/CVE), mà không mang lại giá trị gì
- Giúp file quản lý dependency (`package.json` / `requirements.txt`/`pyproject.toml`) phản ánh đúng những gì hệ thống thực sự dùng — dễ đọc, dễ audit, dễ debug khi có xung đột version
- Khi so sánh 2 framework, số lượng & loại thư viện thực dùng cũng là 1 tiêu chí khách quan phản ánh mức độ "nặng/nhẹ" của mỗi hệ sinh thái — nếu cài dư sẽ làm sai lệch số liệu so sánh

**Quy tắc thực thi cụ thể:**
- Trước khi chạy `npm install <package>` hoặc `pip install <package> --break-system-packages`, phải xác định rõ: package này phục vụ tính năng nào đang code ngay lúc đó — không cài theo kiểu liệt kê sẵn danh sách "để dành"
- Không copy nguyên `package.json`/`requirements.txt` mẫu từ project khác rồi cài hết một lượt
- Định kỳ (VD: trước mỗi lần release/tag) rà soát và gỡ các thư viện không còn được import ở đâu trong code:
  - NestJS: dùng `depcheck` để phát hiện dependency không dùng tới
  - FastAPI: dùng `pip-autoremove`, hoặc rà thủ công bằng cách grep tên package trong toàn bộ `import`/`from`
- Ghi chú ngắn (comment hoặc trong README module) lý do thêm thư viện nếu đó là thư viện ít phổ biến, để người review/bản thân sau này biết vì sao nó có mặt

---

## 8. Hạ tầng Docker: Database & Redis tách biệt cho từng backend

**Nguyên tắc:** cùng loại engine, cùng schema, cùng dữ liệu seed — nhưng **mỗi backend chạy 1 bộ Database + Redis riêng** (container tách biệt), không dùng chung 1 instance cho cả 2 framework cùng lúc.

**Lý do:**
- Tránh 2 backend cùng ghi/đọc chung dữ liệu gây race condition (VD: cùng trừ tồn kho) làm sai lệch kết quả không phải do framework mà do đụng độ dữ liệu
- Tránh nhiễu số liệu benchmark: nếu đang load-test NestJS mà FastAPI vẫn đang chạy chung DB/Redis, connection pool và I/O bị chia sẻ → kết quả performance không phản ánh đúng framework
- Dễ reset dữ liệu độc lập cho từng bên khi cần seed lại để đo lại

**`docker-compose.yml` mẫu:**

```yaml
services:
  db_nestjs:
    image: postgres:16
    ports: ["5433:5432"]
    environment:
      POSTGRES_DB: store_nestjs
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      TZ: UTC
      PGTZ: UTC
    volumes:
      - pgdata_nestjs:/var/lib/postgresql/data

  redis_nestjs:
    image: redis:7-alpine
    ports: ["6380:6379"]

  db_fastapi:
    image: postgres:16
    ports: ["5434:5432"]
    environment:
      POSTGRES_DB: store_fastapi
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      TZ: UTC
      PGTZ: UTC
    volumes:
      - pgdata_fastapi:/var/lib/postgresql/data

  redis_fastapi:
    image: redis:7-alpine
    ports: ["6381:6379"]

  backend_nestjs:
    build: ./backend-nestjs
    ports: ["3000:3000"]
    depends_on: [db_nestjs, redis_nestjs]
    environment:
      DATABASE_URL: postgres://postgres:postgres@db_nestjs:5432/store_nestjs
      REDIS_URL: redis://redis_nestjs:6379
      TZ: UTC

  backend_fastapi:
    build: ./backend-fastapi
    ports: ["8000:8000"]
    depends_on: [db_fastapi, redis_fastapi]
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db_fastapi:5432/store_fastapi
      REDIS_URL: redis://redis_fastapi:6379
      TZ: UTC

volumes:
  pgdata_nestjs:
  pgdata_fastapi:
```

**Quy tắc kèm theo:**
- Cùng 1 script seed dữ liệu (SQL hoặc script riêng) chạy vào cả 2 DB lúc khởi tạo để đảm bảo dữ liệu đầu vào giống hệt nhau tuyệt đối
- Giới hạn tài nguyên (CPU/RAM) bằng nhau cho 2 cặp container qua `deploy.resources.limits` (Docker Compose v3) hoặc `--cpus`/`--memory` khi chạy `docker run`, để đo hiệu năng công bằng — không để 1 bên được cấp tài nguyên nhiều hơn
- Khi benchmark 1 backend, tắt hẳn (`docker compose stop`) container backend + Redis + DB của bên còn lại, tránh chạy song song gây nhiễu tải CPU/RAM chung của máy
- Không commit thư mục volume dữ liệu (`pgdata_*`) vào Git — thêm vào `.gitignore`

---

## 9. Database, Migration & Xóa mềm (Soft Delete)

- Bắt buộc dùng **migration** để quản lý lịch sử thay đổi schema. Mỗi thay đổi = 1 file migration có timestamp rõ ràng. Tuyệt đối không bật `synchronize: true` (hay tương đương) trên môi trường staging/production.
- **Quy tắc Soft Delete:** trong ngành bán lẻ, dữ liệu hóa đơn/sản phẩm cũ không bao giờ xóa thật (hard delete) để phục vụ báo cáo doanh thu lịch sử.
  - Mọi bảng dữ liệu chính bắt buộc có 3 trường audit: `created_at`, `updated_at`, `deleted_at` (mặc định `NULL`)
  - Hành động xóa = cập nhật `deleted_at` = thời điểm hiện tại
  - Mọi câu lệnh `GET` danh sách mặc định phải loại bỏ bản ghi đã có `deleted_at`
  - **Ngoại lệ bắt buộc cho API báo cáo/lịch sử giao dịch:** quy tắc "loại bỏ `deleted_at`" ở trên **chỉ áp dụng cho các API nghiệp vụ thông thường** (VD: danh sách sản phẩm đang bán, danh sách nhân viên đang làm việc). Riêng các API **báo cáo doanh thu, báo cáo tài chính, lịch sử giao dịch/hóa đơn** thì **KHÔNG được lọc `deleted_at IS NULL`** — phải tính cả những sản phẩm đã ngừng kinh doanh và nhân viên đã nghỉ việc, vì hóa đơn cũ vẫn tham chiếu tới các bản ghi đó. Nếu vô tình áp dụng chung 1 filter `deleted_at IS NULL` cho cả 2 loại API (thường xảy ra khi dùng chung 1 hàm CRUD `findAll()` mặc định cho mọi mục đích), số tiền trên báo cáo sẽ bị thiếu so với thực tế đã bán.
  - Khuyến nghị kỹ thuật: tách riêng hàm truy vấn cho tầng báo cáo (VD: `findAllForReport()` không áp filter soft-delete) khỏi hàm CRUD mặc định (VD: `findAll()` có áp filter) ngay từ tầng `Repository`/`crud.py`, tránh tình trạng tầng Service tầng trên quên truyền thêm điều kiện lúc gọi.
  - Viết 1 test: soft-delete 1 sản phẩm đã từng có trong hóa đơn cũ, sau đó gọi API báo cáo doanh thu và verify tổng tiền vẫn bao gồm hóa đơn đó, ở cả 2 backend.

---

## 10. Transaction & Row Locking (tránh race condition & deadlock)

Áp dụng cho mọi thao tác đọc-rồi-ghi có thể bị nhiều request chạy đồng thời (VD: tạo đơn hàng → trừ tồn kho; 2 nhân viên cùng bán sản phẩm cuối cùng trong kho):

- **Toàn bộ chuỗi "kiểm tra điều kiện → ghi dữ liệu" phải nằm trong 1 transaction có row-lock** (`SELECT ... FOR UPDATE`), không tách riêng câu `SELECT` kiểm tra và câu `UPDATE` ghi dữ liệu ở 2 lệnh độc lập — nếu tách riêng, 2 request đồng thời có thể cùng đọc thấy tồn kho đủ hàng rồi cùng trừ kho, dẫn tới bán vượt tồn kho thực tế.
- **Thứ tự khóa (lock order) phải cố định và giống nhau ở MỌI nơi trong code, ở CẢ 2 backend** — VD: nếu 1 giao dịch cần khóa cả bảng `products` (kiểm tra tồn kho) và `orders` (tạo đơn), luôn khóa theo đúng 1 thứ tự nhất quán (VD: luôn khóa `products` trước, `orders` sau). Nếu để lẫn lộn thứ tự khóa giữa các đoạn code khác nhau (hoặc khác nhau giữa NestJS và FastAPI), 2 transaction chạy song song có thể khóa chéo nhau → **deadlock**, một lỗi rất khó tái hiện và khó debug vì chỉ xảy ra khi có tải đồng thời.
- Side-effect phụ (cập nhật cache Redis, ghi log, gửi notification) thực hiện **sau khi transaction chính đã commit thành công**, và lỗi ở bước side-effect **không được rollback lại transaction chính** — chỉ log lại lỗi. (VD: transaction trừ kho + tạo đơn hàng thành công, nhưng cache Redis cập nhật tồn kho bị lỗi → đơn hàng vẫn giữ nguyên, chỉ log warning, không hủy đơn).
- Viết ít nhất 1 test giả lập race condition (VD: gửi đồng thời 2 request bán cùng 1 sản phẩm chỉ còn 1 tồn kho) để verify chỉ 1 trong 2 request thành công — chạy test này trên cả 2 backend để đối chiếu hành vi.

**Cảnh báo nghiệp vụ kinh điển — Cache tồn kho làm "vô hiệu hóa" cảnh báo tồn kho thấp:**
- Nếu danh sách/số lượng tồn kho được cache lên Redis để tăng tốc `GET /products`, thì theo đúng quy tắc "side-effect không rollback" ở trên, việc cập nhật cache sau khi bán hàng có thể lỗi hoặc bị quên mà transaction chính (trừ kho trong DB) vẫn commit bình thường.
- Hậu quả: DB đã trừ kho xuống mức báo động (VD: từ 5 xuống 2), nhưng API cảnh báo tồn kho thấp nếu đọc từ Redis vẫn thấy tồn `5` → không phát cảnh báo → cửa hàng đứt hàng mà quản lý không hề hay biết.
- **Quy tắc bắt buộc:** riêng API kiểm tra tồn kho thấp và API kiểm tra hàng gần hết hạn sử dụng (dùng để phát cảnh báo) **luôn luôn query trực tiếp từ Database, tuyệt đối không đọc qua Cache/Redis**, kể cả khi các API khác (VD: `GET /products` hiển thị danh mục) vẫn được phép dùng cache. Đây là API duy nhất được phép "hy sinh" tốc độ để đổi lấy tính chính xác real-time.

---

## 11. Bảo mật tối thiểu (bắt buộc)

- **Mật khẩu:** hash một chiều bằng `bcrypt`, không bao giờ lưu văn bản thô
- **Xác thực (thu gọn cho quy mô local):** JWT với Access Token hạn ngắn (VD: 5-15 phút) và Refresh Token hạn dài hơn (VD: 7 ngày), lưu Refresh Token trong Database (kèm thông tin session: user, thiết bị, thời điểm tạo). Vì đây là app local, số tài khoản thu ngân rất ít, **không bắt buộc phải cài cơ chế Blacklist Access Token bằng Redis khi logout** — chỉ cần xóa/vô hiệu hóa Refresh Token tương ứng trong DB khi logout là đủ an toàn: Access Token cũ (nếu có ai đó cố dùng lại) cũng tự hết hạn rất nhanh vì thời hạn ngắn, và không thể refresh tiếp vì Refresh Token đã bị xóa.
  - Nếu muốn nâng cao hơn (và có thời gian), vẫn có thể làm Blacklist Redis như 1 phần "mở rộng" để so sánh trade-off phức tạp code vs mức độ an toàn tăng thêm — nhưng không bắt buộc để đúng tiến độ đồ án.
- **Phân quyền (RBAC):** kiểm tra tập trung ở tầng Guard (NestJS) hoặc Middleware/`Depends` (FastAPI), không viết rải rác trong Service

---

## 12. Testing & Chất lượng mã nguồn

- Tập trung Unit Test cho tầng Service (nơi chứa logic phức tạp nhất: tính tiền, trừ kho)
- **NestJS:** Jest (có sẵn khi khởi tạo project)
- **FastAPI:** Pytest + `TestClient`
- Đo code coverage; tối thiểu phủ các case: tạo đơn hàng thành công, tạo đơn khi hết hàng, đăng nhập sai thông tin

---

## 13. Git & Quy trình làm việc

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:` (VD: `feat(product): add barcode field`)
- Tách 2 thư mục con độc lập trong cùng 1 repo để dễ đối chiếu: `/backend-nestjs` và `/backend-fastapi`
- Tag lại các mốc quan trọng (VD: `v1.0-nestjs-auth-done`) để đo lại thời gian phát triển từng mốc

---

## 14. Checklist "Definition of Done" cho mỗi tính năng

Một tính năng chỉ được tính là hoàn thành khi:
- [ ] Có validate input đầy đủ và bảo mật chống Mass Assignment
- [ ] Có xử lý lỗi tập trung, trả đúng mã lỗi nội bộ kèm `trace_id`
- [ ] Áp dụng đúng quy tắc phân trang (Pagination) nếu là API lấy danh sách
- [ ] Áp dụng đúng cơ chế Soft Delete nếu là API xóa
- [ ] Có áp dụng Caching (nếu thuộc phạm vi tài nguyên chỉ định); riêng API cảnh báo tồn kho thấp/gần hết hạn không được dùng cache. Rate Limiting chỉ bắt buộc cho `POST /auth/login`, không áp dụng cho API nghiệp vụ
- [ ] Có ít nhất 1 Unit Test chạy thành công
- [ ] Đã cập nhật và kiểm tra tài liệu API tự động (Swagger UI/OpenAPI)
- [ ] Không có thư viện nào được cài thêm mà không phục vụ trực tiếp tính năng vừa code
- [ ] Khi benchmark, chỉ container của backend đang đo (+ DB/Redis riêng của nó) đang chạy, backend còn lại đã tắt
- [ ] Response (status code, format lỗi, message) đã đối chiếu giống hệt giữa 2 backend theo `API_CONTRACT.md`
- [ ] Nếu có thao tác đọc-rồi-ghi đồng thời (VD: trừ tồn kho), đã dùng row-lock đúng thứ tự khóa quy ước chung
- [ ] Mọi timestamp sinh ra (`created_at`, `updated_at`...) đã theo UTC nhất quán ở cả DB/Node.js/Python runtime, không bị lệch múi giờ giữa 2 backend

---

## 15. Ma trận so sánh & đo lường hiệu năng (dành cho phần Kết luận của tiểu luận)

Sau khi hoàn thiện cả 2 phiên bản dựa trên cùng bộ rule này, tiến hành đo lường định lượng và định tính:

| Tiêu chí | Cách đo | Công cụ |
|---|---|---|
| Độ nặng mã nguồn (Boilerplate) | Đếm số file/dòng code cần thiết để setup cấu trúc phân lớp | `cloc` |
| Tốc độ thực thi (Performance) | Benchmark `GET /api/v1/products` khi có Redis Cache và không có Cache; so sánh RPS và Latency | `autocannon`, `wrk`, `k6` |
| Tài nguyên hệ thống | Đo RAM/CPU của NestJS (Node.js runtime) và FastAPI (Uvicorn) lúc idle và lúc chịu tải | `docker stats` |
| Trải nghiệm phát triển (DX) | So sánh cơ chế Mocking của Jest (NestJS) và `app.dependency_overrides` của FastAPI khi viết test | Định tính |

---

### Ghi chú áp dụng
Bộ rule này là **bắt buộc như nhau cho cả 2 backend** — đây chính là điều kiện để việc so sánh NestJS vs FastAPI công bằng: chỉ framework là biến số thay đổi, còn kiến trúc, quy ước, mức độ nghiêm ngặt về bảo mật/logging/testing phải giống hệt nhau.
