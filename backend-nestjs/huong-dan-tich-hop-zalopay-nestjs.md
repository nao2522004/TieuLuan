# Hướng dẫn tích hợp thanh toán ZaloPay với NestJS

Tài liệu này hướng dẫn xây dựng module thanh toán với ZaloPay trong NestJS, gồm 6 chức năng: **tạo đơn hàng**, **truy vấn trạng thái đơn hàng**, **nhận callback**, **hủy đơn hàng**, **hoàn tiền**, và **truy vấn trạng thái hoàn tiền**.

Tham khảo tài liệu gốc:
- https://docs.zalopay.vn/docs/openapi
- https://docs.zalopay.vn/docs/developer-tools/knowledge-base/status-codes

---

## 1. Chuẩn bị

### 1.1. Cài đặt package

```bash
npm install @nestjs/config @nestjs/axios axios
```

Không cần thêm thư viện HMAC riêng — dùng module `crypto` có sẵn của Node.js.

### 1.2. Biến môi trường (`.env`)

```env
ZALOPAY_APP_ID=2554
ZALOPAY_KEY1=sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn
ZALOPAY_KEY2=trMrHtvjo6myautxDUiAcYsVtaeQ8nhu
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2
ZALOPAY_CALLBACK_URL=https://your-domain.com/api/payment/zalopay/callback
```

> `app_id`, `key1`, `key2` là thông tin sandbox mẫu của ZaloPay dùng để test — khi lên production, thay bằng thông tin thật được cấp qua Merchant Portal.

---

## 2. Cấu trúc thư mục

```
src/
  payment/
    zalopay/
      zalopay.module.ts
      zalopay.service.ts
      zalopay.controller.ts
      dto/
        create-order.dto.ts
        query-order.dto.ts
        cancel-order.dto.ts
        refund-order.dto.ts
        query-refund.dto.ts
      interfaces/
        zalopay-response.interface.ts
      utils/
        hmac.util.ts
```

---

## 3. Hàm tiện ích tính chữ ký MAC

`src/payment/zalopay/utils/hmac.util.ts`

```typescript
import * as crypto from 'crypto';

export function hmacSHA256(data: string, key: string): string {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}
```

---

## 4. DTO

`src/payment/zalopay/dto/create-order.dto.ts`

```typescript
export class CreateZaloPayOrderDto {
  app_user: string;      // id/username người dùng
  amount: number;        // số tiền (VNĐ)
  description: string;   // mô tả đơn hàng
  embed_data?: Record<string, any>; // ví dụ: { redirecturl: '...' }
  item?: any[];          // danh sách sản phẩm, để trống nếu không cần
}
```

`src/payment/zalopay/dto/query-order.dto.ts`

```typescript
export class QueryZaloPayOrderDto {
  app_trans_id: string; // mã giao dịch đã tạo trước đó
}
```

`src/payment/zalopay/dto/cancel-order.dto.ts`

```typescript
export class CancelZaloPayOrderDto {
  app_trans_id: string; // mã giao dịch cần hủy (chỉ hủy được khi đơn CHƯA thanh toán thành công)
}
```

`src/payment/zalopay/dto/refund-order.dto.ts`

```typescript
export class RefundZaloPayOrderDto {
  zp_trans_id: string;        // mã giao dịch ZaloPay (lấy từ callback hoặc queryOrder)
  amount: number;             // số tiền hoàn
  description: string;        // lý do hoàn tiền
  refund_fee_amount?: number; // phí hoàn tiền (nếu có), trừ vào số tiền user nhận lại
}
```

`src/payment/zalopay/dto/query-refund.dto.ts`

```typescript
export class QueryRefundStatusDto {
  m_refund_id: string; // mã hoàn tiền do merchant tự sinh khi gọi refund
}
```

---

## 5. Interface response

`src/payment/zalopay/interfaces/zalopay-response.interface.ts`

```typescript
export interface ZaloPayCreateOrderResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  zp_trans_token?: string;
  order_url?: string;
  order_token?: string;
  qr_code?: string;
}

export interface ZaloPayQueryOrderResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  is_processing?: boolean;
  amount?: number;
  zp_trans_id?: number;
  server_time?: number;
  discount_amount?: number;
}

export interface ZaloPayCancelOrderResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
}

export interface ZaloPayRefundResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
  refund_id?: number; // mã hoàn tiền của ZaloPay, cần lưu lại để đối soát
}

export interface ZaloPayQueryRefundResponse {
  return_code: number;
  return_message: string;
  sub_return_code: number;
  sub_return_message: string;
}
```

