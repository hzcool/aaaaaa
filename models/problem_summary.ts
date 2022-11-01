import * as TypeORM from 'typeorm'
import Model from "./common";


import Problem from "./problem";
import Contest from "./contest";
import ContestPlayer from "./contest_player";
import User from "./user";

@TypeORM.Entity()
export default class ProblemSummary extends Model{
    static cache =  true;

    @TypeORM.PrimaryGeneratedColumn()
    id: number;

    @TypeORM.Column({nullable: true, type: "varchar", length: 80})
    username: string;

    @TypeORM.Index()
    @TypeORM.Column({ nullable: true, type: "integer" })
    problem_id: number;

    @TypeORM.Index()
    @TypeORM.Column({ nullable: true, type: "integer" })
    contest_id: number;

    @TypeORM.Column({ nullable: true, type: "integer" })
    time: number;

    @TypeORM.Column({ nullable: true, type: "integer" })
    score: number;

    @TypeORM.Column({ nullable: true, type: "text" })
    summary: string;

    @TypeORM.Column({ nullable: true, type: "boolean" })
    public : boolean;

    @TypeORM.Column({ nullable: true, type: "datetime" })
    post_time: Date;

    async getProblem() {
       return await Problem.findById(this.problem_id)
    }

    async getContest() {
        return await Contest.findById(this.contest_id)
    }
}

