import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("roles")
export class Role {
  @PrimaryColumn({
    type: "bigint",
    generated: "increment",
    transformer: { to: (v) => v, from: (v) => parseInt(v, 10) },
  })
  id: number;

  @Column({ type: "varchar", length: 20, unique: true })
  code: string; // 'admin' | 'leader' | 'cashier'

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;
}
