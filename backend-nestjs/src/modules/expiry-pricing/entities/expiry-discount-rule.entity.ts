import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("expiry_discount_rules")
export class ExpiryDiscountRule {
  @PrimaryColumn({
    type: "bigint",
    generated: "increment",
    transformer: { to: (v) => v, from: (v) => parseInt(v, 10) },
  })
  id: number;

  @Column({ name: "days_before_expiry", type: "integer" })
  daysBeforeExpiry: number;

  @Column({ name: "discount_percent", type: "numeric", precision: 5, scale: 2 })
  discountPercent: number;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;
}
