const request = require('request');
const zlib = require('zlib');
const User = syzoj.model('user');

function unique(arr) {
  return Array.from(new Set(arr));
}
function gethtml(url) {
  return new Promise((resolve, reject) => {
    request({
      url,
      proxy: 'http://192.168.188.88:7890',
      headers: {
        'Accept-Encoding': 'gzip',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.41'
      },
      encoding: null
    }, (err1, res, body) => {
      if (err1) reject(err1);
      else if (res.headers['content-encoding'] && res.headers['content-encoding'] != 'gzip') reject('Unknown coding');
      else if (!res.headers['content-encoding']) resolve(body.toString());
      else zlib.unzip(body, (err2, buffer) => {
        if (err2) reject(err2);
        else resolve(buffer.toString());
      });
    });
  });
};
async function getjson(url) {
  console.log(url);
  let html = await gethtml(url);
  return JSON.parse(html);
};
async function getLuoguACProblems(uid) {
  try {
    if (!uid) return [];
    let res = await getjson(`https://www.luogu.com.cn/user/${uid}?_contentOnly`);
    if (res.code != 200) throw '请检查 UID！';
    if (!res.currentData.passedProblems) throw "请关闭完全隐私保护！更新后可重新开启。";
    return res.currentData.passedProblems.map(x => x.pid);
  } catch (e) {
    console.log(e);
    throw '洛谷更新失败！' + e.toString();
  }
}
async function getCodeforcesACProblems(username) {
  try {
    if (!username) return [];
    let res = await getjson(`https://codeforces.com/api/user.status?handle=${username}&from=1&count=20000`);
    if (res.status != 'OK') throw '请检查用户名！';
    res = res.result.filter(x => x.verdict == 'OK');
    res = res.map(x => (x.problem.contestId < 100000 ? 'CF' : 'Gym') + x.problem.contestId + x.problem.index);
    res = unique(res);
    return res;
  } catch (e) {
    console.log(e);
    throw 'Codeforces 更新失败！' + e.toString();
  }
}
async function getAtcoderACProblems(username) {
  try {
    if (!username) return [];
    let pids = [];
    for (let st = 0;;) {
      let res = await getjson(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${username}&from_second=${st}`);
      if (!res.length) break;
      st = res[res.length - 1].epoch_second + 1;
      res = res.filter(x => x.result == 'AC');
      res = res.map(x => x.problem_id);
      pids.push(...res);
    }
    pids = unique(pids);
    return pids;
  } catch (e) {
    console.log(e);
    throw 'AtCoder 更新失败！' + e.toString();
  }
}
async function getOtherOJACproblems(luogu_uids, cf_usernames, at_usernames) {
  let luogu_problems = luogu_uids.mapAsync(x => getLuoguACProblems(x));
  let codeforces_problems = cf_usernames.mapAsync(x => getCodeforcesACProblems(x));
  let atcoder_problems = at_usernames.mapAsync(x => getAtcoderACProblems(x));
  [luogu_problems, codeforces_problems, atcoder_problems] = await Promise.all([luogu_problems, codeforces_problems, atcoder_problems]);
  luogu_problems = unique([].concat(...luogu_problems));
  codeforces_problems = unique([].concat(...codeforces_problems));
  atcoder_problems = unique([].concat(...atcoder_problems));
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
    user.last_update_time = new Date();
    await user.save();
    res.send({success: true});
  } catch (e) {
    syzoj.log(e);
    res.send({success: false, err: e.toString()});
  }
});
