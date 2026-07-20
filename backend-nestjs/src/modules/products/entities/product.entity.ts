import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("products")
export class Product {
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
    name: "category_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  categoryId: number;

  @Column({ type: "varchar", length: 50 })
  barcode: string;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "varchar", length: 20 })
  unit: string;

  @Column({ name: "cost_price", type: "numeric", precision: 12, scale: 2 })
  costPrice: number;

  @Column({ name: "sale_price", type: "numeric", precision: 12, scale: 2 })
  salePrice: number;

  @Column({ name: "stock_quantity", type: "integer", default: 0 })
  stockQuantity: number;

  @Column({ name: "reorder_level", type: "integer", default: 10 })
  reorderLevel: number;

  @Column({ name: "expiry_date", type: "date", nullable: true })
  expiryDate: string | null;

  @Column({ name: "nearest_expiry_date", type: "date", nullable: true })
  nearestExpiryDate: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;
}
