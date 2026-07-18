import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Promotion } from "./entities/promotion.entity";
import { PromotionsController } from "./promotions.controller";
import { PromotionsService } from "./promotions.service";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [TypeOrmModule.forFeature([Promotion]), JwtModule.register({}), UsersModule],
  controllers: [PromotionsController],
  providers: [PromotionsService, JwtAuthGuard],
  exports: [PromotionsService],
})
export class PromotionsModule {}
