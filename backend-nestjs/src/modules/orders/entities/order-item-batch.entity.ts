import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity("order_item_batches")
export class OrderItemBatch {
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

  @Column({
    name: "batch_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  batchId: number;

  @Column({ name: "quantity_taken", type: "integer" })
  quantityTaken: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
