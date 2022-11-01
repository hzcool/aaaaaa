import * as TypeORM from "typeorm";
import Model from "./common";

declare var syzoj, ErrorMessage: any;

import User from "./user";
import Problem from "./problem";
import Contest from "./contest";
import Practice from "./practice";

const Judger = syzoj.lib('judger');

enum Status {
  ACCEPTED = "Accepted",
  COMPILE_ERROR = "Compile Error",
  FILE_ERROR = "File Error",
  INVALID_INTERACTION = "Invalid Interaction",
  JUDGEMENT_FAILED = "Judgement Failed",
  MEMORY_LIMIT_EXCEEDED = "Memory Limit Exceeded",
  NO_TESTDATA = "No Testdata",
  OUTPUT_LIMIT_EXCEEDED = "Output Limit Exceeded",
  PARTIALLY_CORRECT = "Partially Correct",
  RUNTIME_ERROR = "Runtime Error",
  SYSTEM_ERROR = "System Error",
  TIME_LIMIT_EXCEEDED = "Time Limit Exceeded",
  UNKNOWN = "Unknown",
  WRONG_ANSWER = "Wrong Answer",
  WAITING = "Waiting"
}

@TypeORM.Entity()
@TypeORM.Index(['type', 'type_info'])
@TypeORM.Index(['type', 'is_public', 'language', 'status', 'problem_id'])
@TypeORM.Index(['type', 'is_public', 'status', 'problem_id'])
@TypeORM.Index(['type', 'is_public', 'problem_id'])
@TypeORM.Index(['type', 'is_public', 'language', 'problem_id'])
@TypeORM.Index(['problem_id', 'type', 'pending', 'score'])
export default class JudgeState extends Model {
  @TypeORM.PrimaryGeneratedColumn()
  id: number;

  // The data zip's md5 if it's a submit-answer problem
  @TypeORM.Column({ nullable: true, type: "mediumtext" })
  code: string;

  @TypeORM.Column({ nullable: true, type: "varchar", length: 20 })
  language: string;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "enum", enum: Status })
  status: Status;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "varchar", length: 50 })
  task_id: string;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "integer", default: 0 })
  score: number;

  @TypeORM.Column({ nullable: true, type: "integer", default: 0 })
  total_time: number;

  @TypeORM.Column({ nullable: true, type: "integer", default: 0 })
  code_length: number;

  @TypeORM.Column({ nullable: true, type: "boolean", default: 0 })
  pending: boolean;

  @TypeORM.Column({ nullable: true, type: "integer", default: 0 })
  max_memory: number;

  @TypeORM.Column({ nullable: true, type: "json" })
  compilation: any;

  @TypeORM.Column({ nullable: true, type: "json" })
  result: any;

  @TypeORM.Column({ nullable: true, type: "json" })
  vj_info: any;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "integer" })
  user_id: number;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "integer" })
  problem_id: number;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "integer" })
  submit_time: number;

  @TypeORM.Column({ nullable: true, type: "text" })
  submit_ip: string;

  /*
   * "type" indicate it's contest's submission(type = 1) or normal submission(type = 0) // or practice's submission(type = 2)
   * if it's contest's submission (type = 1), the type_info is contest_id
   * use this way represent because it's easy to expand // Menci：这锅我不背，是 Chenyao 留下来的坑。
   */
  @TypeORM.Column({ nullable: true, type: "integer" })
  type: number;

  @TypeORM.Column({ nullable: true, type: "integer" })
  type_info: number;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "boolean" })
  is_public: boolean;

  user?: User;
  problem?: Problem;

  async loadRelationships() {
    if (!this.user) {
      this.user = await User.findById(this.user_id);
    }
    if (!this.problem) {
      if (this.problem_id) this.problem = await Problem.findById(this.problem_id);
    }
  }

  isRemoteTask() {
    return !!(this.vj_info || (this.result && this.result.type === 'remote'));
  }

  async saveHook() {
    if (this.score === null) this.score = 0;
  }

  async isAllowedVisitBy(user) {
    await this.loadRelationships();

    if (!user) return false; // 未登录用户, false
    return await this.problem.isAllowedUseBy_contest(user) || await this.problem.isAllowedUseBy_practice(user); // 该问题 属于一场user可参加的 已结束的比赛

    // 下方为原始逻辑
    // if (user && user.id === this.problem.user_id) return true;
    // else if (this.type === 0) return this.problem.is_public || (user && (await user.hasPrivilege('manage_problem')));
    // else if (this.type === 1) {
    //   let contest = await Contest.findById(this.type_info);
    //   if (contest.isRunning()) {
    //     return user && await contest.isSupervisior(user);
    //   } else {
    //     return true;
    //   }
    // }
  }

  async updateRelatedInfo(newSubmission) {
    if (true) {
      await this.loadRelationships();

      const promises = [];
      promises.push(this.user.refreshSubmitInfo());
      promises.push(this.problem.resetSubmissionCount());

      if (!newSubmission) {
        promises.push(this.problem.updateStatistics(this.user_id));
      }

      await Promise.all(promises);
    }
    if (this.type === 1) {
      let contest = await Contest.findById(this.type_info);
      await contest.newSubmission(this);
    }
    if (this.type === 2) {
      let practice = await Practice.findById(this.type_info);
      await practice.newSubmission(this);
    }
  }

  async rejudge() {
    await syzoj.utils.lock(['JudgeState::rejudge', this.id], async () => {
      await this.loadRelationships();

      let oldStatus = this.status;

      this.status = Status.UNKNOWN;
      this.pending = false;
      this.score = null;
      if (this.language) {
        // language is empty if it's a submit-answer problem
        this.total_time = null;
        this.max_memory = null;
      }
      this.result = {};
      this.task_id = require('randomstring').generate(10);
      await this.save();

      await this.updateRelatedInfo(false);

      try {
        await Judger.judge(this, this.problem, 1);
        this.pending = true;
        this.status = Status.WAITING;
        await this.save();
      } catch (err) {
        console.log("Error while connecting to judge frontend: " + err.toString());
        throw new ErrorMessage("无法开始评测。");
      }
    });
  }

  async getProblemType() {
    await this.loadRelationships();
    return this.problem.type;
  }
}
