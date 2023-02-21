import * as TypeORM from "typeorm";
import Model from "./common";



@TypeORM.Entity()
export default class ContestCollection extends Model {
    static cache = false;

    @TypeORM.PrimaryGeneratedColumn()
    id: number;

    @TypeORM.Index()
    @TypeORM.Column({ nullable: true, type: "integer" })
    contest_id: number;


    @TypeORM.Index()
    @TypeORM.Column({ nullable: true, type: "integer" })
    user_id: number;
};
