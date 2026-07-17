import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Role } from "./entities/role.entity";
import { RolesService } from "./roles.service";
import { RolesController } from "./roles.controller";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Role]),
    JwtModule.register({}),
    forwardRef(() => UsersModule),
  ],
  controllers: [RolesController],
  providers: [RolesService, JwtAuthGuard, RolesGuard],
  exports: [RolesService],
})
export class RolesModule {}
