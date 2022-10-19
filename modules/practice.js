let Practice = syzoj.model('practice');
let PracticeRanklist = syzoj.model('practice_ranklist');
let PracticePlayer = syzoj.model('practice_player');
let Problem = syzoj.model('problem');
let JudgeState = syzoj.model('judge_state');
let User = syzoj.model('user');
let Article = syzoj.model('article');

const jwt = require('jsonwebtoken');
const { getSubmissionInfo, getRoughResult, processOverallResult } = require('../libs/submissions_process');


async function practice_check_open(practice){
    let gid = practice.group_id;
    let gids = gid.split('|');
    return gids.indexOf('chk')!=-1 ;
}

async function practice_permitted(practice,user){
    const entityManager = TypeORM.getManager();
    let cid = practice.id;
    let uid = user.id;
    let res = await entityManager.query(`SELECT * from practice_permission where cid=${cid} and uid=${uid}`);
    if(res.length==0) return false;
    let sta = res[0]['status'];
    return ( sta == 'allow' ) ;
}

async function checkgp(practice,user){
    if (user.is_admin) return true;

    if (!practice.is_public) throw new ErrorMessage('练习赛未公开');

    let cts = await user.getpracs();

    if( cts.indexOf(practice.id)!=-1 ) {
        return true;
    }
    if( await practice_check_open(practice) && await practice_permitted(practice,user)){
        return true;
    }
    return false;
}

