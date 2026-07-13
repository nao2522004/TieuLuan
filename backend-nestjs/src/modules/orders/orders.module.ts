import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { Product } from "../products/entities/product.entity";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { UsersModule } from "../users/users.module";
import { ProductsModule } from "../products/products.module";
import { ShiftsModule } from "../shifts/shifts.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product]),
    JwtModule.register({}),
    UsersModule,
    ProductsModule,
    ShiftsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
