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
    this.appId = this.config.get<string>('zalopay.app-id') ?? '';
    this.key1 = this.config.get<string>('zalopay.mac-key') ?? '';
    this.key2 = this.config.get<string>('zalopay.refund-key') ?? '';

    const createUrl = this.config.get<string>('zalopay.create-order-url') ?? '';
    // Deduce the base endpoint URL, e.g. https://sb-openapi.zalopay.vn/v2
    this.endpoint = createUrl.substring(0, createUrl.lastIndexOf('/'));

    const serverUrl = this.config.get<string>('zalopay.server-url') ?? '';
    this.callbackUrl = `${serverUrl}/payment/zalopay/callback`;
  }

  /**
   * Sinh app_trans_id theo format yymmdd_<random> theo múi giờ Việt Nam (GMT+7)
   */
  public generateAppTransId(): string {
    // Lấy múi giờ GMT+7 của Việt Nam
    const vnTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const yy = String(vnTime.getUTCFullYear()).slice(-2);
    const mm = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(vnTime.getUTCDate()).padStart(2, '0');
    const random = Date.now(); // Hoặc dùng uuid/orderId
    return `${yy}${mm}${dd}_${random}`;
  }

  /**
   * Sinh m_refund_id theo format yymmdd_appid_<random> theo múi giờ Việt Nam (GMT+7)
   */
  public generateMRefundId(): string {
    const vnTime = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
    const yy = String(vnTime.getUTCFullYear()).slice(-2);
    const mm = String(vnTime.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(vnTime.getUTCDate()).padStart(2, '0');
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

    if (dto.refund_fee_amount !== undefined) {
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
