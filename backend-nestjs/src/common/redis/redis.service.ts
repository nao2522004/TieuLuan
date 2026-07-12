import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger("RedisService");
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const url =
      this.configService.get<string>("REDIS_URL") ?? "redis://localhost:6380";

    this.client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null, // không retry vô hạn -> fail nhanh, để service fallback DB
    });

    this.client.on("error", (err) => {
      this.logger.warn(`Redis lỗi kết nối (sẽ fallback DB): ${err.message}`);
    });
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (err) {
      this.logger.warn(
        `Redis GET lỗi (fallback DB): ${(err as Error).message}`,
      );
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, "EX", ttlSeconds);
    } catch (err) {
      this.logger.warn(
        `Redis SET lỗi (bỏ qua cache): ${(err as Error).message}`,
      );
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (err) {
      this.logger.warn(`Redis DEL lỗi: ${(err as Error).message}`);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (err) {
      this.logger.warn(`Redis KEYS lỗi: ${(err as Error).message}`);
      return [];
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
