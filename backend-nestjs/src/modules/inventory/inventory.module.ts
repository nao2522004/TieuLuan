import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { InventoryTransaction } from "./entities/inventory-transaction.entity";
import { Product } from "../products/entities/product.entity";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { UsersModule } from "../users/users.module";
import { ProductsModule } from "../products/products.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([InventoryTransaction, Product]),
    JwtModule.register({}),
    UsersModule,
    ProductsModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
