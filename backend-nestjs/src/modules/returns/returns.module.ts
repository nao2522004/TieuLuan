import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Return } from "./entities/return.entity";
import { OrderItem } from "../orders/entities/order-item.entity";
import { Order } from "../orders/entities/order.entity";
import { ReturnsController } from "./returns.controller";
import { ReturnsService } from "./returns.service";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Return, OrderItem, Order]),
    JwtModule.register({}),
    UsersModule,
  ],
  controllers: [ReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
