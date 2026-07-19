import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type ExpiryDiscountRuleScope = "expiry" | "all_products";

@Entity("expiry_discount_rules")
export class ExpiryDiscountRule {
  @PrimaryColumn({
    type: "bigint",
    generated: "increment",
    transformer: { to: (v) => v, from: (v) => parseInt(v, 10) },
  })
  id: number;

  @Column({ type: "varchar", length: 20, default: "expiry" })
  scope: ExpiryDiscountRuleScope;

  // Nullable: chỉ có ý nghĩa khi scope = 'expiry'
  @Column({ name: "days_before_expiry", type: "integer", nullable: true })
  daysBeforeExpiry: number | null;

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
