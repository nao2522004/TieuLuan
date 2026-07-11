import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("returns")
export class Return {
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
    name: "order_item_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  orderItemId: number;

  @Column({ type: "integer" })
  quantity: number;

  @Column({ name: "refund_amount", type: "numeric", precision: 12, scale: 2 })
  refundAmount: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason: string | null;

  @Column({
    name: "created_by",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  createdBy: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
