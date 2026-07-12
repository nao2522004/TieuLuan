import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { validate } from "./config/env.validation";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { HealthModule } from "./modules/health/health.module";
import { UsersModule } from "./modules/users/users.module";
import { AuthModule } from "./modules/auth/auth.module";
import { User } from "./modules/users/entities/user.entity";
import { RefreshToken } from "./modules/auth/entities/refresh-token.entity";
import { Branch } from "./modules/branches/entities/branch.entity";
import { Shift } from "./modules/shifts/entities/shift.entity";
import { Return } from "./modules/returns/entities/return.entity";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { HttpLoggerMiddleware } from "./common/middleware/http-logger.middleware";
import { CategoriesModule } from "./modules/categories/categories.module";
import { Category } from "./modules/categories/entities/category.entity";
import { Product } from "./modules/products/entities/product.entity";
import { ProductsModule } from "./modules/products/products.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: parseInt(config.get<string>("THROTTLE_TTL") ?? "60000", 10),
          limit: parseInt(config.get<string>("THROTTLE_LIMIT") ?? "100", 10),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("DB_HOST"),
        port: parseInt(config.get<string>("DB_PORT") ?? "5433", 10),
        username: config.get<string>("DB_USER"),
        password: config.get<string>("DB_PASSWORD"),
        database: config.get<string>("DB_NAME"),
        entities: [
          User,
          RefreshToken,
          Branch,
          Shift,
          Return,
          Category,
          Product,
        ],
        synchronize: false,
        logging: config.get<string>("NODE_ENV") === "development",
      }),
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware, HttpLoggerMiddleware).forRoutes("*");
  }
}
