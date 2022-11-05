import * as TypeORM from 'typeorm'
import Model from "./common";

import Contest from "./contest";
import User from "./user";
import ProblemSummary from "./problem_summary";
import Problem from "./problem";
import ContestPlayer from "./contest_player";
import JudgeState from "./judge_state";

@TypeORM.Entity()
export default class ContestSummary extends Model{
    static cache =  true;

    @TypeORM.PrimaryGeneratedColumn()
    id: number;

    @TypeORM.Column({nullable: true, type: "varchar", length: 80})
    username: string;


    @TypeORM.Index()
    @TypeORM.Column({ nullable: true, type: "integer" })
    contest_id: number;

    @TypeORM.Column({ nullable: true, type: "text" })
    summary: string;

    @TypeORM.Column({ nullable: true, type: "integer" })
    post_time: number;


    async getContest() {
        return await Contest.findById(this.contest_id)
    }

    static async get(username: string, contest_id: number) {
        return  await ContestSummary.findOne(
            { where: {contest_id, username} }
        )
    }


    static async getSummary(user: User, contest: Contest, player: ContestPlayer | undefined = undefined) {
        let contest_summary = await ContestSummary.get(user.username, contest.id)
        let problem_summaries = await ProblemSummary.queryAll(
            ProblemSummary.createQueryBuilder()
                .where('username = :username', { username: user.username })
                .andWhere('contest_id = :contest_id', {contest_id: contest.id})
        )

        let problem_summaries_map = {}
        problem_summaries.forEach(item => {problem_summaries_map[item.problem_id] = item})


        let problem_ids = await contest.getProblems()
        let problems = await Problem.findByIds(problem_ids)
        if(player === undefined) {
            player = await ContestPlayer.findInContest({
                user_id: user.id, contest_id: contest.id
            })
        }
        let details: any = {}
        let score = 0
        if(player) {
            score = player.score
            if(player.score_details) {
                details = player.score_details
            }
        }

        let not_solved = {}
        problem_ids.forEach(id => {
            if(!details[id]) details[id] = {score: 0}
            let detail = details[id]
            if(detail.score === undefined) detail.score = detail.weighted_score
            detail.solved = (detail.accepted === true) || (detail.score === 100)
            detail.problem_summary = problem_summaries_map[id]
            detail.problem_id = id

            for(let p of problems) {
                if(p.id === id) {
                    // 返回problem的描述信息
                    detail.problem_info = p.title
                    break
                }
            }
            if(!detail.solved) {
                if(not_solved[id]) not_solved[id].push(detail); else not_solved[id] = [detail]
            }
        })

        let not_solved_ids = Object.keys(not_solved)
        if(not_solved_ids.length > 0) {
            let sql = 'select distinct problem_id from judge_state where user_id=' + user.id + ' and problem_id in (' + not_solved_ids.join(",")  + ') and status=\'Accepted\''
            let res = await JudgeState.query(sql)
            res.forEach(item => {
                not_solved[item.problem_id].forEach(detail => detail.solved = true)
            })
        }

        return {
            user,
            contest,
            problem_ids,
            score,
            contest_summary,
            length: Object.keys(details).length,
            details
        }
    }



}

