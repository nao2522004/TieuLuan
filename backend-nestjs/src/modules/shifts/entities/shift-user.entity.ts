import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Shift } from "./shift.entity";
import { User } from "../../users/entities/user.entity";

@Entity("shift_users")
export class ShiftUser {
  @PrimaryColumn({
    type: "bigint",
    generated: "increment",
    transformer: {
      to: (value: any) => value,
      from: (value: any) => parseInt(value, 10),
    },
  })
  id: number;

  @Column({
    name: "shift_id",
    type: "bigint",
    transformer: {
      to: (value: any) => value,
      from: (value: any) => parseInt(value, 10),
    },
  })
  shiftId: number;

  @ManyToOne(() => Shift, (shift) => shift.shiftUsers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "shift_id" })
  shift: Shift;

  @Column({
    name: "user_id",
    type: "bigint",
    transformer: {
      to: (value: any) => value,
      from: (value: any) => parseInt(value, 10),
    },
  })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE", eager: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