---

## 6. Service

`src/payment/zalopay/zalopay.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { hmacSHA256 } from './utils/hmac.util';
import { CreateZaloPayOrderDto } from './dto/create-order.dto';
import { QueryZaloPayOrderDto } from './dto/query-order.dto';
import { CancelZaloPayOrderDto } from './dto/cancel-order.dto';
import { RefundZaloPayOrderDto } from './dto/refund-order.dto';
import { QueryRefundStatusDto } from './dto/query-refund.dto';
import {
  ZaloPayCreateOrderResponse,
  ZaloPayQueryOrderResponse,
  ZaloPayCancelOrderResponse,
  ZaloPayRefundResponse,
  ZaloPayQueryRefundResponse,
} from './interfaces/zalopay-response.interface';

@Injectable()
export class ZaloPayService {
  private readonly logger = new Logger(ZaloPayService.name);

  private readonly appId: string;
  private readonly key1: string;
  private readonly key2: string;
  private readonly endpoint: string;
  private readonly callbackUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
  ) {
    this.appId = this.config.get<string>('ZALOPAY_APP_ID');
    this.key1 = this.config.get<string>('ZALOPAY_KEY1');
    this.key2 = this.config.get<string>('ZALOPAY_KEY2');
    this.endpoint = this.config.get<string>('ZALOPAY_ENDPOINT');
    this.callbackUrl = this.config.get<string>('ZALOPAY_CALLBACK_URL');
  }

  /**
   * Sinh app_trans_id theo format yymmdd_<random>
   */
  private generateAppTransId(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const random = Date.now(); // hoặc dùng uuid/orderId thật của bạn
    return `${yy}${mm}${dd}_${random}`;
  }

  /**
   * Sinh m_refund_id theo format yymmdd_appid_<random>
   */
  private generateMRefundId(): string {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const random = Date.now();
    return `${yy}${mm}${dd}_${this.appId}_${random}`;
  }

  /**
   * 1. Tạo đơn hàng
   */
  async createOrder(
    dto: CreateZaloPayOrderDto,
  ): Promise<ZaloPayCreateOrderResponse & { app_trans_id: string }> {
    const appTransId = this.generateAppTransId();
    const appTime = Date.now();
    const embedData = JSON.stringify(dto.embed_data ?? {});
    const item = JSON.stringify(dto.item ?? []);

    const hmacInput = [
      this.appId,
      appTransId,
      dto.app_user,
      dto.amount,
      appTime,
      embedData,
      item,
    ].join('|');

    const mac = hmacSHA256(hmacInput, this.key1);

    const payload = {
      app_id: Number(this.appId),
      app_user: dto.app_user,
      app_trans_id: appTransId,
      app_time: appTime,
      amount: dto.amount,
      description: dto.description,
      item,
      embed_data: embedData,
      callback_url: this.callbackUrl,
      mac,
    };

    try {
      const response = await firstValueFrom(
        this.http.post<ZaloPayCreateOrderResponse>(
          `${this.endpoint}/create`,
          payload,
        ),
      );

      return { ...response.data, app_trans_id: appTransId };
    } catch (error) {
      this.logger.error('ZaloPay createOrder failed', error?.response?.data ?? error);
      throw error;
    }
  }

  /**
   * 2. Truy vấn trạng thái đơn hàng
   */
  async queryOrder(
    dto: QueryZaloPayOrderDto,
  ): Promise<ZaloPayQueryOrderResponse> {
    const hmacInput = `${this.appId}|${dto.app_trans_id}|${this.key1}`;
    const mac = hmacSHA256(hmacInput, this.key1);

    const payload = {
      app_id: Number(this.appId),
      app_trans_id: dto.app_trans_id,
      mac,
    };

    try {
      const response = await firstValueFrom(
        this.http.post<ZaloPayQueryOrderResponse>(
          `${this.endpoint}/query`,
          payload,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error('ZaloPay queryOrder failed', error?.response?.data ?? error);
      throw error;
    }
  }

  /**
   * 3. Hủy đơn hàng (chỉ hủy được khi đơn CHƯA thanh toán thành công)
   */
  async cancelOrder(
    dto: CancelZaloPayOrderDto,
  ): Promise<ZaloPayCancelOrderResponse> {
    const hmacInput = `${this.appId}|${dto.app_trans_id}|${this.key1}`;
    const mac = hmacSHA256(hmacInput, this.key1);

    const payload = {
      app_id: Number(this.appId),
      app_trans_id: dto.app_trans_id,
      mac,
    };

    try {
      const response = await firstValueFrom(
        this.http.post<ZaloPayCancelOrderResponse>(
          `${this.endpoint}/cancel`,
          payload,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error('ZaloPay cancelOrder failed', error?.response?.data ?? error);
      throw error;
    }
  }

  /**
   * 4. Hoàn tiền cho một giao dịch đã thanh toán thành công
   * Đây là API bất đồng bộ: gọi xong cần dùng queryRefundStatus để kiểm tra kết quả cuối cùng.
   */
  async refund(
    dto: RefundZaloPayOrderDto,
  ): Promise<ZaloPayRefundResponse & { m_refund_id: string }> {
    const mRefundId = this.generateMRefundId();
    const timestamp = Date.now();

    const hmacInput = dto.refund_fee_amount
      ? [
          this.appId,
          dto.zp_trans_id,
          dto.amount,
          dto.refund_fee_amount,
          dto.description,
          timestamp,
        ].join('|')
      : [this.appId, dto.zp_trans_id, dto.amount, dto.description, timestamp].join(
          '|',
        );

    const mac = hmacSHA256(hmacInput, this.key1);

    const payload: Record<string, any> = {
      app_id: Number(this.appId),
      m_refund_id: mRefundId,
      zp_trans_id: dto.zp_trans_id,
      amount: dto.amount,
      timestamp,
      description: dto.description,
      mac,
    };

    if (dto.refund_fee_amount) {
      payload.refund_fee_amount = dto.refund_fee_amount;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<ZaloPayRefundResponse>(
          `${this.endpoint}/refund`,
          payload,
        ),
      );
      return { ...response.data, m_refund_id: mRefundId };
    } catch (error) {
      this.logger.error('ZaloPay refund failed', error?.response?.data ?? error);
      throw error;
    }
  }

  /**
   * 5. Truy vấn trạng thái hoàn tiền
   */
  async queryRefundStatus(
    dto: QueryRefundStatusDto,
  ): Promise<ZaloPayQueryRefundResponse> {
    const timestamp = Date.now();
    const hmacInput = `${this.appId}|${dto.m_refund_id}|${timestamp}`;
    const mac = hmacSHA256(hmacInput, this.key1);

    const payload = {
      app_id: Number(this.appId),
      m_refund_id: dto.m_refund_id,
      timestamp,
      mac,
    };

    try {
      const response = await firstValueFrom(
        this.http.post<ZaloPayQueryRefundResponse>(
          `${this.endpoint}/query_refund`,
          payload,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        'ZaloPay queryRefundStatus failed',
        error?.response?.data ?? error,
      );
      throw error;
    }
  }

  /**
   * 6. Xác thực & xử lý callback từ ZaloPay
   */
  verifyCallback(data: string, reqMac: string): boolean {
    const mac = hmacSHA256(data, this.key2);
    return mac === reqMac;
  }
}
```

