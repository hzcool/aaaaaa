import * as TypeORM from "typeorm";
import Model from "./common";

enum Evaluate {
  LIKE = "Like",
  HATE = "Hate"
}

@TypeORM.Entity()
@TypeORM.Index(['problem_id', 'evaluate'])
@TypeORM.Index(['problem_id', 'user_id'])
export default class ProblemEvaluate extends Model {
  @TypeORM.PrimaryColumn({ type: "integer" })
  problem_id: number;

  @TypeORM.PrimaryColumn({ type: "integer" })
  user_id: number;

  @TypeORM.Column({ nullable: false, type: "enum", enum: Evaluate })
  evaluate: Evaluate;

  static async getEvaluate(problem_id: number, evaluate: Evaluate) {
    let where = {
      problem_id: problem_id,
      evaluate: evaluate
    };
    let queryBuilder = this.createQueryBuilder().where(where);
    return await this.countQuery(queryBuilder);
  }

  static async getUserEvaluate(problem_id: number, user_id: number) {
    let where = {
      problem_id: problem_id,
      user_id: user_id
    };
    let res = await this.findOne(where);
	  return res ? res.evaluate : null;
  }

  static async deleteEvaluate(problem_id: number) {
    await Promise.all((await this.find({
      problem_id: problem_id
    })).map(evaluate => evaluate.destroy()))
  }

  // static async deleteUserEvaluate(problem_id: number, user_id: number) {
  //   await Promise.all((await this.find({
  //     problem_id: problem_id,
  //     user_id: user_id
  //   })).map(evaluate => evaluate.destroy()))
  // }

  static async setUserEvaluate(problem_id: number, user_id: number, evaluate: Evaluate) {
    // await this.deleteUserEvaluate(problem_id, user_id);
    let now = await this.find({
      problem_id: problem_id,
      user_id: user_id
    });
    if (now.length) {
      for (let item of now) {
        await item.destroy();
      }
      return;
    }
    let problem_evaluate = this.create({
      problem_id: problem_id,
      user_id: user_id,
      evaluate: evaluate
    });
    await problem_evaluate.save();
  }
}
