import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("product_batches")
export class ProductBatch {
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

  @Column({ name: "batch_code", type: "varchar", length: 100 })
  batchCode: string;

  @Column({ name: "quantity_received", type: "integer", default: 0 })
  quantityReceived: number;

  @Column({ name: "quantity_remaining", type: "integer", default: 0 })
  quantityRemaining: number;

  @Column({ name: "unit_cost", type: "numeric", precision: 12, scale: 2, nullable: true })
  unitCost: number | null;

  @Column({ name: "expiry_date", type: "date", nullable: true })
  expiryDate: string | null;

  @Column({ name: "received_at", type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  receivedAt: Date;

  @Column({
    name: "created_by",
    type: "bigint",
    nullable: true,
    transformer: {
      to: (value) => value,
      from: (value) => (value ? parseInt(value, 10) : null),
    },
  })
  createdBy: number | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;
}
