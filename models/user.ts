import * as TypeORM from "typeorm";
import Model from "./common";

declare var syzoj: any;

import JudgeState from "./judge_state";
import UserPrivilege from "./user_privilege";
import Article from "./article";
import Contest from "./contest";
import Practice from "./practice";

@TypeORM.Entity()
export default class User extends Model {
  static cache = true;

  @TypeORM.PrimaryGeneratedColumn()
  id: number;

  @TypeORM.Index({ unique: true })
  @TypeORM.Column({ nullable: true, type: "varchar", length: 80 })
  username: string;

  @TypeORM.Column({ nullable: true, type: "varchar", length: 120 })
  email: string;

  @TypeORM.Column({ nullable: true, type: "varchar", length: 120 })
  password: string;

  @TypeORM.Column({ nullable: true, type: "varchar", length: 80 })
  nickname: string;

  @TypeORM.Column({ nullable: true, type: "text" })
  nameplate: string;

  @TypeORM.Column({ nullable: true, type: "text" })
  information: string;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "integer" })
  ac_num: number;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "integer" })
  submit_num: number;

  @TypeORM.Column({ nullable: true, type: "boolean" })
  is_admin: boolean;

  @TypeORM.Index()
  @TypeORM.Column({ nullable: true, type: "boolean" })
  is_show: boolean;

  @TypeORM.Column({ nullable: true, type: "boolean", default: true })
  public_email: boolean;

  @TypeORM.Column({ nullable: true, type: "boolean", default: true })
  prefer_formatted_code: boolean;

  @TypeORM.Column({ nullable: true, type: "integer" })
  sex: number;

  @TypeORM.Column({ nullable: true, type: "integer" })
  rating: number;

  @TypeORM.Column({ nullable: true, type: "integer" })
  register_time: number;

  @TypeORM.Column({ nullable: true, type: "integer" })
  start_time: number;

  @TypeORM.Column({ nullable: true, type: "integer" })
  end_time: number;

  @TypeORM.Column({ nullable: true, type: "datetime" })
  last_login_time: Date;

  @TypeORM.Column({ nullable: true, type: "text" })
  group_id: string;

  static async fromEmail(email): Promise<User> {
    return User.findOne({
      where: {
        email: email
      }
    });
  }

  static async fromName(name): Promise<User> {
    return User.findOne({
      where: {
        username: name
      }
    });
  }

  async isAllowedEditBy(user) {
    if (!user) return false;
    if (await user.hasPrivilege('manage_user')) return true;
    return user && (user.is_admin || this.id === user.id);
  }

  getQueryBuilderForACProblems() {
    return JudgeState.createQueryBuilder()
                     .select(`DISTINCT(problem_id)`)
                     .where('user_id = :user_id', { user_id: this.id })
                     .andWhere('status = :status', { status: 'Accepted' })
                     .andWhere('type != 1')
                     .orderBy({ problem_id: 'ASC' })
  }

  async refreshSubmitInfo() {
    await syzoj.utils.lock(['User::refreshSubmitInfo', this.id], async () => {
      this.ac_num = await JudgeState.countQuery(this.getQueryBuilderForACProblems());
      this.submit_num = await JudgeState.count({
        user_id: this.id,
        type: TypeORM.Not(1) && TypeORM.Not(2) // Not a contest submission
      });

      await this.save();
    });
  }

  async getACProblems() {
    let queryResult = await this.getQueryBuilderForACProblems().getRawMany();

    return queryResult.map(record => record['problem_id'])
  }

  async getArticles() {
    return await Article.find({
      where: {
        user_id: this.id
      }
    });
  }

  async getStatistics() {
    let statuses = {
      "Accepted": ["Accepted"],
      "Wrong Answer": ["Wrong Answer", "File Error", "Output Limit Exceeded"],
      "Runtime Error": ["Runtime Error"],
      "Time Limit Exceeded": ["Time Limit Exceeded"],
      "Memory Limit Exceeded": ["Memory Limit Exceeded"],
      "Compile Error": ["Compile Error"]
    };

    let res = {};
    for (let status in statuses) {
      res[status] = 0;
      for (let s of statuses[status]) {
        res[status] += await JudgeState.count({
          user_id: this.id,
          type: 0,
          status: s
        });
      }
    }

    return res;
  }

  async renderInformation() {
    this.information = await syzoj.utils.markdown(this.information);
  }

  async getPrivileges() {
    let privileges = await UserPrivilege.find({
      where: {
        user_id: this.id
      }
    });

    return privileges.map(x => x.privilege);
  }

  async setPrivileges(newPrivileges) {
    let oldPrivileges = await this.getPrivileges();

    let delPrivileges = oldPrivileges.filter(x => !newPrivileges.includes(x));
    let addPrivileges = newPrivileges.filter(x => !oldPrivileges.includes(x));

    for (let privilege of delPrivileges) {
      let obj = await UserPrivilege.findOne({ where: {
        user_id: this.id,
        privilege: privilege
      } });

      await obj.destroy();
    }

    for (let privilege of addPrivileges) {
      let obj = await UserPrivilege.create({
        user_id: this.id,
        privilege: privilege
      });

      await obj.save();
    }
  }

  async hasPrivilege(privilege) {
    if (this.is_admin) return true;

    let x = await UserPrivilege.findOne({ where: { user_id: this.id, privilege: privilege } });
    return !!x;
  }

  async getLastSubmitLanguage() {
    let a = await JudgeState.findOne({
      where: {
        user_id: this.id
      },
      order: {
        submit_time: 'DESC'
      }
    });
    if (a) return a.language;

    return null;
  }

    /*async getconts(){
        let mygid = this.group_id;
        let sql = `SELECT id FROM contest WHERE  ( group_id LIKE '${mygid}' OR group_id LIKE '${mygid}|%' OR group_id LIKE '%|${mygid}' OR group_id LIKE '%|${mygid}|%' OR group_id LIKE 'all' ) AND ( is_public = 1 )  `;
        let myconts = ( await Contest.query(sql) ).map(row=>row['id']);
        return myconts ;
    }*/
    async getconts(){
        let mygid = (this.group_id).split("|");
        let srt_time=this.start_time;
        let sql = `SELECT id,group_id FROM contest where start_time>=${srt_time} `;
        let res =  await Contest.query(sql) ;
        let myconts = [];
        for ( let i = 0 ; i < res.length ; ++i ) {
            let row = res[i]["group_id"];
            row = row.split("|") ;
            let f=0;
            for(let j=0;j<row.length;++j){
           
            	for(let k=0;k<mygid.length;k++){
            		if(row[j]==mygid[k]){
            			f=1;
            			break;
            		}
            	}
            	if(f==1)break;
            }
            if(f==1)myconts.push(res[i]["id"]);
        } 
        return myconts ;
    }
    async getcontprobs(){
        let c =await this.getconts();
        let contests=c.toString();
        if(contests === '') contests = '0'
        let sql = `SELECT problems FROM contest WHERE ( id in (${contests}) OR group_id LIKE 'all' ) AND ( is_public = 1 ) AND ( end_time < unix_timestamp(now()) )  `;
        let res =  await Contest.query(sql) ;
        let mycp = [];
        for ( let i = 0 ; i < res.length ; ++i ) {
            let row = res[i]['problems'];
            row = row.split('|') ;
            mycp = mycp . concat ( row ) ;
        }
        mycp = mycp . map( a => parseInt(a) ) ;
        return mycp ;
    }

    
    async getpracs(){
      let mygid = (this.group_id).split("|");
      let srt_time=this.start_time;
      let sql = `SELECT id,group_id FROM practice where start_time>=${srt_time} `;
      let res =  await Practice.query(sql) ;
      let myconts = [];
      for ( let i = 0 ; i < res.length ; ++i ) {
          let row = res[i]["group_id"];
          row = row.split("|") ;
          let f=0;
          for(let j=0;j<row.length;++j){
         
            for(let k=0;k<mygid.length;k++){
              if(row[j]==mygid[k]){
                f=1;
                break;
              }
            }
            if(f==1)break;
          }
          if(f==1)myconts.push(res[i]["id"]);
      } 
      return myconts ;
  }
  async getpracprobs(){
      let c =await this.getpracs();
      let practices=c.toString();
      if (!practices) return [];
      let sql = `SELECT problems FROM practice WHERE ( id in (${practices}) OR group_id LIKE 'all' ) AND ( is_public = 1 )  `;
      let res =  await Practice.query(sql) ;
      let mycp = [];
      for ( let i = 0 ; i < res.length ; ++i ) {
          let row = res[i]['problems'];
          row = row.split('|') ;
          mycp = mycp . concat ( row ) ;
      }
      mycp = mycp . map( a => parseInt(a) ) ;
      return mycp ;
  }

  isEnded() {
    if (!this.end_time) return false;
    let now = syzoj.utils.getCurrentDate();
    return now >= this.end_time;
  }
}
