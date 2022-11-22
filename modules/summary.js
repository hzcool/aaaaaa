
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


app.get('/summary', async (req, res) => {
    try {
        let user = null
        if (req.query.user_id) {
            user = await User.findById(parseInt(req.query.user_id))
            if (!user) throw new ErrorMessage('无此用户。');
        } else if(req.query.username) {
            user = await User.fromName(req.query.username)
            if (!user) throw new ErrorMessage('无此用户。');
        }

        const local_user = res.locals.user
        if (!local_user || (!local_user.is_admin && (!user || local_user.id !== user.id ))) throw new ErrorMessage('您没有权限进行此操作。');

        let query = ContestPlayer.createQueryBuilder()
        let users = []
        if (user) {
            query.where("user_id = :user_id", { user_id: user.id })
            users.push(user)
        }
        let contests = []
        if(req.query.contest_id) {
            let c = await Contest.findById(parseInt(req.query.contest_id))
            if(c && c.isRunning()) {
                throw new ErrorMessage('比赛还未结束。');
            }
            query.andWhere("contest_id = " +  req.query.contest_id)
            if(c) contests.push(c);
        } else if(req.query.title) {
            contests = (await Contest.getKeywordContests(req.query.title)).filter(c => !c.isRunning())
            if(contests.length > 0) {
                query.andWhere("contest_id in (" + contests.map(item => item.id).join(",") +")")
            } else {
                query.andWhere("contest_id = 0")
            }
        }

        let paginate = syzoj.utils.paginate(await ContestPlayer.countForPagination(query), req.query.page, 10);
        query.orderBy('contest_id', 'DESC')
        let players = await ContestPlayer.queryPage(paginate, query)
        if(users.length === 0 && players.length > 0) {
            let sqlBuilder = User.createQueryBuilder().where("id in (" + players.map(item => "\'" + item.user_id + "\'").join(",") + ")")
            users = await User.queryAll(sqlBuilder)
        }
        if(contests.length === 0 && players.length > 0) {
            contests = await Contest.queryAll(Contest.createQueryBuilder().where("id in (" + players.map(item => item.contest_id).join(",") + ")"))
        }
        let user_map = syzoj.utils.makeRecordsMap(users)
        let contest_map = syzoj.utils.makeRecordsMap(contests)

        let summaries = []
        for(let player of players) {
            let contest =  contest_map[player.contest_id]
            if(!contest || contest.isRunning()) continue
            let s = await ContestSummary.getSummary(user_map[player.user_id], contest, player)
            let contest_summary = s.contest_summary
            if(contest_summary) await syzoj.utils.markdown(contest_summary, ['summary'])
            for(let detail of Object.values(s.details)) {
                let problem_summary = detail.problem_summary
                if(problem_summary) await syzoj.utils.markdown(problem_summary, ['summary'])
            }
            summaries.push(s)
        }

        summaries.sort((a, b) => {
            return b.contest.start_time - a.contest.start_time
        })

        res.render("user_summary", {
            summaries,
            paginate,
            is_admin: local_user.is_admin,
        })
    } catch (e) {
        res.render('error', {
            err: e
        });
    }
});


app.get('/summary/edit',  async (req, res) => {
    try {
        const user = await User.fromName(req.query.username)
        if (!user) throw new ErrorMessage('无此用户。');
        const local_user = res.locals.user
        if (!local_user || (!local_user.is_admin && local_user.id !== user.id)) throw new ErrorMessage('您没有权限进行此操作。');

        let contest_id = parseInt(req.query.contest_id)
        let contest = await Contest.findById(contest_id)
        if(!contest) throw new ErrorMessage('没有这场比赛。');
        if(contest.isRunning()) throw new ErrorMessage('比赛未结束, 还不能写总结。');
        const summary = await ContestSummary.getSummary(user, contest)
        res.render("user_summary_edit", {
            contest,
            summary,
            user
        })
    } catch (e) {
        res.render('error', {
            err: e
        });  }
})


app.post('/summary/update/user/:user_id/contest/:contest_id', async (req, res) => {
    try {
        let user_id = parseInt(req.params.user_id)
        let user = await User.findById(user_id)

        if (!user) throw new ErrorMessage('无此用户。');
        const local_user = res.locals.user
        if (!local_user || (!local_user.is_admin && local_user.id !== user_id)) throw new ErrorMessage('您没有权限进行此操作。');

        let contest_id = parseInt(req.params.contest_id)
        let contest = await Contest.findById(contest_id)
        if(!contest) throw new ErrorMessage('没有这场比赛。');
        if(contest.isRunning()) throw new ErrorMessage('比赛未结束, 还不能写总结。');

        let player = await ContestPlayer.findInContest({
            user_id: user.id, contest_id
        })
        if(!player)  throw new ErrorMessage('没有选手参数记录。');
        let data = JSON.parse(req.body.data)

        let details = player.score_details
        let cs = await ContestSummary.get(user.username, contest_id)
        if(!cs) {
            cs = await ContestSummary.create({
                username: user.username,
                contest_id,
                summary: data.contest_summary,
                post_time: syzoj.utils.getCurrentDate()
            })
        } else {
            cs.summary = data.contest_summary
        }
        await cs.save()

        for(let item of data.problem_summaries) {
            let problem_id = item.problem_id
            let s = await ProblemSummary.findOne(
                {where: {username: user.username , contest_id, problem_id}}
            )
            if(!s) {
                s = await ProblemSummary.create({
                    username: user.username,
                    problem_id,
                    contest_id,
                    time: item.time,
                    score: (details && details[problem_id]) ? details[problem_id].score : 0,
                    summary: item.summary,
                    public: false,
                    post_time: syzoj.utils.getCurrentDate()
                })
            } else {
                s.time = item.time
                s.summary = item.summary
            }
            await s.save()
        }
        res.redirect(syzoj.utils.makeUrl(['summary'], {username: user.username, contest_id}));
    } catch (e) {
        res.render('error', {
            err: e
        });
    }
})