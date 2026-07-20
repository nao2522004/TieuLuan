import { Column, CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

export type InventoryTransactionSource =
  | "ORDER"
  | "INBOUND"
  | "ADJUSTMENT"
  | "STOCKTAKE";

export type InventoryTransactionType = "IN" | "OUT";

@Entity("inventory_transactions")
export class InventoryTransaction {
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
    name: "product_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  productId: number;

  @Column({ type: "varchar", length: 10 })
  type: InventoryTransactionType;

  @Column({
    type: "varchar",
    length: 20,
    default: "ORDER",
  })
  source: InventoryTransactionSource;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason: string | null;

  @Column({ type: "integer" })
  quantity: number;

  @Column({
    name: "unit_cost",
    type: "numeric",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  unitCost: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  note: string | null;

  @Column({
    name: "batch_id",
    type: "bigint",
    nullable: true,
    transformer: {
      to: (value) => value,
      from: (value) => (value ? parseInt(value, 10) : null),
    },
  })
  batchId: number | null;

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
