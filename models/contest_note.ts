import * as TypeORM from "typeorm";
import Model from "./common";



@TypeORM.Entity()
export default class ContestNote extends Model {
    static cache = true;

    @TypeORM.PrimaryColumn({ type: "integer" })
    contest_id: number;

    @TypeORM.Column({ nullable: true, type: "text"})
    note: string;
};