> Lưu ý: `ZALOPAY_ENDPOINT` sandbox thường là `https://sb-openapi.zalopay.vn/v2` với các path `/create` và `/query`. Khi triển khai thật, kiểm tra lại path chính xác trong **API Explorer** (`docs.zalopay.vn/docs/openapi`) vì có thể khác theo phiên bản API bạn được cấp.

---

## 7. Controller

`src/payment/zalopay/zalopay.controller.ts`

```typescript
import {
  Body,
  Controller,
  HttpCode,
  Post,
  Logger,
} from '@nestjs/common';
import { ZaloPayService } from './zalopay.service';
import { CreateZaloPayOrderDto } from './dto/create-order.dto';
import { QueryZaloPayOrderDto } from './dto/query-order.dto';
import { CancelZaloPayOrderDto } from './dto/cancel-order.dto';
import { RefundZaloPayOrderDto } from './dto/refund-order.dto';
import { QueryRefundStatusDto } from './dto/query-refund.dto';

@Controller('payment/zalopay')
export class ZaloPayController {
  private readonly logger = new Logger(ZaloPayController.name);

  constructor(private readonly zaloPayService: ZaloPayService) {}

  @Post('create-order')
  async createOrder(@Body() dto: CreateZaloPayOrderDto) {
    const result = await this.zaloPayService.createOrder(dto);

    // TODO: lưu app_trans_id + trạng thái "pending" vào DB tại đây
    // await this.orderService.saveOrder(result.app_trans_id, dto);

    return result;
  }

  @Post('query-order')
  async queryOrder(@Body() dto: QueryZaloPayOrderDto) {
    return this.zaloPayService.queryOrder(dto);
  }

  @Post('cancel-order')
  async cancelOrder(@Body() dto: CancelZaloPayOrderDto) {
    const result = await this.zaloPayService.cancelOrder(dto);

    // TODO: nếu return_code = 1 -> cập nhật trạng thái đơn hàng trong DB = "cancelled"

    return result;
  }

  @Post('refund')
  async refund(@Body() dto: RefundZaloPayOrderDto) {
    const result = await this.zaloPayService.refund(dto);

    // TODO: lưu m_refund_id + refund_id vào DB với trạng thái "processing"
    // Vì đây là API bất đồng bộ, cần gọi thêm queryRefundStatus để xác nhận kết quả cuối cùng
    // await this.refundService.saveRefund(result.m_refund_id, dto);

    return result;
  }

  @Post('query-refund-status')
  async queryRefundStatus(@Body() dto: QueryRefundStatusDto) {
    return this.zaloPayService.queryRefundStatus(dto);
  }

  /**
   * Endpoint nhận callback (webhook) từ ZaloPay Server.
   * Phải public, không qua AuthGuard.
   */
  @Post('callback')
  @HttpCode(200)
  async callback(@Body() body: { data: string; mac: string; type: number }) {
    const isValid = this.zaloPayService.verifyCallback(body.data, body.mac);

    if (!isValid) {
      this.logger.warn('Invalid ZaloPay callback MAC');
      return { return_code: -1, return_message: 'mac not equal' };
    }

    try {
      const orderData = JSON.parse(body.data);
      this.logger.log(
        `Callback OK - app_trans_id=${orderData.app_trans_id}, amount=${orderData.amount}`,
      );

      // TODO: cập nhật trạng thái đơn hàng = "success" trong DB
      // Nhớ xử lý idempotent: nếu đơn đã success thì bỏ qua, tránh cộng tiền/trạng thái 2 lần
      // await this.orderService.markAsPaid(orderData.app_trans_id, orderData);

      return { return_code: 1, return_message: 'success' };
    } catch (error) {
      this.logger.error('Callback processing error', error);
      // return_code = 0 -> ZaloPay sẽ gọi lại callback (tối đa 3 lần)
      return { return_code: 0, return_message: error.message };
    }
  }
}
```

