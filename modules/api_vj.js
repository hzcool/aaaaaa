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
        res.send(problem)
    } catch (e) {
        res.send({ error: e });
    }
});

