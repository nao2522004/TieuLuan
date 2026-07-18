import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type PromotionType = "percent" | "fixed";

@Entity("promotions")
export class Promotion {
  @PrimaryColumn({
    type: "bigint",
    generated: "increment",
    transformer: {
      to: (value) => value,
      from: (value) => (value != null ? parseInt(value, 10) : null),
    },
  })
  id: number;

  @Column({ type: "varchar", length: 50, unique: true })
  code: string;

  @Column({ type: "varchar", length: 150 })
  name: string;

  @Column({ type: "varchar", length: 10 })
  type: PromotionType;

  @Column({ type: "numeric", precision: 12, scale: 2 })
  value: number;

  @Column({
    name: "min_order_amount",
    type: "numeric",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  minOrderAmount: number | null;

  @Column({
    name: "max_discount_amount",
    type: "numeric",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  maxDiscountAmount: number | null;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @Column({ name: "starts_at", type: "timestamptz", default: () => "now()" })
  startsAt: Date;

  @Column({ name: "ends_at", type: "timestamptz", nullable: true })
  endsAt: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;
}
