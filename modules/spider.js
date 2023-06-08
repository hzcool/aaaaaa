const https = require('https');
const User = syzoj.model('user');

function unique(arr) {
  return Array.from(new Set(arr));
}
function gethtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, function(res) {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve(html));
    });
  });
};
async function getjson(url) {
  let html = await gethtml(url);
  return JSON.parse(html);
};
async function getLuoguACProblems(uid) {
  if (!uid) return [];
  let res = await getjson(`https://www.luogu.com.cn/user/${uid}?_contentOnly`);
  if (!res.currentData.passedProblems) return [];
  return res.currentData.passedProblems.map(x => x.pid);
}
async function getCodeforcesACProblems(username) {
  if (!username) return [];
  let res = await getjson(`https://codeforc.es/api/user.status?handle=${username}&from=1&count=20000`);
  res = res.result.filter(x => x.verdict == 'OK');
  res = res.map(x => (x.problem.contestId < 100000 ? 'CF' : 'Gym') + x.problem.contestId + x.problem.index);
  res = unique(res);
  return res;
}
async function getAtcoderACProblems(username) {
  return [];
  // if (!username) return [];
  // let pids = [];
  // for (let st = 0;;) {
  //   console.log(st);
  //   let res = await getjson(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${username}&from_second=${st}`);
  //   if (!res.length) break;
  //   st = res[res.length - 1].epoch_second + 1;
  //   res = res.filter(x => x.result == 'AC');
  //   res = res.map(x => x.problem_id);
  //   pids += res;
  // }
  // pids = unique(pids);
}
async function getOtherOJACproblems(luogu_uids, cf_usernames, at_usernames) {
  let luogu_problems = luogu_uids.mapAsync(x => getLuoguACProblems(x));
  let codeforces_problems = cf_usernames.mapAsync(x => getCodeforcesACProblems(x));
  let atcoder_problems = at_usernames.mapAsync(x => getAtcoderACProblems(x));
  [luogu_problems, codeforces_problems, atcoder_problems] = await Promise.all([luogu_problems, codeforces_problems, atcoder_problems]);
  luogu_problems = [].concat(...luogu_problems);
  codeforces_problems = [].concat(...codeforces_problems);
  atcoder_problems = [].concat(...atcoder_problems);
  codeforces_problems.push(...luogu_problems.filter(x => x.startsWith('CF')));
  codeforces_problems = unique(codeforces_problems);
  atcoder_problems.push(...luogu_problems.filter(x => x.startsWith('AT_')).map(x => x.substring(3)));
  atcoder_problems = unique(atcoder_problems);
  luogu_problems = luogu_problems.filter(x => !x.startsWith('CF') && !x.startsWith('AT_'));
  luogu_problems.sort();
  codeforces_problems.sort();
  atcoder_problems.sort();
  return {luogu_problems, codeforces_problems, atcoder_problems};
}

app.post('/user/:id/update_problems', async (req, res) => {
  try {
    let id = parseInt(req.params.id);
    let user = await User.findById(id);
    if (!user) throw new ErrorMessage('无此用户。');
    let allowedEdit = await user.isAllowedEditBy(res.locals.user);
    if (!allowedEdit) throw new ErrorMessage('您没有权限进行此操作。');
    user.other_OJ_AC_problems = await getOtherOJACproblems(user.luogu_account.split(','), user.codeforces_account.split(','), user.atcoder_account.split(','));
    await user.save();
    res.send({success: true});
  } catch (e) {
    syzoj.log(e);
    res.send({success: false, err: e});
  }
});