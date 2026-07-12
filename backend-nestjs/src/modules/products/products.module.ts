import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "./entities/product.entity";
import { Branch } from "../branches/entities/branch.entity";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { UsersModule } from "../users/users.module";
import { CategoriesModule } from "../categories/categories.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Branch]),
    JwtModule.register({}),
    UsersModule,
    CategoriesModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
