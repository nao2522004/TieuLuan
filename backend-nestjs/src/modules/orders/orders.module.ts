import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "./entities/order.entity";
import { OrderItem } from "./entities/order-item.entity";
import { Product } from "../products/entities/product.entity";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderBranchAccessGuard } from "../../common/guards/order-branch-access.guard";
import { UsersModule } from "../users/users.module";
import { ProductsModule } from "../products/products.module";
import { ShiftsModule } from "../shifts/shifts.module";
import { BranchesModule } from "../branches/branches.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product]),
    JwtModule.register({}),
    UsersModule,
    ProductsModule,
    ShiftsModule,
    BranchesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderBranchAccessGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
