import * as TypeORM from "typeorm";
import Model from "./common";



@TypeORM.Entity()
export default class ProblemNote extends Model {
    static cache = false;

    @TypeORM.PrimaryColumn({ type: "integer" })
    problem_id: number;

    @TypeORM.Column({ nullable: true, type: "text"})
    note: string;
};
