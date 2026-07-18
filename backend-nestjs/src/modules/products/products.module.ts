import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "./entities/product.entity";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";
import { UsersModule } from "../users/users.module";
import { BranchesModule } from "../branches/branches.module";
import { CategoriesModule } from "../categories/categories.module";
import { ExpiryPricingModule } from "../expiry-pricing/expiry-pricing.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]),
    JwtModule.register({}),
    UsersModule,
    BranchesModule,
    CategoriesModule,
    ExpiryPricingModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
