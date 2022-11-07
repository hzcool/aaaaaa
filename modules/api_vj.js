let Problem = syzoj.model('problem');

app.get('/api/vj/oj/:name/problem/:id', async (req, res) => {
    try {
        res.setHeader('Content-Type', 'application/json');

        const oj = syzoj.vj[req.params.name]

        if(oj == null) {
            throw "OJ : " + req.params.name + " 没有找到"
        }
        const problem = await oj.getProblem(req.params.id)
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

