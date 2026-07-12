import { ApiProperty } from "@nestjs/swagger";
import { PaginationMeta } from "../../../common/dto/api-response.dto";

export class BranchDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: "Chi nhánh Quận 1" })
  name: string;

  @ApiProperty({ example: "123 Lê Lợi, Q.1, TP.HCM", nullable: true })
  address: string | null;

  @ApiProperty({ example: "028-1234-5678", nullable: true })
  phone: string | null;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: "970422", nullable: true })
  bank_bin: string | null;

  @ApiProperty({ example: "0123456789", nullable: true })
  bank_account_no: string | null;

  @ApiProperty({ example: "NGUYEN VAN A", nullable: true })
  bank_account_name: string | null;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  created_at: Date;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  updated_at: Date;
}

export class BranchResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: BranchDto })
  data: BranchDto;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  timestamp: string;
}

export class PaginatedBranchResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [BranchDto] })
  data: BranchDto[];

  @ApiProperty({ type: PaginationMeta })
  meta: PaginationMeta;

  @ApiProperty({ example: "2026-07-11T10:00:00.000Z" })
  timestamp: string;
}