---

## 8. Module

`src/payment/zalopay/zalopay.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ZaloPayService } from './zalopay.service';
import { ZaloPayController } from './zalopay.controller';

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [ZaloPayController],
  providers: [ZaloPayService],
  exports: [ZaloPayService],
})
export class ZaloPayModule {}
```

Đăng ký vào `AppModule`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZaloPayModule } from './payment/zalopay/zalopay.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ZaloPayModule,
  ],
})
export class AppModule {}
```

---

## 9. Loại trừ CSRF / Guard cho route callback

Nếu app có dùng `AuthGuard` toàn cục hoặc CSRF middleware, cần loại trừ route `payment/zalopay/callback` vì request này đến từ ZaloPay Server, không có JWT/session của user.

```typescript
// Ví dụ nếu dùng guard toàn cục qua APP_GUARD, có thể dùng decorator @Public()
@Public()
@Post('callback')
@HttpCode(200)
async callback(...) { ... }
```

---

## 10. Test luồng end-to-end

1. Gọi `POST /payment/zalopay/create-order` → nhận `order_url` hoặc `qr_code`.
2. Mở `order_url` trên trình duyệt (hoặc generate QR từ `qr_code`) → thanh toán bằng app ZaloPay sandbox / tài khoản test.
3. Sau khi thanh toán, server của bạn sẽ nhận `POST /payment/zalopay/callback` — kiểm tra log để thấy `return_code: 1`.
4. Gọi thêm `POST /payment/zalopay/query-order` với `app_trans_id` để double-check trạng thái, đặc biệt hữu ích khi test callback bị miss.
5. Muốn hủy đơn trước khi thanh toán: gọi `POST /payment/zalopay/cancel-order` với `app_trans_id`. Lưu ý: **chỉ hủy được đơn chưa thanh toán thành công** — nếu đơn đã "captured" sẽ nhận lỗi `-403 ORDER_ALREADY_CAPTURED`.
6. Muốn hoàn tiền một đơn đã thanh toán: gọi `POST /payment/zalopay/refund` với `zp_trans_id` lấy từ callback hoặc từ `queryOrder`. Đây là API **bất đồng bộ**, nên sau đó gọi `POST /payment/zalopay/query-refund-status` với `m_refund_id` để lấy kết quả cuối cùng (có thể cần polling như query order).

---

## 11. Bảng mã lỗi (sub_return_code) cho các API mới

### Cancel Order

| Code | Ý nghĩa |
|---|---|
| -101 | `app_trans_id` không tồn tại |
| -401 | Sai định dạng tham số |
| -403 | Đơn đã được thanh toán (captured), không thể hủy |
| -429 | Vượt rate limit |
| -500 | Lỗi hệ thống |
| -999 | Hệ thống bảo trì |

### Refund

| Code | Ý nghĩa |
|---|---|
| 0 | Lỗi hệ thống |
| -13 | Yêu cầu hoàn tiền quá hạn (quá 15 phút kể từ lúc khởi tạo) |
| -32 | Giao dịch không hỗ trợ hoàn tiền một phần (partial refund) |
| -101 | `zp_trans_id` không tồn tại |
| -401 | Dữ liệu không hợp lệ |
| -402 | Sai app code/chữ ký |
| -429 | Vượt rate limit |
| -500 | Lỗi hệ thống |
| -999 | Hệ thống bảo trì |

### Query Refund Status

| Code | Ý nghĩa |
|---|---|
| -1 | Yêu cầu hoàn tiền đang chờ duyệt (`REFUND_PENDING`) |
| -2 | Loại hoàn tiền không hợp lệ |
| -13 | Quá hạn thời gian hoàn tiền |
| -14 | Số tiền hoàn không hợp lệ |
| -101 | `m_refund_id` không tồn tại |
| -401/-402/-429/-500/-999 | Giống nhóm lỗi chung |

Bảng mã lỗi đầy đủ: https://docs.zalopay.vn/docs/developer-tools/knowledge-base/status-codes

---

## 12. Các điểm cần lưu ý khi lên production

- **`key1`** dùng để ký request (Create/Query/Cancel Order, Refund), **`key2`** dùng để verify callback — không dùng lẫn lộn.
- `app_trans_id` phải theo đúng format `yymmdd_...` theo giờ Việt Nam (GMT+7); `m_refund_id` theo format `yymmdd_appid_...`.
- Lưu `zp_trans_id` (không phải `app_trans_id`) trong DB — đây là mã dùng khi cần hoàn tiền/đối soát sau này.
- Refund là API bất đồng bộ: sau khi gọi thành công (`return_code: 1`), trạng thái thực tế vẫn cần xác nhận qua `queryRefundStatus` (nên polling giống query order).
- Chỉ hủy được đơn **chưa** thanh toán thành công; nếu cần hoàn tiền cho đơn đã thanh toán, dùng API Refund thay vì Cancel.
- Xử lý callback **idempotent**: nếu nhận callback trùng cho 1 đơn đã "success", chỉ trả `return_code: 1` mà không xử lý logic nghiệp vụ lại.
- Bắt buộc dùng HTTPS cho `callback_url`.
- Nên có cron job định kỳ gọi `queryOrder` cho các đơn "pending" quá 15 phút chưa nhận callback, để tránh treo trạng thái đơn hàng.
- Xử lý `return_code`/`sub_return_code` trả về theo bảng mã lỗi tại: https://docs.zalopay.vn/docs/developer-tools/knowledge-base/status-codes
