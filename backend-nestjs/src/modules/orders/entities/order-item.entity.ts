import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("order_items")
export class OrderItem {
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
    name: "order_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  orderId: number;

  @Column({
    name: "product_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  productId: number;

  @Column({ type: "integer" })
  quantity: number;

  @Column({ name: "unit_price", type: "numeric", precision: 12, scale: 2 })
  unitPrice: number;
}
