import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ExpiryDiscountRule } from "./entities/expiry-discount-rule.entity";
import { ExpiryPricingController } from "./expiry-pricing.controller";
import { ExpiryPricingService } from "./expiry-pricing.service";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ExpiryDiscountRule]),
    JwtModule.register({}),
    UsersModule,
  ],
  controllers: [ExpiryPricingController],
  providers: [ExpiryPricingService],
  exports: [ExpiryPricingService],
})
export class ExpiryPricingModule {}
