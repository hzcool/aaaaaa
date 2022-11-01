import * as TypeORM from "typeorm";
import Model from "./common";

@TypeORM.Entity()
@TypeORM.Index(['user_id', 'login_time'])
export default class loginlog extends Model {
  @TypeORM.PrimaryGeneratedColumn()
  id: number;

  @TypeORM.Column({ nullable: true, type: "integer" })
  user_id: number;

  @TypeORM.Column({ nullable: true, type: "datetime" })
  login_time: Date;

  @TypeORM.Column({ nullable: true, type: "text" })
  ip: string;
}
