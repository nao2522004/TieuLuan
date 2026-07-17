import { ApiProperty } from "@nestjs/swagger";
import { PaginationMeta } from "../../../common/dto/api-response.dto";

export class UserSummaryDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: "Thu ngân 2" })
  full_name: string;

  @ApiProperty({ example: "cashier2@store.local" })
  email: string;

  @ApiProperty({ example: "cashier", enum: ["admin", "leader", "cashier"] })
  role: string;

  @ApiProperty({ example: 1, nullable: true })
  branch_id: number | null;

  @ApiProperty({ example: true })
  is_active: boolean;
}

export class UsersListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [UserSummaryDto] })
  data: UserSummaryDto[];

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  timestamp: string;
}

export class MeDataDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: "leader@store.local" })
  email: string;

  @ApiProperty({ example: "Trưởng ca chính" })
  full_name: string;

  @ApiProperty({ example: "leader", enum: ["admin", "leader", "cashier"] })
  role: string;

  @ApiProperty({ example: 1, nullable: true })
  branch_id: number | null;
}

export class MeResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: MeDataDto })
  data: MeDataDto;

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  timestamp: string;
}

export class UserDto {
  @ApiProperty({ example: 5 })
  id: number;

  @ApiProperty({ example: "Thu ngân 2" })
  full_name: string;

  @ApiProperty({ example: "cashier2@store.local" })
  email: string;

  @ApiProperty({ example: "cashier", enum: ["admin", "leader", "cashier"] })
  role: string;

  @ApiProperty({ example: 1, nullable: true })
  branch_id: number | null;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  created_at: Date;

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  updated_at: Date;
}

export class UserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserDto })
  data: UserDto;

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  timestamp: string;
}

export class PaginatedUserResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [UserDto] })
  data: UserDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ example: "2026-07-17T10:00:00.000Z" })
  timestamp: string;
}
