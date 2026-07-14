import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("shifts")
export class Shift {
  @PrimaryColumn({
    type: "bigint",
    generated: "increment",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  id: number;

  @Column({
    name: "branch_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  branchId: number;

  @Column({
    name: "user_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  userId: number;

  @Column({
    name: "opening_cash",
    type: "numeric",
    precision: 12,
    scale: 2,
    default: 0,
  })
  openingCash: number;

  @Column({
    name: "closing_cash",
    type: "numeric",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  closingCash: number | null;

  @Column({
    name: "expected_cash",
    type: "numeric",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  expectedCash: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: "opened_at", type: "timestamptz" })
  openedAt: Date;

  @Column({ name: "closed_at", type: "timestamptz", nullable: true })
  closedAt: Date | null;
}
