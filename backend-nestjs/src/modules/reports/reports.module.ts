import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Order } from "../orders/entities/order.entity";
import { Return } from "../returns/entities/return.entity";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Return]),
    JwtModule.register({}),
    UsersModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
