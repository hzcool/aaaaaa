import * as TypeORM from "typeorm";
import Model from "./common";

@TypeORM.Entity()
export default class loginlog extends Model {
  @TypeORM.PrimaryGeneratedColumn()
  id: number;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "integer" })
  user_id: number;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "datetime" })
  login_time: Date;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "varchar", length: 100 })
  ip: string;

  static async getLastLoginTime(user_id: number) {
    let res = await loginlog.findOne({
      where: { user_id: user_id },
      order: { login_time: "DESC" }
    });
    return res ? res.login_time : null;
  }
}
