let Contest = syzoj.model('contest');
let ContestRanklist = syzoj.model('contest_ranklist');
let ContestPlayer = syzoj.model('contest_player');
let Problem = syzoj.model('problem');
let JudgeState = syzoj.model('judge_state');
let User = syzoj.model('user');
let Article = syzoj.model('article');
let ProblemEvaluate = syzoj.model('problem_evaluate');

const jwt = require('jsonwebtoken');
const { getSubmissionInfo, getRoughResult, processOverallResult } = require('../libs/submissions_process');


async function contest_check_open(contest){
    let gid = contest.group_id;
    let gids = gid.split('|');
    return gids.indexOf('chk')!=-1 ;
}

async function contest_permitted(contest,user){
    const entityManager = TypeORM.getManager();
    let cid = contest.id;
    let uid = user.id;
    let res = await entityManager.query(`SELECT * from contest_permission where cid=${cid} and uid=${uid}`);
    if(res.length==0) return false;
    let sta = res[0]['status'];
    return ( sta == 'allow' ) ;
}

async function checkgp(contest,user){
    if (user.is_admin) return true;

    if (!contest.is_public) throw new ErrorMessage('比赛未公开');

    let cts = await user.getconts();

    if( cts.indexOf(contest.id)!=-1 ) {
        return true;
    }
    if( await contest_check_open(contest) && await contest_permitted(contest,user)){
        return true;
    }
    return false;
}

function get_key(username) {
  return syzoj.utils.md5(username + "comp_xxx")
}

