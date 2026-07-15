import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type OrderStatus = "completed" | "cancelled";
export type OrderPaymentMethod = "cash" | "transfer" | "card";
export type OrderPaymentStatus = "pending" | "paid";

@Entity("orders")
export class Order {
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
    name: "shift_id",
    type: "bigint",
    nullable: true,
    transformer: {
      to: (value) => value,
      from: (value) => (value != null ? parseInt(value, 10) : null),
    },
  })
  shiftId: number | null;

  @Column({
    name: "created_by",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  createdBy: number;

  @Column({ type: "varchar", length: 20, default: "completed" })
  status: OrderStatus;

  @Column({
    name: "payment_method",
    type: "varchar",
    length: 20,
    default: "cash",
  })
  paymentMethod: OrderPaymentMethod;

  @Column({
    name: "payment_status",
    type: "varchar",
    length: 20,
    default: "paid",
  })
  paymentStatus: OrderPaymentStatus;

  @Column({
    name: "discount_amount",
    type: "numeric",
    precision: 12,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({ name: "total_amount", type: "numeric", precision: 12, scale: 2 })
  totalAmount: number;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @Column({ name: "zalopay_app_trans_id", type: "varchar", length: 50, nullable: true })
  zalopayAppTransId: string | null;

  @Column({ name: "zalopay_zp_trans_id", type: "varchar", length: 50, nullable: true })
  zalopayZpTransId: string | null;
}
