import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { UserRole } from "./entities/user-role.entity";
import { Role } from "../roles/entities/role.entity";
import { Branch } from "../branches/entities/branch.entity";
import { Shift } from "../shifts/entities/shift.entity";
import { ShiftUser } from "../shifts/entities/shift-user.entity";
import { RefreshToken } from "../auth/entities/refresh-token.entity";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { RolesModule } from "../roles/roles.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserRole,
      Role,
      Branch,
      Shift,
      ShiftUser,
      RefreshToken,
    ]),
    JwtModule.register({}),
    forwardRef(() => RolesModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