app.get('/contests', async (req, res) => {
  try {
    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let keyword = req.query.keyword;
    let query = Contest.createQueryBuilder();
    if (!keyword) {
      query.where('1 = 1');
    } else {
      query.where('title LIKE :title', { title: `%${keyword}%` });
    }
    
    if (!res.locals.user.is_admin) {
        let mycont = await res.locals.user.getconts();
        if ( mycont.length === 0 ){
          query.andWhere(`group_id like '%chk%'`);
        }else{
          query.andWhere(new TypeORM.Brackets(qb => {
            qb.where(`id IN (:...mycont)`,{mycont:mycont})
              .andWhere(`is_public = 1`)
              .orWhere(`group_id like '%chk%'`);
          }));
        }
    }
    let paginate = syzoj.utils.paginate(await Contest.countForPagination(query), req.query.page, syzoj.config.page.contest);
    let contests = await Contest.queryPage(paginate, query, {
      start_time: 'DESC'
    });

    await contests.forEachAsync(async x => x.subtitle = await syzoj.utils.markdown(x.subtitle));

    res.render('contests', {
      is_admin: res.locals.user.is_admin,
      contests: contests,
      paginate: paginate
    })
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/cp/user/:id', async (req, res) => {
  try {
    let user = await User.findById(parseInt(req.params.id))
    if(!user) throw new ErrorMessage('无此用户。');
    const local_user = res.locals.user

    let key = req.query.key
    if(key) {
      let key2 = get_key(user.username)
      if(key !== key2) throw new ErrorMessage('key 不正确。');
    } else  if(!local_user || (!local_user.is_admin && local_user.id !== user.id)) {
      throw new ErrorMessage('您没有权限进行此操作。');
    } else {
      key = get_key(user.username)
    }

    let query = ContestPlayer.createQueryBuilder().where("user_id = :user_id", { user_id: user.id })
    let contests = []
    if(req.query.title) {
      contests = await Contest.getKeywordContests(req.query.title)
      if(contests.length > 0) {
        query.andWhere("contest_id in (" + contests.map(item => item.id).join(",") +")")
      } else {
        query.andWhere("contest_id = 0")
      }
    }

    let paginate = syzoj.utils.paginate(await ContestPlayer.countForPagination(query), req.query.page, syzoj.config.page.contest);
    query.orderBy('contest_id', 'DESC')
    let players = await ContestPlayer.queryPage(paginate, query)
    let contest_map = {}
    let ranklist_map = {}
    if(players.length > 0) {
      if(contests.length === 0) {
        contests = await Contest.queryAll(Contest.createQueryBuilder().where("id in (" + players.map(item => item.contest_id).join(",") + ")"))
      }
      contest_map = syzoj.utils.makeRecordsMap(contests)
      let ranklists = await ContestRanklist.queryAll(ContestRanklist.createQueryBuilder().where("id in (" + contests.map(item => item.ranklist_id).join(",") + ")"))
      ranklist_map = syzoj.utils.makeRecordsMap(ranklists)
    }
    let data = []
    let not_solved = {}  // problem_id => c array
    for(let player of players) {
      let contest = contest_map[player.contest_id]
      if(!contest) continue
      let problem_ids = await contest.getProblems()
      let c = {
        rank: '---',
        player_num: '---',
        score: 0,
        total_score: 0,
        contest,
        problem_count: problem_ids.length,
        solved_count: 0,
      }
      let ranklist = ranklist_map[contest.ranklist_id]
      if(ranklist) {
        for(problem_id of problem_ids) {
          let multipler = (ranklist.ranking_params[problem_id] || 1)
          c.total_score += multipler * 100;
          let detail = player.score_details[problem_id]
          if(detail) {
            if(detail.weighted_score) c.score += detail.weighted_score
            else if(detail.accepted) c.score += multipler * 100;
            else if(detail.score) c.score += detail.score * multipler
          }
          if(c.score === multipler * 100) c.solved_count++
          else {
            if(not_solved[problem_id]) not_solved[problem_id].push(c); else not_solved[problem_id] = [c]
          }
          c.player_num = ranklist.ranklist.player_num
          for(const [k, v] of Object.entries(ranklist.ranklist)) {
            if(v === player.id && k !== 'player_num') {
              c.rank = parseInt(k);
              break
            }
          }
        }
      }
      data.push(c)
    }

    let not_solved_ids = Object.keys(not_solved)
    if(not_solved_ids.length > 0) {
      let sql = 'select distinct problem_id from judge_state where user_id=' + user.id + ' and problem_id in (' + not_solved_ids.join(",")  + ') and status=\'Accepted\''
      let res = await JudgeState.query(sql)
      res.forEach(item => {
        not_solved[item.problem_id].forEach(c => c.solved_count++)
      })
    }

    res.render('user_contests', {
      data,
      show_user: user,
      paginate,
      key
    })
  } catch (e) {
    res.render('error', {
      err: e
    });
  }
})

app.get('/find_contest', async (req, res) => {
  try {
    // let user = await User.fromName(req.query.nickname);
    // if (!user) throw new ErrorMessage('无此用户。');
    // res.redirect(syzoj.utils.makeUrl(['user', user.id]));
    res.redirect(syzoj.utils.makeUrl(['contests'], { keyword: req.query.title }));
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/contest/:id/edit', async (req, res) => {
  try {

    let contest_id = parseInt(req.params.id);
    let contest = await Contest.findById(contest_id);
    if (!contest) {
      // if contest does not exist, only system administrators can create one
      if (!res.locals.user || !res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');

      contest = await Contest.create();
      contest.id = 0;
      contest.is_public = true;
    } else {
      // if contest exists, both system administrators and contest administrators can edit it.
      if (!res.locals.user || (!res.locals.user.is_admin && !contest.admins.includes(res.locals.user.id.toString()))) throw new ErrorMessage('您没有权限进行此操作。');

      await contest.loadRelationships();
    }

    let problems = [], admins = [];
    if (contest.problems) problems = await contest.problems.split('|').mapAsync(async id => await Problem.findById(id));
    if (contest.admins) admins = await contest.admins.split('|').mapAsync(async id => await User.findById(id));

    res.render('contest_edit', {
      contest: contest,
      problems: problems,
      admins: admins
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.post('/contest/:id/edit', async (req, res) => {
  try {

    let contest_id = parseInt(req.params.id);
    let contest = await Contest.findById(contest_id);
    let ranklist = null;
    if (!contest) {
      // if contest does not exist, only system administrators can create one
      if (!res.locals.user || !res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');

      contest = await Contest.create();

      contest.holder_id = res.locals.user.id;

      ranklist = await ContestRanklist.create();

      // Only new contest can be set type
      if (!['noi', 'ioi', 'acm'].includes(req.body.type)) throw new ErrorMessage('无效的赛制。');
      contest.type = req.body.type;
    } else {
      // if contest exists, both system administrators and contest administrators can edit it.
      if (!res.locals.user || (!res.locals.user.is_admin && !contest.admins.includes(res.locals.user.id.toString()))) throw new ErrorMessage('您没有权限进行此操作。');
      
      await contest.loadRelationships();
      ranklist = contest.ranklist;
    }

    try {
      ranklist.ranking_params = JSON.parse(req.body.ranking_params);
    } catch (e) {
      ranklist.ranking_params = {};
    }
    await ranklist.save();
    contest.ranklist_id = ranklist.id;

    if (!req.body.title.trim()) throw new ErrorMessage('比赛名不能为空。');
    contest.title = req.body.title;
    contest.subtitle = req.body.subtitle;
    if (!Array.isArray(req.body.problems)) req.body.problems = [req.body.problems];
    if (!Array.isArray(req.body.admins)) req.body.admins = [req.body.admins];
    contest.problems = req.body.problems.join('|');
    contest.admins = req.body.admins.join('|');
    contest.information = req.body.information;
    contest.start_time = syzoj.utils.parseDate(req.body.start_time);
    contest.end_time = syzoj.utils.parseDate(req.body.end_time);
    contest.is_public = req.body.is_public === 'on';
    contest.hide_statistics = req.body.hide_statistics === 'on';
    contest.hide_username = req.body.hide_username === 'on';

    contest.group_id = req.body.group_id;

    await contest.save();

    res.redirect(syzoj.utils.makeUrl(['contest', contest.id]));
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/contest/:id', async (req, res) => {
  try {


    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    const curUser = res.locals.user;
    let contest_id = parseInt(req.params.id);

    let contest = await Contest.findById(contest_id);
    if (!contest) throw new ErrorMessage('无此比赛。');

    const isSupervisior = await contest.isSupervisior(curUser);

    if(!isSupervisior){
        if( await checkgp(contest,res.locals.user) ){
            ;
        }else{
            if( await contest_check_open(contest) ){
                if( await contest_permitted(contest,res.locals.user) ){
                    ;
                }else{
                    throw new ErrorMessage(
                        '请申请访问比赛,并等待管理员同意!',
                        {
                            '申请访问': syzoj.utils.makeUrl(['dp/chk/contest_permission_require.php?cid='+contest_id])
                        }
                    );
                }
            }else
                throw new ErrorMessage('group not included, cannot enter !');
        }
    }

    // if contest is non-public, both system administrators and contest administrators can see it.
    if (!contest.is_public && (!res.locals.user || (!res.locals.user.is_admin && !contest.admins.includes(res.locals.user.id.toString())))) throw new ErrorMessage('比赛未公开，请耐心等待 (´∀ `)');

    contest.running = contest.isRunning();
    contest.ended = contest.isEnded();

    // if ((!res.locals.user || (!res.locals.user.is_admin && !contest.admins.includes(res.locals.user.id.toString()))) && (!contest.isRunning () && !contest.isEnded ())) throw new ErrorMessage('比赛未开始，请耐心等待 (´∀ `)');

    contest.subtitle = await syzoj.utils.markdown(contest.subtitle);
    contest.information = await syzoj.utils.markdown(contest.information);

    let problems_id = await contest.getProblems();
    let problems = await problems_id.mapAsync(async id => await Problem.findById(id));

    let player = null;

    if (res.locals.user) {
      player = await ContestPlayer.findInContest({
        contest_id: contest.id,
        user_id: res.locals.user.id
      });
    }

    problems = problems.map(x => ({ problem: x, status: null, judge_id: null, statistics: null }));


    for(let problem of problems){
        problem.buti_judge = await problem.problem.getJudgeState(res.locals.user,true);
        problem.tags = await problem.problem.getTags();
        problem.allowedEvaluate = await problem.problem.isAllowedEvaluateBy(res.locals.user);
        problem.like_num = await ProblemEvaluate.getEvaluate(problem.problem.id, 'Like');
        problem.hate_num = await ProblemEvaluate.getEvaluate(problem.problem.id, 'Hate');
        problem.evaluate = await ProblemEvaluate.getUserEvaluate(problem.problem.id, res.locals.user.id);
    }


    if (player) {
      for (let problem of problems) {
        if (contest.type === 'noi') {
          if (player.score_details[problem.problem.id]) {
            let judge_state = await JudgeState.findById(player.score_details[problem.problem.id].judge_id);
            problem.status = judge_state.score.toString();
            if (!contest.ended && !await problem.problem.isAllowedEditBy(res.locals.user) && !['Compile Error', 'Waiting', 'Compiling'].includes(problem.status)) {
              problem.status = 'Submitted';
            }
            problem.judge_id = player.score_details[problem.problem.id].judge_id;
          }
        } else if (contest.type === 'ioi') {
          if (player.score_details[problem.problem.id]) {
            let judge_state = await JudgeState.findById(player.score_details[problem.problem.id].judge_id);
            problem.status = judge_state.status;
            problem.judge_id = player.score_details[problem.problem.id].judge_id;
            await contest.loadRelationships();
            let multiplier = contest.ranklist.ranking_params[problem.problem.id] || 1.0;
            problem.feedback = (judge_state.score * multiplier).toString() + ' / ' + (100 * multiplier).toString();
          }
        } else if (contest.type === 'acm') {
          if (player.score_details[problem.problem.id]) {
            problem.status = {
              accepted: player.score_details[problem.problem.id].accepted,
              unacceptedCount: player.score_details[problem.problem.id].unacceptedCount
            };
            problem.judge_id = player.score_details[problem.problem.id].judge_id;
          } else {
            problem.status = null;
          }
        }
      }
    }

    let hasStatistics = false;
    if ((!contest.hide_statistics) || (contest.ended) || (isSupervisior)) {
      hasStatistics = true;

      await contest.loadRelationships();
      let players = await contest.ranklist.getPlayers();
      for (let problem of problems) {
        problem.statistics = { attempt: 0, accepted: 0 };

        if (contest.type === 'ioi' || contest.type === 'noi') {
          problem.statistics.partially = 0;
        }

        for (let player of players) {
          if (player.score_details[problem.problem.id]) {
            problem.statistics.attempt++;
            if ((contest.type === 'acm' && player.score_details[problem.problem.id].accepted) || ((contest.type === 'noi' || contest.type === 'ioi') && player.score_details[problem.problem.id].score === 100)) {
              problem.statistics.accepted++;
            }

            if ((contest.type === 'noi' || contest.type === 'ioi') && player.score_details[problem.problem.id].score > 0) {
              problem.statistics.partially++;
            }
          }
        }
      }
    }

    await contest.loadRelationships();
    let weight = null;

    for (let i = 0; i < problems.length; ++i) {
      if (contest.ranklist.ranking_params[problems[i].problem.id]) {
        weight = []; break;
      }
    }

    if (weight != null) {
      for (let i = 0; i < problems.length; ++i) {
        let multiplier = contest.ranklist.ranking_params[problems[i].problem.id] || 1.0;
        let full_score = Math.round (multiplier * 100);
        weight.push (full_score);
      }
    }

    res.render('contest', {
      contest: contest,
      problems: problems,
      hasStatistics: hasStatistics,
      isSupervisior: isSupervisior,
      weight: weight,
      username: curUser.username
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/contest/:id/repeat', async (req, res) => {
  try {

    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let contest_id = parseInt(req.params.id);
    let contest = await Contest.findById(contest_id);
    const curUser = res.locals.user;

    if (!contest) throw new ErrorMessage('无此比赛。');
    if (!contest.isEnded ()) throw new ErrorMessage('比赛未结束，请耐心等待 (´∀ `)');
    // if contest is non-public, both system administrators and contest administrators can see it.
    if (!contest.is_public && (!res.locals.user || (!res.locals.user.is_admin && !contest.admins.includes(res.locals.user.id.toString())))) throw new ErrorMessage('您没有权限进行此操作。');

    if ( await checkgp(contest,res.locals.user) ){
        ;
    }else{
        throw new ErrorMessage('group not included, cannot enter !');
    }

    await contest.loadRelationships();

    let players_id = [];
    for (let i = 1; i <= contest.ranklist.ranklist.player_num; i++) players_id.push(contest.ranklist.ranklist[i]);

    let problems_id = await contest.getProblems();
    let problems = await problems_id.mapAsync(async id => await Problem.findById(id));

    let repeatlist = await players_id.mapAsync(async player_id => {
      let player = await ContestPlayer.findById(player_id);
      let user = await User.findById(player.user_id);
      let number = 0;
      let prob = await problems.mapAsync (async problem => {
        let buti_judge = await problem.getJudgeState (user, true);
        if (buti_judge && buti_judge.status == 'Accepted') ++number;
        return {
          buti_judge: buti_judge
        };
      });

      return {
        number: number,
        user: user,
        problems: prob
      };
    });

    for (let i = 0; i < problems.length; ++i) problems[i].buti_num = 0;
    for (let it of repeatlist) {
      for (let i = 0; i < problems.length; ++i) {
        if (it.problems[i].buti_judge && it.problems[i].buti_judge.status == 'Accepted') ++problems[i].buti_num;
      }
    }

    repeatlist.sort (function(a, b){return b.number-a.number});

    res.render('contest_repeat', {
      hide_problem_title: problems.length >= 6,
      main_style: problems.length >= 6 ? 'width: auto!important;' : undefined,
      local_is_admin: res.locals.user.is_admin,
      contest: contest,
      repeatlist: repeatlist,
      problems: problems,
      key: null
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/contest/:id/repeat/:prefix', async (req, res) => {
  try {
    let key = req.query.key
    if(!key) {
      if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}
    }

    let contest_id = parseInt(req.params.id);
    let contest = await Contest.findById(contest_id);

    if (!contest) throw new ErrorMessage('无此比赛。');
    if (!contest.isEnded ()) throw new ErrorMessage('比赛未结束，请耐心等待 (´∀ `)');

    const curUser = res.locals.user;
    let local_is_admin = curUser && curUser.is_admin
    let pkey = get_key(req.params.prefix)

    if(pkey !== key) {
      // if contest is non-public, both system administrators and contest administrators can see it.

      if(!curUser) throw new ErrorMessage('您没有权限进行此操作。');

      if (!contest.is_public && (!res.locals.user || (!res.locals.user.is_admin && !contest.admins.includes(res.locals.user.id.toString())))) throw new ErrorMessage('您没有权限进行此操作。');

      if (await checkgp(contest, res.locals.user)) {
        ;
      } else {
        throw new ErrorMessage('group not included, cannot enter !');
      }
      key = pkey
    }

    await contest.loadRelationships();

    let players_id = [];
    for (let i = 1; i <= contest.ranklist.ranklist.player_num; i++) players_id.push(contest.ranklist.ranklist[i]);

    let problems_id = await contest.getProblems();
    let problems = await problems_id.mapAsync(async id => await Problem.findById(id));

    let repeatlist = await players_id.mapAsync(async player_id => {
      let player = await ContestPlayer.findById(player_id);
      let user = await User.findById(player.user_id);
      let number = 0;
      let prob = await problems.mapAsync (async problem => {
        let buti_judge = await problem.getJudgeState (user, true);
        if (buti_judge && buti_judge.status == 'Accepted') ++number;
        return {
          buti_judge: buti_judge
        };
      });

      return {
        number: number,
        user: user,
        problems: prob
      };
    });

    repeatlist = repeatlist.filter(item => item.user.nickname.startsWith(req.params.prefix));

    for (let i = 0; i < problems.length; ++i) problems[i].buti_num = 0;
    for (let it of repeatlist) {
      for (let i = 0; i < problems.length; ++i) {
        if (it.problems[i].buti_judge && it.problems[i].buti_judge.status == 'Accepted') ++problems[i].buti_num;
      }
    }

    repeatlist.sort (function(a, b){return b.number-a.number});

    res.render('contest_repeat', {
      hide_problem_title: problems.length >= 6,
      main_style: problems.length >= 6 ? 'width: auto!important;' : undefined,
      local_is_admin,
      contest: contest,
      repeatlist: repeatlist,
      problems: problems,
      key,
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/contest/:id/ranklist', async (req, res) => {
  try {

    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let contest_id = parseInt(req.params.id);
    let contest = await Contest.findById(contest_id);
    const curUser = res.locals.user;

    if (!contest) throw new ErrorMessage('无此比赛。');
    // if contest is non-public, both system administrators and contest administrators can see it.
    if (!contest.is_public && (!res.locals.user || (!res.locals.user.is_admin && !contest.admins.includes(res.locals.user.id.toString())))) throw new ErrorMessage('比赛未公开，请耐心等待 (´∀ `)');

    if ([contest.allowedSeeingResult() && contest.allowedSeeingOthers(),
    contest.isEnded(),
    await contest.isSupervisior(curUser)].every(x => !x))
      throw new ErrorMessage('您没有权限进行此操作。');

    if ( await checkgp(contest,res.locals.user) ){
        ;
    }else{
        throw new ErrorMessage('group not included, cannot enter !');
    }

    if (!contest.isRunning () && !contest.isEnded ()) throw new ErrorMessage('比赛未开始，请耐心等待 (´∀ `)');

    await contest.loadRelationships();

    let players_id = [];
    for (let i = 1; i <= contest.ranklist.ranklist.player_num; i++) players_id.push(contest.ranklist.ranklist[i]);

    let ranklist = await players_id.mapAsync(async player_id => {
      let player = await ContestPlayer.findById(player_id);

      if (contest.type === 'noi' || contest.type === 'ioi') {
        player.score = 0;
      }

      for (let i in player.score_details) {
        player.score_details[i].judge_state = await JudgeState.findById(player.score_details[i].judge_id);

        /*** XXX: Clumsy duplication, see ContestRanklist::updatePlayer() ***/
        if (contest.type === 'noi' || contest.type === 'ioi') {
          let multiplier = (contest.ranklist.ranking_params || {})[i] || 1.0;
          player.score_details[i].weighted_score = player.score_details[i].score == null ? null : Math.round(player.score_details[i].score * multiplier);
          player.score += player.score_details[i].weighted_score;
        }
      }

      let user = await User.findById(player.user_id);

      return {
        user: user,
        player: player
      };
    });

    let problems_id = await contest.getProblems();
    let problems = await problems_id.mapAsync(async id => await Problem.findById(id));

    for (let i = 0; i < problems.length; ++i) problems[i].ac_num = 0, problems[i].total = 0, problems[i].avg_score = 0.0;
    for (let it of ranklist) {
      for (let i = 0; i < problems.length; ++i) {
        if (!it.player.score_details[problems[i].id] || !it.player.score_details[problems[i].id].judge_state) continue;
        if (it.player.score_details[problems[i].id].judge_state.status == 'Accepted') ++problems[i].ac_num;
        ++problems[i].total;
        problems[i].avg_score += it.player.score_details[problems[i].id].score;
      }
    }
    for (let i = 0; i < problems.length; ++i) problems[i].avg_score /= problems[i].total;

    res.render('contest_ranklist', {
      hide_problem_title: problems.length >= 6,
      main_style: problems.length >= 6 ? 'width: auto!important;' : undefined,
      local_is_admin: res.locals.user.is_admin,
      contest: contest,
      ranklist: ranklist,
      problems: problems,
      key: null,
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});


app.get('/contest/:id/ranklist/:prefix', async (req, res) => {
  try {

    let key = req.query.key
    if(!key) {
      if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}
    }

    let contest_id = parseInt(req.params.id);
    let contest = await Contest.findById(contest_id);

    if (!contest) throw new ErrorMessage('无此比赛。');

    if (!contest.isRunning () && !contest.isEnded ()) throw new ErrorMessage('比赛未开始，请耐心等待 (´∀ `)');

    const curUser = res.locals.user;
    let pkey = get_key(req.params.prefix)
    let local_is_admin = curUser && curUser.is_admin
    //权限认证:
    if(pkey !== key) {

      if(!curUser) throw new ErrorMessage('您没有权限进行此操作。');
      // if contest is non-public, both system administrators and contest administrators can see it.
      if (!contest.is_public && (!res.locals.user || (!res.locals.user.is_admin && !contest.admins.includes(res.locals.user.id.toString())))) throw new ErrorMessage('比赛未公开，请耐心等待 (´∀ `)');

      if ([contest.allowedSeeingResult() && contest.allowedSeeingOthers(),
        contest.isEnded(),
        await contest.isSupervisior(curUser)].every(x => !x))
        throw new ErrorMessage('您没有权限进行此操作。');

      if ( await checkgp(contest,res.locals.user) ){
        ;
      }else{
        throw new ErrorMessage('group not included, cannot enter !');
      }

      key = pkey
    } else if(contest.isRunning() && !local_is_admin) throw new ErrorMessage('比赛未结束，请耐心等待 (´∀ `)');


    await contest.loadRelationships();

    let players_id = [];
    for (let i = 1; i <= contest.ranklist.ranklist.player_num; i++) players_id.push(contest.ranklist.ranklist[i]);

    let ranklist = await players_id.mapAsync(async player_id => {
      let player = await ContestPlayer.findById(player_id);

      if (contest.type === 'noi' || contest.type === 'ioi') {
        player.score = 0;
      }

      for (let i in player.score_details) {
        player.score_details[i].judge_state = await JudgeState.findById(player.score_details[i].judge_id);

        /*** XXX: Clumsy duplication, see ContestRanklist::updatePlayer() ***/
        if (contest.type === 'noi' || contest.type === 'ioi') {
          let multiplier = (contest.ranklist.ranking_params || {})[i] || 1.0;
          player.score_details[i].weighted_score = player.score_details[i].score == null ? null : Math.round(player.score_details[i].score * multiplier);
          player.score += player.score_details[i].weighted_score;
        }
      }

      let user = await User.findById(player.user_id);

      return {
        user: user,
        player: player,
      };
    });

    ranklist = ranklist.filter(item => item.user.nickname.startsWith(req.params.prefix));

    let problems_id = await contest.getProblems();
    let problems = await problems_id.mapAsync(async id => await Problem.findById(id));

    for (let i = 0; i < problems.length; ++i) problems[i].ac_num = 0, problems[i].total = 0, problems[i].avg_score = 0.0;
    for (let it of ranklist) {
      for (let i = 0; i < problems.length; ++i) {
        if (!it.player.score_details[problems[i].id] || !it.player.score_details[problems[i].id].judge_state) continue;
        if (it.player.score_details[problems[i].id].judge_state.status == 'Accepted') ++problems[i].ac_num;
        ++problems[i].total;
        problems[i].avg_score += it.player.score_details[problems[i].id].score;
      }
    }
    for (let i = 0; i < problems.length; ++i) problems[i].avg_score /= problems[i].total;

    res.render('contest_ranklist', {
      hide_problem_title: problems.length >= 6,
      main_style: problems.length >= 6 ? 'width: auto!important;' : undefined,
      local_is_admin,
      contest: contest,
      ranklist: ranklist,
      problems: problems,
      key,
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});


function getDisplayConfig(contest) {
  return {
    showScore: contest.allowedSeeingScore(),
    showUsage: false,
    showCode: false,
    showResult: contest.allowedSeeingResult(),
    showOthers: contest.allowedSeeingOthers(),
    showDetailResult: contest.allowedSeeingTestcase(),
    showTestdata: false,
    inContest: true,
    showRejudge: false
  };
}

app.get('/contest/:id/submissions', async (req, res) => {
  try {

    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let contest_id = parseInt(req.params.id);
    let contest = await Contest.findById(contest_id);
    // if contest is non-public, both system administrators and contest administrators can see it.
    if (!contest.is_public && (!res.locals.user || (!res.locals.user.is_admin && !contest.admins.includes(res.locals.user.id.toString())))) throw new ErrorMessage('比赛未公开，请耐心等待 (´∀ `)');

    if (contest.isEnded()) {
      res.redirect(syzoj.utils.makeUrl(['submissions'], { contest: contest_id }));
      return;
    }

    if ( await checkgp(contest,res.locals.user) ){
        ;
    }else{
        throw new ErrorMessage('group not included, cannot enter !');
    }

    const displayConfig = getDisplayConfig(contest);
    let problems_id = await contest.getProblems();
    const curUser = res.locals.user;

    let user = req.query.submitter && await User.fromName(req.query.submitter);

    let query = JudgeState.createQueryBuilder();

    let isFiltered = false;
    if (displayConfig.showOthers) {
      if (user) {
        query.andWhere('user_id = :user_id', { user_id: user.id });
        isFiltered = true;
      }
    } else {
      if (curUser == null || // Not logined
        (user && user.id !== curUser.id)) { // Not querying himself
        throw new ErrorMessage("您没有权限执行此操作。");
      }
      query.andWhere('user_id = :user_id', { user_id: curUser.id });
      isFiltered = true;
    }

    if (displayConfig.showScore) {
      let minScore = parseInt(req.body.min_score);
      if (!isNaN(minScore)) query.andWhere('score >= :minScore', { minScore });
      let maxScore = parseInt(req.body.max_score);
      if (!isNaN(maxScore)) query.andWhere('score <= :maxScore', { maxScore });

      if (!isNaN(minScore) || !isNaN(maxScore)) isFiltered = true;
    }

    if (req.query.language) {
      if (req.body.language === 'submit-answer') {
        query.andWhere(new TypeORM.Brackets(qb => {
          qb.orWhere('language = :language', { language: '' })
            .orWhere('language IS NULL');
        }));
      } else if (req.body.language === 'non-submit-answer') {
        query.andWhere('language != :language', { language: '' })
             .andWhere('language IS NOT NULL');
      } else {
        query.andWhere('language = :language', { language: req.body.language })
      }
      isFiltered = true;
    }

    if (displayConfig.showResult) {
      if (req.query.status) {
        query.andWhere('status = :status', { status: req.query.status });
        isFiltered = true;
      }
    }

    if (req.query.problem_id) {
      problem_id = problems_id[parseInt(req.query.problem_id) - 1] || 0;
      query.andWhere('problem_id = :problem_id', { problem_id })
      isFiltered = true;
    }

    query.andWhere('type = 1')
         .andWhere('type_info = :contest_id', { contest_id });

    let judge_state, paginate;

    if (syzoj.config.submissions_page_fast_pagination) {
      const queryResult = await JudgeState.queryPageFast(query, syzoj.utils.paginateFast(
        req.query.currPageTop, req.query.currPageBottom, syzoj.config.page.judge_state
      ), -1, parseInt(req.query.page));

      judge_state = queryResult.data;
      paginate = queryResult.meta;
    } else {
      paginate = syzoj.utils.paginate(
        await JudgeState.countQuery(query),
        req.query.page,
        syzoj.config.page.judge_state
      );
      judge_state = await JudgeState.queryPage(paginate, query, { id: "DESC" }, true);
    }

    await judge_state.forEachAsync(async obj => {
      await obj.loadRelationships();
      obj.problem_id = problems_id.indexOf(obj.problem_id) + 1;
      obj.problem.title = syzoj.utils.removeTitleTag(obj.problem.title);
    });


    let page = req.query.no_jump ?  'submissions_modal' : 'submissions'

    const pushType = displayConfig.showResult ? 'rough' : 'compile';
    res.render(page, {
      local_is_admin: res.locals.user.is_admin,
      contest: contest,
      items: judge_state.map(x => ({
        info: getSubmissionInfo(x, displayConfig),
        token: (getRoughResult(x, displayConfig) == null && x.task_id != null) ? jwt.sign({
          taskId: x.task_id,
          type: pushType,
          displayConfig: displayConfig
        }, syzoj.config.session_secret) : null,
        result: getRoughResult(x, displayConfig),
        remote: x.isRemoteTask(),
        running: false,
      })),
      paginate: paginate,
      form: req.query,
      displayConfig: displayConfig,
      pushType: pushType,
      isFiltered: isFiltered,
      fast_pagination: syzoj.config.submissions_page_fast_pagination
    });
  } catch (e) {
    syzoj.log(e);
    res.render(req.query.no_jump ? 'error_modal': 'error', {
      err: e
    });
  }
});


app.get('/contest/submission/:id', async (req, res) => {
  try {

    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    const id = parseInt(req.params.id);
    const judge = await JudgeState.findById(id);
    if (!judge) throw new ErrorMessage("提交记录 ID 不正确。");
    const curUser = res.locals.user;
    if ((!curUser) || judge.user_id !== curUser.id) throw new ErrorMessage("您没有权限执行此操作。");

    if (judge.type !== 1) {
      return res.redirect(syzoj.utils.makeUrl(['submission', id]));
    }

    const contest = await Contest.findById(judge.type_info);
    contest.ended = contest.isEnded();

    const displayConfig = getDisplayConfig(contest);
    displayConfig.showCode = true;

    await judge.loadRelationships();
    const problems_id = await contest.getProblems();
    judge.problem_id = problems_id.indexOf(judge.problem_id) + 1;
    judge.problem.title = syzoj.utils.removeTitleTag(judge.problem.title);

    if (judge.problem.type !== 'submit-answer') {
      judge.codeLength = Buffer.from(judge.code).length;
      judge.code = await syzoj.utils.highlight(judge.code, syzoj.languages[judge.language].highlight);
    }

    let page = req.query.no_jump ?  'submission_modal' : 'submission'
    res.render(page, {
      local_is_admin: res.locals.user.is_admin,
      info: getSubmissionInfo(judge, displayConfig),
      roughResult: getRoughResult(judge, displayConfig),
      vj_info: judge.vj_info,
      remote: judge.isRemoteTask(),
      code: (displayConfig.showCode && judge.problem.type !== 'submit-answer') ? judge.code.toString("utf8") : '',
      formattedCode: judge.formattedCode ? judge.formattedCode.toString("utf8") : null,
      preferFormattedCode: res.locals.user ? res.locals.user.prefer_formatted_code : false,
      detailResult: processOverallResult(judge.result, displayConfig),
      socketToken: (displayConfig.showDetailResult && judge.pending && judge.task_id != null) ? jwt.sign({
        taskId: judge.task_id,
        displayConfig: displayConfig,
        type: 'detail'
      }, syzoj.config.session_secret) : null,
      displayConfig: displayConfig,
      contest: contest,
    });
  } catch (e) {
    syzoj.log(e);
    res.render(req.query.no_jump ? 'error_modal': 'error', {
      err: e
    });
  }
});

app.get('/contest/:id/problem/:pid', async (req, res) => {
  try {

    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let contest_id = parseInt(req.params.id);
    let contest = await Contest.findById(contest_id);
    if (!contest) throw new ErrorMessage('无此比赛。');
    const curUser = res.locals.user;

    if ( await checkgp(contest,res.locals.user) ){
        ;
    }else{
        throw new ErrorMessage('group not included, cannot enter !');
    }

    let problems_id = await contest.getProblems();

    let pid = parseInt(req.params.pid);
    if (!pid || pid < 1 || pid > problems_id.length) throw new ErrorMessage('无此题目。');

    let problem_id = problems_id[pid - 1];
    let problem = await Problem.findById(problem_id);
    await problem.loadRelationships();

    contest.ended = contest.isEnded();
    if (!await contest.isSupervisior(curUser) && !(contest.isRunning() || contest.isEnded())) {
      // if (await problem.isAllowedUseBy(res.locals.user)) {
      //   return res.redirect(syzoj.utils.makeUrl(['problem', problem_id]));
      // }
      throw new ErrorMessage('比赛尚未开始。');
    }

    problem.specialJudge = await problem.hasSpecialJudge();

    problem.allowedEdit = await problem.isAllowedEditBy(res.locals.user);
    problem.allowedManage = await problem.isAllowedManageBy(res.locals.user);

    await syzoj.utils.markdown(problem, ['description', 'input_format', 'output_format', 'example', 'limit_and_hint']);

    // let state = await problem.getJudgeState(res.locals.user, false);
    let testcases = await syzoj.utils.parseTestdata(problem.getTestdataPath(), problem.type === 'submit-answer');

    let discussionCount = await Article.count({ problem_id: problem_id });

    await problem.loadRelationships();

    res.render('problem', {
      pid: pid,
      contest: contest,
      problem: problem,
      state: null,
      lastLanguage: res.locals.user ? await res.locals.user.getLastSubmitLanguage() : null,
      testcases: testcases,
      discussionCount: discussionCount
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/contest/:id/:pid/download/additional_file', async (req, res) => {
  try {

    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let id = parseInt(req.params.id);
    let contest = await Contest.findById(id);
    if (!contest) throw new ErrorMessage('无此比赛。');

    if ( await checkgp(contest,res.locals.user) ){
        ;
    }else{
        throw new ErrorMessage('group not included, cannot enter !');
    }

    let problems_id = await contest.getProblems();

    let pid = parseInt(req.params.pid);
    if (!pid || pid < 1 || pid > problems_id.length) throw new ErrorMessage('无此题目。');

    let problem_id = problems_id[pid - 1];
    let problem = await Problem.findById(problem_id);

    contest.ended = contest.isEnded();
    if (!(contest.isRunning() || contest.isEnded())) {
      if (await problem.isAllowedUseBy(res.locals.user)) {
        return res.redirect(syzoj.utils.makeUrl(['problem', problem_id, 'download', 'additional_file']));
      }
      throw new ErrorMessage('比赛尚未开始。');
    }

    await problem.loadRelationships();

    if (!problem.additional_file) throw new ErrorMessage('无附加文件。');

    res.download(problem.additional_file.getPath(), `additional_file_${id}_${pid}.zip`);
  } catch (e) {
    syzoj.log(e);
    res.status(404);
    res.render('error', {
      err: e
    });
  }
});
