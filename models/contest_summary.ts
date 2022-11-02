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
        problem_summaries.forEach(item => {problem_summaries_map[item.id] = item})


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

        let not_solves = []
        problem_ids.forEach(id => {
            if(!details[id]) details[id] = {score: 0}
            let detail = details[id]
            if(detail.score === undefined) detail.score = detail.weighted_score

            detail.solved = (detail.accepted === true) || (detail.score === 100)

            for (let s of problem_summaries) {
                if (s.problem_id === id)  {
                    detail.problem_summary = s
                    break
                }
            }
            for(let p of problems) {
                if(p.id === id) {
                    // 返回problem的描述信息
                    details[id].problem_info = p.title
                    details[id].problem_id = id
                    break
                }
            }
            if(!detail.solved) not_solves.push(detail)
        })

        if(not_solves.length > 0) {
            //查看是否补题
            let sql = 'select distinct problem_id from judge_state where user_id=' + user.id + ' and problem_id in (' +  not_solves.map(x => x.problem_id).join(',')  + ') and status=\'Accepted\''
            let res = await JudgeState.query(sql)
            let ids = {}
            for(let item of res) {
                ids[item.problem_id] = true
            }
            for(let item of not_solves) {
                if(ids[item.problem_id]) item.solved = true
            }
        }
        return {
            user,
            contest,
            score,
            contest_summary,
            length: Object.keys(details).length,
            details
        }
    }



}

