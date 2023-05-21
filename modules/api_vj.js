let Problem = syzoj.model('problem');

app.get('/api/vj/oj/:name/problem/:id', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');

        // const oj = syzoj.vj[req.params.name]

        if(!syzoj.vjs[req.params.name]) {
            throw "OJ : " + req.params.name + " 没有找到"
        }
        // const problem = await oj.getProblem(req.params.id)
        const problem = await syzoj.provider.get_problem(req.params.name.toLowerCase(), req.params.id)
        if(problem == null) {
            throw "未找到该题: " + req.params.id
        }
        let source = req.params.name + "-" + req.params.id
        let _problem = await Problem.findOne(
            {where: {source}}
        )
        if(_problem && _problem.id) {
            problem.tip = "存在题号\"" + _problem.id + "\"与当前来源相同"
        }

        res.send(problem)
    } catch (e) {
        console.log(e)
        res.send({ error: e });
    }
});

app.get('/api/vj/flush/time_memroy/:id', async (req, res) => {
    try {
        if (!res.locals.user || !res.locals.user.is_admin) throw '您没有权限进行此操作。';
        let problem = await Problem.findById(parseInt(req.params.id))
        if(!problem) throw '题目不存在';
        if(problem.type !== syzoj.ProblemType.Remote) throw '题目不是远程测评，无法刷新时限。';
        const info = syzoj.vjBasics.parseSource(problem.source)

        if(!syzoj.vjs[info.vjName]) {
            throw '找不到远程测评服务。'
        }
        // const oj = syzoj.vj[info.vjName]
        // if(!oj) throw '找不到远程测评服务。';
        // const p = await oj.getProblem(info.problemId)
        const p = await syzoj.provider.get_problem(info.vjName.toLowerCase(), info.problemId)

        problem.time_limit = p.time_limit
        problem.memory_limit = p.memory_limit
        await problem.save();
        res.send({ time_limit: p.time_limit,  memory_limit: p.memory_limit})
    } catch (e) {
        res.send({ error: e });
    }
});


app.get('/luogu/problems', async (req, res) => {
    try {
        if(!res.locals.user || !res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');
        let helper = syzoj.newLuoguHelper()
        let x = helper.findByTags()
        res.render('luogu_problems', {
            tags: helper.tags.tags,
            types: helper.tags.types,
            total: x.total,
            problems: x.problems
        })
    } catch (e) {
        res.render('error', {
            err: e
        });
    }
});



app.post('/luogu/problems/search', async (req, res) => {
    try {
        if(!res.locals.user || !res.locals.user.is_admin) throw new ErrorMessage('您没有权限进行此操作。');
        let helper = syzoj.newLuoguHelper()
        let tags =  req.body.tags ? req.body.tags.map(x => parseInt(x)) : []
        let orderBy = parseInt(req.body.orderBy)
        let asc = (!req.body.asc || req.body.asc === 'true') ? true : false
        let page = parseInt(req.body.page || '1')
        let x = helper.findByTags(tags, orderBy, asc, page)
        res.send({
            total: x.total,
            problems: x.problems
        })
    } catch (e) {
        res.send( {
            err: e
        });
    }
});