import { Column, Entity, PrimaryColumn, Unique } from "typeorm";

/**
 * Lưu chi tiết số đếm thực tế **theo từng lô** cho một dòng kiểm kê.
 * Được ghi khi client gửi `batch_counts[]` lên `recordItem` / `recordItemsBulk`.
 * Khi chốt phiên (`close()`), service dùng bảng này để trừ/cộng đúng lô
 * thay vì dùng FEFO mù.
 */
@Entity("stocktake_item_batches")
@Unique("uq_stocktake_item_batches", ["stocktakeItemId", "batchId"])
export class StocktakeItemBatch {
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
    name: "stocktake_item_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  stocktakeItemId: number;

  @Column({
    name: "batch_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => parseInt(value, 10),
    },
  })
  batchId: number;

  @Column({ name: "system_quantity", type: "integer" })
  systemQuantity: number;

  @Column({ name: "counted_quantity", type: "integer" })
  countedQuantity: number;

  @Column({ type: "integer" })
  difference: number;
}
