import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";
import { Role } from "../../roles/entities/role.entity";

@Entity("user_roles")
export class UserRole {
  @PrimaryColumn({
    name: "user_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => (value != null ? parseInt(value, 10) : null),
    },
  })
  userId: number;

  @PrimaryColumn({
    name: "role_id",
    type: "bigint",
    transformer: {
      to: (value) => value,
      from: (value) => (value != null ? parseInt(value, 10) : null),
    },
  })
  roleId: number;

  @ManyToOne(() => User, (user) => user.userRoles)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Role)
  @JoinColumn({ name: "role_id" })
  role: Role;
}
