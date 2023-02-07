let ProblemTag = syzoj.model('problem_tag');
let Problem = syzoj.model('problem');


app.get('/problems/tag/:id/edit', async (req, res) => {
  try {
    if (!res.locals.user || !await res.locals.user.hasPrivilege('manage_problem_tag')) throw new ErrorMessage('您没有权限进行此操作。');

    let id = parseInt(req.params.id) || 0;
    let tag = await ProblemTag.findById(id);

    if (!tag) {
      tag = await ProblemTag.create();
      tag.id = id;
    }

    res.render('problem_tag_edit', {
      tag: tag
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.post('/problems/tag/:id/edit', async (req, res) => {
  try {
    if (!res.locals.user || !await res.locals.user.hasPrivilege('manage_problem_tag')) throw new ErrorMessage('您没有权限进行此操作。');

    let id = parseInt(req.params.id) || 0;
    let tag = await ProblemTag.findById(id);

    if (!tag) {
      tag = await ProblemTag.create();
      tag.id = id;
    }

    req.body.name = req.body.name.trim();
    if (tag.name !== req.body.name) {
      if (await ProblemTag.findOne({ where: { name: req.body.name } })) {
        throw new ErrorMessage('标签名称已被使用。');
      }
    }

    tag.name = req.body.name;
    tag.color = req.body.color;

    await tag.save();

    res.redirect(syzoj.utils.makeUrl(['problems', 'tag', tag.id]));
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});



app.get('/problem/:id/tag/update', async (req, res) => {
  try {
    if (!res.locals.user || (!res.locals.user.is_admin && !syzoj.config.allow_tag_edit)) throw new ErrorMessage('您没有权限进行此操作。');
    let problem = await Problem.findById(parseInt(req.params.id))
    if(!problem) throw new ErrorMessage('找不到题目。');
    if(!res.locals.user.is_admin) {
      let state = await problem.getJudgeState(res.locals.user, true, true)
      if (!state) throw new ErrorMessage('您没有权限进行此操作。');
    }
    let tags = await problem.getTags()
    res.render('problem_tag_update', {
      problem,
      tags
    });
  } catch (e) {
    syzoj.log(e);
    res.render('error', {
      err: e
    });
  }
});

app.post('/problem/:id/tag/update', async (req, res) => {
  try {
    if (!res.locals.user || (!res.locals.user.is_admin && !syzoj.config.allow_tag_edit)) throw new ErrorMessage('您没有权限进行此操作。');
    let problem = await Problem.findById(parseInt(req.params.id))
    if(!problem) throw new ErrorMessage('找不到题目。');
    if(!res.locals.user.is_admin) {
      let state = await problem.getJudgeState(res.locals.user, true, true)
      if (!state) throw new ErrorMessage('您没有权限进行此操作。');
    }
    await problem.setTags(req.body.tags)
    res.send({})

  } catch (e) {
    res.send({err: e})
  }
});