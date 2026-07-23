import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Stocktake } from "./entities/stocktake.entity";
import { StocktakeItem } from "./entities/stocktake-item.entity";
import { Product } from "../products/entities/product.entity";
import { StocktakesController } from "./stocktakes.controller";
import { StocktakesService } from "./stocktakes.service";
import { UsersModule } from "../users/users.module";
import { ProductsModule } from "../products/products.module";
import { BranchesModule } from "../branches/branches.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Stocktake, StocktakeItem, Product]),
    JwtModule.register({}),
    UsersModule,
    ProductsModule,
    BranchesModule,
  ],
  controllers: [StocktakesController],
  providers: [StocktakesService],
  exports: [StocktakesService],
})
export class StocktakesModule {}
