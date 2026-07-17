import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { Role } from "../../roles/entities/role.entity";

export type UserRole = "admin" | "leader" | "cashier";

@Entity("users")
export class User {
  @PrimaryColumn({
    type: "bigint",
    generated: "increment",
    transformer: {
      to: (value) => value,
      from: (value) => (value != null ? parseInt(value, 10) : null),
    },
  })
  id: number;

  @Column({
    name: "branch_id",
    type: "bigint",
    nullable: true,
    transformer: {
      to: (value) => value,
      from: (value) => (value != null ? parseInt(value, 10) : null),
    },
  })
  branchId: number | null;

  @Column({ name: "full_name", type: "varchar", length: 150 })
  fullName: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ name: "password_hash", type: "varchar", length: 255 })
  passwordHash: string;

  @Column({
    name: "role_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => (value != null ? parseInt(value, 10) : null),
    },
  })
  roleId: number;

  @ManyToOne(() => Role, { eager: true })
  @JoinColumn({ name: "role_id" })
  role: Role;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt: Date;

  @Column({ name: "deleted_at", type: "timestamptz", nullable: true })
  deletedAt: Date | null;
}
