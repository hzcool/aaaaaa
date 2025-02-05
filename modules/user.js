let User = syzoj.model('user');
const JudgeState = syzoj.model('judge_state')
const RatingCalculation = syzoj.model('rating_calculation');
const RatingHistory = syzoj.model('rating_history');
const Contest = syzoj.model('contest');
const ContestPlayer = syzoj.model('contest_player');
const ProblemSummary = syzoj.model('problem_summary')
const ContestSummary = syzoj.model('contest_summary');
const Practice = syzoj.model('practice');
const PracticePlayer = syzoj.model('practice_player');
const LoginLog = syzoj.model('loginlog');
const Problem = syzoj.model('problem')

// Ranklist
app.get('/ranklist', async (req, res) => {
  try {
    if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}
    if(!res.locals.user || !res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');

    const sort = req.query.sort || syzoj.config.sorting.ranklist.field;
    const order = req.query.order || syzoj.config.sorting.ranklist.order;
    if (!['ac_num', 'rating', 'id', 'username','end_time', 'last_login_time','group_id'].includes(sort) || !['asc', 'desc'].includes(order)) {
      throw new ErrorMessage('错误的排序参数。');
    }

    let keyword = req.query.keyword;
    let query = User.createQueryBuilder();
    query.where ('is_show = 1');
    if(keyword) {
      query.andWhere(`(username LIKE '%${keyword}%' OR nickname LIKE '%${keyword}%' OR group_id='${keyword}')`)
      // query.  where('username LIKE :username', { username: `%${keyword}%` });
      // query.orWhere('nickname LIKE :nickname', { nickname: `%${keyword}%` });
      // query.orWhere('group_id LIKE :group_id', { group_id: `%${keyword}%` });
    }

    let paginate = syzoj.utils.paginate(await User.countForPagination(query), req.query.page, syzoj.config.page.ranklist);
    let ranklist = await User.queryPage(paginate, query, { [sort]: order.toUpperCase() });
    await ranklist.forEachAsync(async x => x.renderInformation());

    // await ranklist.forEachAsync(async x => x.last_login_time = await LoginLog.getLastLoginTime(x.id));

    res.render('ranklist', {
      ranklist: ranklist,
      paginate: paginate,
      curSort: sort,
      curOrder: order === 'asc'
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/find_user', async (req, res) => {
  try {
    // let user = await User.fromName(req.query.nickname);
    // if (!user) throw new ErrorMessage('无此用户。');
    // res.redirect(syzoj.utils.makeUrl(['user', user.id]));
    res.redirect(syzoj.utils.makeUrl(['ranklist'], { keyword: req.query.nickname }));
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

// Login
app.get('/login', async (req, res) => {
  if (res.locals.user) {
    res.render('error', {
      err: new ErrorMessage('您已经登录了，请先注销。', { '注销': syzoj.utils.makeUrl(['logout'], { 'url': req.originalUrl }) })
    });
  } else {
    res.render('login');
  }
});

// Sign up
app.get('/sign_up', async (req, res) => {
  if (res.locals.user) {
    res.render('error', {
      err: new ErrorMessage('您已经登录了，请先注销。', { '注销': syzoj.utils.makeUrl(['logout'], { 'url': req.originalUrl }) })
    });
  } else {
    res.render('sign_up');
  }
});

// Logout
app.post('/logout', async (req, res) => {
  req.session.user_id = null;
  res.clearCookie('login');
  res.redirect(req.query.url || '/');
});

// User page
app.get('/user/:id', async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let user = await User.findById(id);
    if (!user) throw new ErrorMessage('无此用户。');
    user.ac_problems = await user.getACProblems();
    user.articles = await user.getArticles();
    user.allowedEdit = await user.isAllowedEditBy(res.locals.user);

    let statistics = await user.getStatistics();
    await user.renderInformation();
    user.emailVisible = user.public_email || user.allowedEdit;

    const ratingHistoryValues = await RatingHistory.find({
      where: { user_id: user.id },
      order: { rating_calculation_id: 'ASC' }
    });
    const ratingHistories = [{
      contestName: "初始积分",
      value: syzoj.config.default.user.rating,
      delta: null,
      rank: null
    }];

    for (const history of ratingHistoryValues) {
      const contest = await Contest.findById((await RatingCalculation.findById(history.rating_calculation_id)).contest_id);
      ratingHistories.push({
        contestName: contest.title,
        value: history.rating_after,
        delta: history.rating_after - ratingHistories[ratingHistories.length - 1].value,
        rank: history.rank,
        participants: await ContestPlayer.count({ contest_id: contest.id })
      });
    }
    ratingHistories.reverse();

    // user.loginlog = await LoginLog.findOne({
    //   where: {user_id: id},
    //   order: {login_time: 'DESC'}
    // });

    let lim = new Date ();
    lim.setDate (lim.getDate () - 10);
    let loginlog = await LoginLog.find ({
      where: {
        user_id: id,
        login_time: TypeORM.MoreThanOrEqual (lim)
      },
      order: {login_time: 'DESC'}
    });
    let iplog = [];
    loginlog.forEach (x => {
      let day = x.login_time.toLocaleDateString ();
      if (!iplog.length || iplog[iplog.length - 1].day != day) {
        iplog.push ({
          day: day,
          log: []
        });
      }
      iplog[iplog.length - 1].log.push ({
        ip: x.ip,
        time: x.login_time
      });
    });

    user.iplog = iplog;

    res.render('user', {
      show_user: user,
      statistics: statistics,
      ratingHistories: ratingHistories
		});
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/user/:id/edit', async (req, res) => {
  try {
    // if(!res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');
    let id = parseInt(req.params.id);
    let user = await User.findById(id);
    if (!user) throw new ErrorMessage('无此用户。');

    // let allowedEdit = await user.isAllowedEditBy(res.locals.user);
    // if (!allowedEdit) {
    //   throw new ErrorMessage('您没有权限进行此操作。');
    // }

    user.privileges = await user.getPrivileges();

    res.locals.user.allowedManage = await res.locals.user.hasPrivilege(syzoj.PrivilegeType.ManageUser);

    res.render('user_edit', {
      is_admin: res.locals.user.is_admin,
      edited_user: user,
      error_info: null
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.get('/forget', async (req, res) => {
  res.render('forget');
});



app.post('/user/:id/edit', async (req, res) => {
  try {
    let user;
    try {
      let id = parseInt(req.params.id);
      user = await User.findById(id);
      if (!user) throw new ErrorMessage('无此用户。');

      let allowedEdit = await user.isAllowedEditBy(res.locals.user);
      if (!allowedEdit) throw new ErrorMessage('您没有权限进行此操作。');

      if (req.body.old_password && req.body.new_password) {
        if (user.password !== req.body.old_password && !await res.locals.user.hasPrivilege(syzoj.PrivilegeType.ManageUser)) throw new ErrorMessage('旧密码错误。');
        user.password = req.body.new_password;
      }


      if (res.locals.user && res.locals.user.is_admin) {
        if (!syzoj.utils.isValidUsername(req.body.username)) throw new ErrorMessage('无效的用户名。');
        user.username = req.body.username;
        user.email = req.body.email;
        user.nickname = req.body.nickname;

        user.luogu_account = req.body.luogu_account;
        user.codeforces_account = req.body.codeforces_account;
        user.atcoder_account = req.body.atcoder_account;

        if (!req.body.privileges) {
          req.body.privileges = [];
        } else if (!Array.isArray(req.body.privileges)) {
          req.body.privileges = [req.body.privileges];
        }

        user.is_show = user.public_email = (req.body.public_email === 'on');
        user.group_id = req.body.group_id;
        user.start_time = syzoj.utils.parseDate(req.body.start_time);
        user.end_time = syzoj.utils.parseDate(req.body.end_time);

        let privileges = req.body.privileges;
        await user.setPrivileges(privileges);
      }


      user.information = req.body.information;
      user.sex = req.body.sex;
      user.prefer_formatted_code = (req.body.prefer_formatted_code === 'on');

      await user.save();

      if (user.id === res.locals.user.id) res.locals.user = user;

      user.privileges = await user.getPrivileges();
      res.locals.user.allowedManage = await res.locals.user.hasPrivilege(syzoj.PrivilegeType.ManageUser);

      res.render('user_edit', {
        is_admin: res.locals.user.is_admin,
        edited_user: user,
        error_info: ''
      });
    } catch (e) {
      user.privileges = await user.getPrivileges();
      res.locals.user.allowedManage = await res.locals.user.hasPrivilege(syzoj.PrivilegeType.ManageUser);

      res.render('user_edit', {
        is_admin: res.locals.user.is_admin,
        edited_user: user,
        error_info: e.message
      });
    }
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

function get_account_info(user) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    luogu_account: user.luogu_account,
    codeforces_account: user.codeforces_account,
    atcoder_account: user.atcoder_account,
    other_OJ_AC_problems: user.other_OJ_AC_problems
  }
}

app.get('/user/account/:id', async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    if (id) {
      let user = await User.findById(id);
      if (!user) throw new ErrorMessage('无此用户。');
      user = get_account_info(user);
      res.send(user);
    } else {
      let users = await User.find();
      users = users.map(get_account_info);
      res.send(users);
    }
  } catch (e) {
    syzoj.log(e);
    res.send({err: e});
  }
});

// Ranklist
app.get('/vj/log', async (req, res) => {
  try {
    let oj = syzoj.vj.Codeforces;
    let info = {
      Codeforces: oj.getLogInfo()
    }
    await syzoj.utils.markdown(info, ['Codeforces'])
    res.render('vj_logger_info', {
      info
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

function get_key(username) {
  return syzoj.utils.md5(username + "comp_xxx")
}

// type : [all, passed_in_contest, not_passed_in_contest]
app.get('/user/:id/problem_statistics/:type', async (req, res) => {
  try {
    let key = req.query.key

    if(!key) {
      if(!res.locals.user){throw new ErrorMessage('请登录后继续。',{'登录': syzoj.utils.makeUrl(['login'])});}
      if(!res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');
    }
    let id = parseInt(req.params.id)
    let user = await User.findById(id)
    if (!user) throw new ErrorMessage('无此用户。');
    let key2 = get_key(user.username)
    if(key && key2 !== key) throw new ErrorMessage('key 不正确。');
    else key = key2

    let type = req.params.type
    let entity = TypeORM.getManager()
    let data = []
    if(type === 'all') {
      let sql = `SELECT * FROM (SELECT problem_id,submit_time FROM judge_state WHERE user_id=${id} and status='Accepted' order by problem_id,submit_time asc) j group by j.problem_id`
      data = await entity.query(sql)
    } else if(type === 'passed_in_contest') {
      let sql = `SELECT * FROM (SELECT problem_id,submit_time FROM judge_state WHERE user_id=${id} and type=1 and status='Accepted' order by problem_id,submit_time asc) j group by j.problem_id`
      data = await entity.query(sql)
    } else if(type === 'not_passed_in_contest'){
      let submissions = await entity.query(`SELECT problem_id,type_info,status FROM judge_state WHERE user_id=${id} and type=1`)
      let passed_problem_set = new Set()
      let cid_set = new Set()
      submissions.forEach(s => {
        if(s.status === 'Accepted') passed_problem_set.add(s.problem_id)
        cid_set.add(s.type_info)
      })

      if(cid_set.size > 0) {
        let sql = `SELECT problems,end_time FROM contest WHERE id in (${Array.from(cid_set).join(',')})`
        let cps = await entity.query(sql)
        cps.forEach(x => {
          x.problems.split('|').forEach(p => {
            let pid = parseInt(p)
            if(!passed_problem_set.has(pid)) data.push({problem_id: pid, submit_time:  x.end_time})
          })
        })
      }
    } else {
      throw new ErrorMessage('类型错误。');
    }

    let info = await data.mapAsync(async x => {
      let pid = x['problem_id']
      let problem = await Problem.create()
      problem.id = pid
      return {
        problem_id: pid,
        submit_time: x['submit_time'],
        tags: await problem.getTags()
      }
    })

    let max_time = syzoj.utils.getCurrentDate()
    let min_time = max_time
    for(let item of info) {
      if(min_time > item.submit_time) min_time = item.submit_time
    }

    res.render('user_problem_statistics', {show_user:user, info, min_time, max_time, key, type})
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

