import * as TypeORM from "typeorm";
import Model from "./common";



@TypeORM.Entity()
export default class ProblemForbid extends Model {
    static cache = false;

    @TypeORM.PrimaryColumn({ type: "integer" })
    problem_id: number;

    @TypeORM.Column({ nullable: true, type: "varchar", length: 80 })
    problem_title: string;

    @TypeORM.Index()
    @TypeORM.Column({ nullable: true, type: "integer" })
    contest_id: number;

    //禁止访问 submission 的截止时间
    @TypeORM.Column({ type: "integer" })
    forbid_submission_end_time: number;
};
