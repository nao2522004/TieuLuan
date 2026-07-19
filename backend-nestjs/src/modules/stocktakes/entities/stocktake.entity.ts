import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from "typeorm";

@Entity("stocktakes")
export class Stocktake {
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
    name: "created_by",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  createdBy: number;

  @Column({ type: "varchar", length: 20, default: "open" })
  status: "open" | "closed";

  @Column({ type: "varchar", length: 255, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @Column({ name: "closed_at", type: "timestamptz", nullable: true })
  closedAt: Date | null;
}
