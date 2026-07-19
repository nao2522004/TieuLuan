import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("stocktake_items")
export class StocktakeItem {
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
    name: "stocktake_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  stocktakeId: number;

  @Column({
    name: "product_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  productId: number;

  @Column({ name: "system_quantity", type: "integer" })
  systemQuantity: number;

  @Column({ name: "counted_quantity", type: "integer" })
  countedQuantity: number;

  @Column({ type: "integer" })
  difference: number;
}
