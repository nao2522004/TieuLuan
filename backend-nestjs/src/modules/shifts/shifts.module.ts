import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Shift } from "./entities/shift.entity";
import { Order } from "../orders/entities/order.entity";
import { ShiftsController } from "./shifts.controller";
import { ShiftsService } from "./shifts.service";
import { UsersModule } from "../users/users.module";
import { BranchesModule } from "../branches/branches.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Shift, Order]),
    JwtModule.register({}),
    UsersModule,
    BranchesModule,
  ],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