app.get('/practices', async (req, res) => {
  try {
    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let where;
    if (res.locals.user.is_admin) where = {}
    else {
        let mycont = await res.locals.user.getpracs();
        if ( mycont.length === 0 ){
            where = Practice.createQueryBuilder().where(`group_id like '%chk%'`);
        }else{
            where = Practice.createQueryBuilder()
                .where(`id IN (:...mycont)`,{mycont:mycont})
                .andWhere(`is_public = 1`)
                .orWhere(`group_id like '%chk%'`);
        }
    }
    let paginate = syzoj.utils.paginate(await Practice.countForPagination(where), req.query.page, syzoj.config.page.practice);
    let practices = await Practice.queryPage(paginate, where, {
      start_time: 'DESC'
    });

    await practices.forEachAsync(async x => x.subtitle = await syzoj.utils.markdown(x.subtitle));

    res.render('practices', {
      is_admin: res.locals.user.is_admin,
      practices: practices,
      paginate: paginate
    })
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/practice/:id/edit', async (req, res) => {
  try {

    let practice_id = parseInt(req.params.id);
    let practice = await Practice.findById(practice_id);
    if (!practice) {
      // if practice does not exist, only system administrators can create one
      if (!res.locals.user || !res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');

      practice = await Practice.create();
      practice.id = 0;
    } else {
      // if practice exists, both system administrators and practice administrators can edit it.
      if (!res.locals.user || (!res.locals.user.is_admin && !practice.admins.includes(res.locals.user.id.toString()))) throw new ErrorMessage('您没有权限进行此操作。');

      await practice.loadRelationships();
    }

    let problems = [], admins = [];
    if (practice.problems) problems = await practice.problems.split('|').mapAsync(async id => await Problem.findById(id));
    if (practice.admins) admins = await practice.admins.split('|').mapAsync(async id => await User.findById(id));

    res.render('practice_edit', {
      practice: practice,
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

app.post('/practice/:id/edit', async (req, res) => {
  try {

    let practice_id = parseInt(req.params.id);
    let practice = await Practice.findById(practice_id);
    let ranklist = null;
    if (!practice) {
      // if practice does not exist, only system administrators can create one
      if (!res.locals.user || !res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');

      practice = await Practice.create();

      practice.holder_id = res.locals.user.id;

      ranklist = await PracticeRanklist.create();

      // Only new practice can be set type
      if (!['noi', 'ioi', 'acm'].includes(req.body.type)) throw new ErrorMessage('无效的赛制。');
      practice.type = req.body.type;
    } else {
      // if practice exists, both system administrators and practice administrators can edit it.
      if (!res.locals.user || (!res.locals.user.is_admin && !practice.admins.includes(res.locals.user.id.toString()))) throw new ErrorMessage('您没有权限进行此操作。');
      
      await practice.loadRelationships();
      ranklist = practice.ranklist;
    }

    try {
      ranklist.ranking_params = JSON.parse(req.body.ranking_params);
    } catch (e) {
      ranklist.ranking_params = {};
    }
    await ranklist.save();
    practice.ranklist_id = ranklist.id;

    if (!req.body.title.trim()) throw new ErrorMessage('练习赛名不能为空。');
    practice.title = req.body.title;
    practice.subtitle = req.body.subtitle;
    if (!Array.isArray(req.body.problems)) req.body.problems = [req.body.problems];
    if (!Array.isArray(req.body.admins)) req.body.admins = [req.body.admins];
    practice.problems = req.body.problems.join('|');
    practice.admins = req.body.admins.join('|');
    practice.information = req.body.information;
    practice.start_time = syzoj.utils.parseDate(req.body.start_time);
    practice.end_time = syzoj.utils.parseDate(req.body.end_time);
    practice.is_public = req.body.is_public === 'on';
    practice.hide_statistics = req.body.hide_statistics === 'on';

    practice.group_id = req.body.group_id;

    await practice.save();

    res.redirect(syzoj.utils.makeUrl(['practice', practice.id]));
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/practice/:id', async (req, res) => {
  try {


    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    const curUser = res.locals.user;
    let practice_id = parseInt(req.params.id);

    let practice = await Practice.findById(practice_id);
    if (!practice) throw new ErrorMessage('无此练习赛。');

    const isSupervisior = await practice.isSupervisior(curUser);

    if(!isSupervisior){
        if( await checkgp(practice,res.locals.user) ){
            ;
        }else{
            if( await practice_check_open(practice) ){
                if( await practice_permitted(practice,res.locals.user) ){
                    ;
                }else{
                    throw new ErrorMessage(
                        '请申请访问练习赛,并等待管理员同意!',
                        {
                            '申请访问': syzoj.utils.makeUrl(['dp/chk/practice_permission_require.php?cid='+practice_id])
                        }
                    );
                }
            }else
                throw new ErrorMessage('group not included, cannot enter !');
        }
    }

    // if practice is non-public, both system administrators and practice administrators can see it.
    if (!practice.is_public && (!res.locals.user || (!res.locals.user.is_admin && !practice.admins.includes(res.locals.user.id.toString())))) throw new ErrorMessage('练习赛未公开，请耐心等待 (´∀ `)');

    practice.running = practice.isRunning();
    practice.ended = practice.isEnded();
    practice.subtitle = await syzoj.utils.markdown(practice.subtitle);
    practice.information = await syzoj.utils.markdown(practice.information);

    let problems_id = await practice.getProblems();
    let problems = await problems_id.mapAsync(async id => await Problem.findById(id));

    let player = null;

    if (res.locals.user) {
      player = await PracticePlayer.findInPractice({
        practice_id: practice.id,
        user_id: res.locals.user.id
      });
    }

    problems = problems.map(x => ({ problem: x, status: null, judge_id: null, statistics: null }));


    for(let problem of problems){
        problem.buti_judge = await problem.problem.getJudgeState(res.locals.user,true);
        problem.tags = await problem.problem.getTags();
    }


    if (player) {
      for (let problem of problems) {
        if (practice.type === 'noi') {
          if (player.score_details[problem.problem.id]) {
            let judge_state = await JudgeState.findById(player.score_details[problem.problem.id].judge_id);
            problem.status = judge_state.score.toString();
            if (!practice.ended && !await problem.problem.isAllowedEditBy(res.locals.user) && !['Compile Error', 'Waiting', 'Compiling'].includes(problem.status)) {
              problem.status = 'Submitted';
            }
            problem.judge_id = player.score_details[problem.problem.id].judge_id;
          }
        } else if (practice.type === 'ioi') {
          if (player.score_details[problem.problem.id]) {
            let judge_state = await JudgeState.findById(player.score_details[problem.problem.id].judge_id);
            problem.status = judge_state.status;
            problem.judge_id = player.score_details[problem.problem.id].judge_id;
            await practice.loadRelationships();
            let multiplier = practice.ranklist.ranking_params[problem.problem.id] || 1.0;
            problem.feedback = (judge_state.score * multiplier).toString() + ' / ' + (100 * multiplier).toString();
          }
        } else if (practice.type === 'acm') {
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
    if ((!practice.hide_statistics) || (practice.ended) || (isSupervisior)) {
      hasStatistics = true;

      await practice.loadRelationships();
      let players = await practice.ranklist.getPlayers();
      for (let problem of problems) {
        problem.statistics = { attempt: 0, accepted: 0 };

        if (practice.type === 'ioi' || practice.type === 'noi') {
          problem.statistics.partially = 0;
        }

        for (let player of players) {
          if (player.score_details[problem.problem.id]) {
            problem.statistics.attempt++;
            if ((practice.type === 'acm' && player.score_details[problem.problem.id].accepted) || ((practice.type === 'noi' || practice.type === 'ioi') && player.score_details[problem.problem.id].score === 100)) {
              problem.statistics.accepted++;
            }

            if ((practice.type === 'noi' || practice.type === 'ioi') && player.score_details[problem.problem.id].score > 0) {
              problem.statistics.partially++;
            }
          }
        }
      }
    }

    res.render('practice', {
      practice: practice,
      problems: problems,
      hasStatistics: hasStatistics,
      isSupervisior: isSupervisior
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/practice/:id/ranklist', async (req, res) => {
  try {

    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let practice_id = parseInt(req.params.id);
    let practice = await Practice.findById(practice_id);
    const curUser = res.locals.user;

    if (!practice) throw new ErrorMessage('无此练习赛。');
    // if practice is non-public, both system administrators and practice administrators can see it.
    if (!practice.is_public && (!res.locals.user || (!res.locals.user.is_admin && !practice.admins.includes(res.locals.user.id.toString())))) throw new ErrorMessage('练习赛未公开，请耐心等待 (´∀ `)');

    if ([practice.allowedSeeingResult() && practice.allowedSeeingOthers(),
    practice.isEnded(),
    await practice.isSupervisior(curUser)].every(x => !x))
      throw new ErrorMessage('您没有权限进行此操作。');

    if ( await checkgp(practice,res.locals.user) ){
        ;
    }else{
        throw new ErrorMessage('group not included, cannot enter !');
    }

    await practice.loadRelationships();

    let players_id = [];
    for (let i = 1; i <= practice.ranklist.ranklist.player_num; i++) players_id.push(practice.ranklist.ranklist[i]);

    let ranklist = await players_id.mapAsync(async player_id => {
      let player = await PracticePlayer.findById(player_id);

      if (practice.type === 'noi' || practice.type === 'ioi') {
        player.score = 0;
      }

      for (let i in player.score_details) {
        player.score_details[i].judge_state = await JudgeState.findById(player.score_details[i].judge_id);

        /*** XXX: Clumsy duplication, see PracticeRanklist::updatePlayer() ***/
        if (practice.type === 'noi' || practice.type === 'ioi') {
          let multiplier = (practice.ranklist.ranking_params || {})[i] || 1.0;
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

    let problems_id = await practice.getProblems();
    let problems = await problems_id.mapAsync(async id => await Problem.findById(id));

    res.render('practice_ranklist', {
      main_style: 'width: auto!important;',
      local_is_admin: res.locals.user.is_admin,
      practice: practice,
      ranklist: ranklist,
      problems: problems
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

function getDisplayConfig(practice) {
  return {
    showScore: practice.allowedSeeingScore(),
    showUsage: false,
    showCode: false,
    showResult: practice.allowedSeeingResult(),
    showOthers: practice.allowedSeeingOthers(),
    showDetailResult: practice.allowedSeeingTestcase(),
    showTestdata: false,
    inPractice: true,
    showRejudge: false
  };
}

app.get('/practice/:id/submissions', async (req, res) => {
  try {

    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let practice_id = parseInt(req.params.id);
    let practice = await Practice.findById(practice_id);
    // if practice is non-public, both system administrators and practice administrators can see it.
    if (!practice.is_public && (!res.locals.user || (!res.locals.user.is_admin && !practice.admins.includes(res.locals.user.id.toString())))) throw new ErrorMessage('练习赛未公开，请耐心等待 (´∀ `)');

    // if (practice.isEnded()) {
      res.redirect(syzoj.utils.makeUrl(['submissions'], { practice: practice_id }));
      return;
    // }

    if ( await checkgp(practice,res.locals.user) ){
        ;
    }else{
        throw new ErrorMessage('group not included, cannot enter !');
    }

    const displayConfig = getDisplayConfig(practice);
    let problems_id = await practice.getProblems();
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
         .andWhere('type_info = :practice_id', { practice_id });

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

    const pushType = displayConfig.showResult ? 'rough' : 'compile';
    res.render('submissions', {
      local_is_admin: res.locals.user.is_admin,
      practice: practice,
      items: judge_state.map(x => ({
        info: getSubmissionInfo(x, displayConfig),
        token: (getRoughResult(x, displayConfig) == null && x.task_id != null) ? jwt.sign({
          taskId: x.task_id,
          type: pushType,
          displayConfig: displayConfig
        }, syzoj.config.session_secret) : null,
        result: getRoughResult(x, displayConfig),
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
    res.render('error', {
      err: e
    });
  }
});


app.get('/practice/submission/:id', async (req, res) => {
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

    const practice = await Practice.findById(judge.type_info);
    practice.ended = practice.isEnded();

    const displayConfig = getDisplayConfig(practice);
    displayConfig.showCode = true;

    await judge.loadRelationships();
    const problems_id = await practice.getProblems();
    judge.problem_id = problems_id.indexOf(judge.problem_id) + 1;
    judge.problem.title = syzoj.utils.removeTitleTag(judge.problem.title);

    if (judge.problem.type !== 'submit-answer') {
      judge.codeLength = Buffer.from(judge.code).length;
      judge.code = await syzoj.utils.highlight(judge.code, syzoj.languages[judge.language].highlight);
    }

    res.render('submission', {
      local_is_admin: res.locals.user.is_admin,
      info: getSubmissionInfo(judge, displayConfig),
      roughResult: getRoughResult(judge, displayConfig),
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
      practice: practice,
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/practice/:id/problem/:pid', async (req, res) => {
  try {

    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let practice_id = parseInt(req.params.id);
    let practice = await Practice.findById(practice_id);
    if (!practice) throw new ErrorMessage('无此练习赛。');
    const curUser = res.locals.user;

    if ( await checkgp(practice,res.locals.user) ){
        ;
    }else{
        throw new ErrorMessage('group not included, cannot enter !');
    }

    let problems_id = await practice.getProblems();

    let pid = parseInt(req.params.pid);
    if (!pid || pid < 1 || pid > problems_id.length) throw new ErrorMessage('无此题目。');

    let problem_id = problems_id[pid - 1];
    let problem = await Problem.findById(problem_id);
    await problem.loadRelationships();

    practice.ended = practice.isEnded();
    if (!await practice.isSupervisior(curUser) && !(practice.isRunning() || practice.isEnded())) {
      if (await problem.isAllowedUseBy(res.locals.user)) {
        return res.redirect(syzoj.utils.makeUrl(['problem', problem_id]));
      }
      throw new ErrorMessage('练习赛尚未开始。');
    }

    problem.specialJudge = await problem.hasSpecialJudge();

    problem.allowedEdit = await problem.isAllowedEditBy(res.locals.user);
    problem.allowedManage = await problem.isAllowedManageBy(res.locals.user);

    await syzoj.utils.markdown(problem, ['description', 'input_format', 'output_format', 'example', 'limit_and_hint']);

    let state = await problem.getJudgeState(res.locals.user, false);
    let testcases = await syzoj.utils.parseTestdata(problem.getTestdataPath(), problem.type === 'submit-answer');

    let discussionCount = await Article.count({ problem_id: problem_id });

    await problem.loadRelationships();

    res.render('problem', {
      pid: pid,
      practice: practice,
      problem: problem,
      state: state,
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

app.get('/practice/:id/:pid/download/additional_file', async (req, res) => {
  try {

    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}

    let id = parseInt(req.params.id);
    let practice = await Practice.findById(id);
    if (!practice) throw new ErrorMessage('无此练习赛。');

    if ( await checkgp(practice,res.locals.user) ){
        ;
    }else{
        throw new ErrorMessage('group not included, cannot enter !');
    }

    let problems_id = await practice.getProblems();

    let pid = parseInt(req.params.pid);
    if (!pid || pid < 1 || pid > problems_id.length) throw new ErrorMessage('无此题目。');

    let problem_id = problems_id[pid - 1];
    let problem = await Problem.findById(problem_id);

    practice.ended = practice.isEnded();
    if (!(practice.isRunning() || practice.isEnded())) {
      if (await problem.isAllowedUseBy(res.locals.user)) {
        return res.redirect(syzoj.utils.makeUrl(['problem', problem_id, 'download', 'additional_file']));
      }
      throw new ErrorMessage('练习赛尚未开始。');
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
