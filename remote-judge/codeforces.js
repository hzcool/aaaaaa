const cheerio = require("cheerio")

const req = require("./request")
const basic = require("./basic")
const interfaces = require('../libs/judger_interfaces')

const TurndownService = require('turndown')
const {TaskStatus} = require("../libs/judger_interfaces");
const Dequeue = require("./deque")

const findChrome = require("chrome-finder")
const puppeteer = require('puppeteer-core');
const {sleep} = require("./basic");
const child_process = require("child_process");


const turndownService = new TurndownService()

const statementProcess = (statementHtml) => {
    let s = turndownService.turndown(statementHtml)
    s =  s.replaceAll("$$$", "$")
    let ret = ""
    let isLetter = /[A-Za-z]/
    for(let i = 0; i < s.length; i++) {
        if(s[i] !== '\\' || isLetter.test(s[i + 1])) ret += s[i]
    }
    return ret
}
const examplesProcess = (mainContent, type) => {
    const examples = []
    const selector =  'div[class="' + type + '"] pre'
    mainContent(selector).each((i, ele) => {
        const x = cheerio.load(ele)
        let str = ''
        x('div').each((_, y) => {
            if(str !== '') str += '\n'
            str += x(y).text()
        })
        if (str === '') {
            let c = x.html()
            if(c.indexOf('<br>') !== -1) {
                let t = c.substring(c.indexOf('<pre>') + 5, c.lastIndexOf('</pre>'))
                str = t.split('<br>').join('\n')
            } else str = x.text()
        }
        examples.push(str)
    })
    return examples
}

const parseProblemId = problemId => { // 1200A => cotestID:1200 submittedProblemIndex: A
    let ret = {
        contestId: '',
        submittedProblemIndex: '',
    }
    let pos = 0
    while (pos < problemId.length) {
        if(/[A-Z]/.test(problemId[pos])) break
        pos++
    }
    if(pos < problemId.length) {
        ret.contestId = problemId.substring(0, pos)
        ret.submittedProblemIndex = problemId.substring(pos)
    }
    return ret
}

const cfStatusMapSyzOjStatus = {
    'Accepted': 'Accepted',
    'Happy': 'Accepted',
    'Wrong answer': 'Wrong Answer',
    'Runtime error': 'Runtime Error',
    'Time limit exceeded': 'Time Limit Exceeded',
    'Memory limit exceeded': 'Memory Limit Exceeded',
    'Compilation error': 'Compile Error',
    'Running': 'Running',
    'queue': 'Waiting',
    'Pending': 'Waiting',
}

const inJudging= status => {
    return status.indexOf("Running") !== -1 || status.indexOf("Pending") !== -1 || status.indexOf("queue") !== -1
}

const changeToSyzOjStatus = (status) => {
    for(let key in cfStatusMapSyzOjStatus) {
        if(status.indexOf(key) === -1) continue
        return cfStatusMapSyzOjStatus[key]
    }
    return 'Runtime Error'
}
const tta = (_39ce7) => {
    let _tta = 0;
    for (let c = 0; c < _39ce7.length; c++) {
        _tta = (_tta + (c + 1) * (c + 2) * _39ce7.charCodeAt(c)) % 1009;
        if (c % 3 === 0) _tta++;
        if (c % 2 === 0) _tta *= 2;
        if (c > 0) _tta -= Math.floor(_39ce7.charCodeAt(Math.floor(c / 2)) / 2) * (_tta % 5);
        _tta = ((_tta % 1009) + 1009) % 1009;
    }
    return _tta;
}

class Handler {
    constructor(handleOrEmail="", password="") {
        this.req = new req.Request('https://codeforces.com/')
        this.xCsrfToken = ''
        this.account = handleOrEmail
        this.password = password
        this.running_mp = new Map()
        this.waiting_mp = new Map()
        this.puppeteer = null
        // if(handleOrEmail !== '') this.puppeteerLogin()
        // this.ensureLogin()

        // 自动更新 xCsrfToken
        // this.req.addRequestAfterFunc(res => {
        //     if (res.data && res.data !== '' && typeof(res.data)=='string') {
        //         if(this.xCsrfToken !== '') return
        //         const $ = cheerio.load(res.data)
        //         let xCsrfToken = $('meta[name="X-Csrf-Token"]').prop('content')
        //         console.log(xCsrfToken)
        //         if (xCsrfToken && xCsrfToken !== '') this.xCsrfToken = xCsrfToken
        //     }
        // })
    }



    async ensureBrowser() {
        if (this.puppeteer) return true;
        try {
            const executablePath = findChrome();
            if(!executablePath || executablePath === '') throw "未找到chrome 路径"
            this.puppeteer = await puppeteer.launch({
                headless: true,
                executablePath,
                timeout: 15000,
                args: [            //启动 Chrome 的参数，详见上文中的介绍
                    '–no-sandbox',
                    '–disable-gpu',
                    '–disable-dev-shm-usage',
                    '–disable-setuid-sandbox',
                    '–no-first-run',
                    '–no-zygote'
                ],
            })
        }catch (e) {
            console.log(`打开浏览器失败, ${e}`)
            return false
        }
        return true
    }


    async getPage() {
        const page = await this.puppeteer.newPage();
        let cookies = this.req.cookie.cookies
        for (const name in cookies) {
            const value = cookies[name]
            await page.setCookie({ name, value, domain: 'codeforces.com' });
        }
        return page;
    }

    async clearPage(page) {
        let cookies = await page.cookies();
        while (!cookies.find((i) => i.name === 'evercookie_etag').value) {
            await sleep(1000);
            cookies = await page.cookies();
        }
        cookies.forEach((i) => this.req.cookie.set_cookie_item(i.name, i.value));
        await page.close();
    }


    async getCsrfToken(url = "enter") {
        const { text } = await this.req.super_agent_request({url});
        const $ = cheerio.load(text)
        let xCsrfToken = $('meta[name="X-Csrf-Token"]').prop('content')
        if (!xCsrfToken) throw "no X-Csrf-Token"
        return xCsrfToken
        // const ftaa = this.req.cookie.get_cookie_value('70a7c28f3de')
        // const bfaa = /_bfaa = "(.{32})"/.exec(text)?.[1] || this.req.cookie.get_cookie_value('raa') || this.req.cookie.get_cookie_value('bfaa');
        // return [xCsrfToken, ftaa, bfaa];
    }

    async isLoggedIn() {
        try {
            let {text} = await this.req.super_agent_request({url: "enter"})
            const $ = cheerio.load(text)
            this.xCsrfToken = $('meta[name="X-Csrf-Token"]').prop('content')
            if (text.includes("Login into Codeforces")) return false;
            if(text.length < 1000 && data.includes('Redirecting...')) return false;
            return true
        } catch (e) {
            return false
        }
    }

    async puppeteerLogin() {
        try {
            await this.ensureBrowser();
            if (!this.puppeteer) return false;
            const page = await this.puppeteer.newPage();
            await page.goto(this.req.baseURL + 'enter', { waitUntil: 'networkidle2' });
            const html = await page.content();
            if (html.includes("Login into Codeforces")) {
                await page.type('#handleOrEmail', this.account);
                await page.type('#password', this.password);
                await page.click("#remember")
                await page.click("input[type=submit]")
                await page.waitForNavigation({waitUntil:"domcontentloaded"})
            }
            await this.clearPage(page);
            console.log(`${this.account} 登录 CodeForces 成功`)
            return true;
        } catch (e) {
            try {this.puppeteer.close();this.puppeteer = null} catch (e) {
                console.log(`关闭失败 : ${e}`)
            }
            return false
        }
    }

    async normalLogin() {
        try {
            let __resp = await new Promise((resolve, reject) => {
                child_process.exec(`./bin/codeforces_helper codeforcesLogin ${this.account} ${this.password}`, function(error, stdout, stderr) {
                    if(error) reject(error)
                    else if(stderr) reject(stderr)
                    else resolve(stdout)
                })
            })
            let resp = JSON.parse(__resp)
            if(!resp.status || resp.status !== 302) {
                return false
            }
            this.req.doRequestAfterList.forEach(func => func(resp))
            return true
        } catch (e) {
            console.log(e)
            return false
        }
    }



    async ensureLogin() {
        try {
            if(await this.isLoggedIn()) return true
            if(!await this.normalLogin()) return false
            return await this.isLoggedIn()
        } catch (e) {
            return false
        }
    }

    async getGymSubmissionUsage(gymId ,submissionId) {
        let opts = { url: 'gym/' + gymId + '/submission/' + submissionId}
        const {text} = await this.req.super_agent_request(opts)
        const $ = cheerio.load(text)
        const tr = cheerio.load($('div[class="datatable"] table tr').get(1))
        // const verdict = tr(tr('td').get(4)).text().trim()
        const time = tr(tr('td').get(5)).text().trim().split(' ')[0]
        const memory = tr(tr('td').get(6)).text().trim().split(' ')[0]
        return {
            time: parseInt(time), // second
            memory: parseInt(memory), //MB
        }
    }


    async getGymProblemSetInfo(gymId) {
        const {text} = await this.req.super_agent_request({url: 'gym/' + gymId})
        const $ = cheerio.load(text)
        const ret = []
        $($('table[class="problems"] tr')).each((i, item) => {
            if(i === 0) return
            const tr = cheerio.load($(item).html())
            const label = tr(tr('a').get(0)).text().trim()
            const title = tr(tr('a').get(1)).text().trim()
            const arr = tr('div[class="notice"]').text().match(/\d+\.?\d*/g)
            const time_limit = Number(arr[0]) * 1000
            const memory_limit = Number(arr[1])   //MB
            ret.push({label, title, time_limit, memory_limit})
        })
        return ret
    }

    async getSubmissionStatus(submissionId, isGym = false) {
        await this.ensureLogin()
        let opts = {
            url: 'data/submitSource',
            method: 'POST',
            data: {
                submissionId,
                csrf_token: this.xCsrfToken,
            }
        }
        const {text} = await this.req.super_agent_request(opts)
        const result = JSON.parse(text)
        const verdict = cheerio.load(result['verdict']).text().trim()
        if(!verdict || verdict === '') throw "获取submission status 失败"
        const is_over = !inJudging(verdict)
        let ret = {
            status: changeToSyzOjStatus(verdict),
            info: verdict,
            is_over,
            type: 'remote',
            score: verdict === 'Accepted' ? 100 : 0
        }
        if (is_over) {
            if (ret.status === 'Compile Error') {
                ret.compile = {
                    message: result['checkerStdoutAndStderr#1']
                }
            } else if(!isGym){
                let testCount = parseInt(result['testCount'])
                let time = 0, memory = 0
                let cases = new Array(testCount)
                for (let i = 1; i <= testCount; ++i) {
                    let _memory = Math.floor(parseInt(result['memoryConsumed#' + i]) / 1024) //KB
                    let _time = Math.max(time, parseInt(result['timeConsumed#' + i]))
                    memory = Math.max(memory, _memory)
                    time = Math.max(time, _time)
                    cases[i - 1] = {
                        status: TaskStatus.Done,
                        result: {
                            type: (i < testCount) ? interfaces.TestcaseResultType.Accepted : interfaces.TestcaseResultType[ret.status.replaceAll(' ', '')],
                            scoringRate: (i < testCount) ? 1 : (ret.score / 100),
                            memory: _memory,
                            time: _time,
                            input: {
                                name: '---',
                                content: result['input#' + i],
                            },
                            output: {
                                name: '---',
                                content: result['answer#' + i],
                            },
                            userOutput: result['output#' + i],
                            spjMessage: result['checkerStdoutAndStderr#' + i],
                        }
                    }
                }
                ret.judge = { subtasks: [{score: ret.score, cases}]}
                ret.time = time
                ret.memory = memory
            }
        }
        return ret
    }

    async handleSubmit(source, problemID, langId, callback, isGym) {
        source += "//" + Math.random().toString()
        try {
            if (!(await this.ensureLogin())) throw "无法登录"
            const {contestId, submittedProblemIndex} =  parseProblemId(problemID)
            let url = (isGym ? 'gym/' : "contest/") + contestId + '/submit'
            let opts = {
                url: url + `?csrf_token=${this.xCsrfToken}`,
                method: "POST",
                data: {
                    csrf_token: this.xCsrfToken,
                    action: "submitSolutionFormSubmitted",
                    tabSize: 4,
                    source,
                    sourceFile: "",
                    contestId,
                    submittedProblemIndex, //E2
                    programTypeId: langId, //C++20
                }
            }
            const res = await this.req.super_agent_request(opts)
            if(res.status === 200 && res.redirects && res.redirects.length > 0 && res.redirects[0].endsWith('/my') ) {
                const $ = cheerio.load(res.text)
                let submissionId = $('tr[data-submission-id]').prop("data-submission-id")
                if (!submissionId || submissionId === '') throw "获取submissionID失败"
                callback.onSuccess(submissionId, {account: this.account, submissionId})
            } else throw "提交失败"
        } catch (e) {
            callback.onFail(e, {account: this.account})
        } finally{
            this.running_mp.delete(problemID)
        }
    }

    async submitCode(source, problemID, langId, callback, isGym = false){ //cb => function(err, submissionId)
        this.waiting_mp.set(problemID, (this.waiting_mp.get(problemID) || 0) + 1)
        let item = undefined
        while (item = this.running_mp.get(problemID)) {
            let now = new Date().getTime()
            if ((now - item) >= 30000) this.running_mp.delete(problemID)
            await basic.sleep(3000 + Math.floor(Math.random() * 5000));
        }

        let x = this.waiting_mp.get(problemID) - 1
        if(x <= 0.1) this.waiting_mp.delete(problemID); else this.waiting_mp.set(problemID, x)
        this.running_mp.set(problemID, new Date().getTime())
        await this.handleSubmit(source, problemID, langId, callback, isGym)
    }

    getProblemLink(problemId, isGym = false) {
        const {contestId, submittedProblemIndex} = parseProblemId(problemId)
        return this.req.baseURL + ( (isGym ? 'gym/' : "contest/") + contestId + "/problem/" +  submittedProblemIndex )
    }

    async getProblem(problemId, isGym = false) {
        const {contestId, submittedProblemIndex} = parseProblemId(problemId)
        if(contestId === '') return null
        let opts = {
            url: (isGym ? 'gym/' : "contest/") + contestId + "/problem/" +  submittedProblemIndex,
        }
        const {text} = await this.req.super_agent_request(opts)
        const $ = cheerio.load(text)
        try {
            const maincontent = cheerio.load($('div[class="problem-statement"]').html())
            const title = maincontent('div[class="title"]').eq(0).html().split(". ")[1]
            const time_limit = Number(maincontent('div[class="time-limit"]').text().match(/\d+(.\d+)?/g)[0]) * 1000
            const memory_limit = Number(maincontent('div[class="memory-limit"]').text().match(/\d+(.\d+)?/g)[0])
            const description = statementProcess(maincontent('div').eq(10).html())

            const __input = maincontent('div[class="input-specification"]').html()
            const input_format = __input == null ? "" : statementProcess(__input.substring(__input.indexOf("<p>")))


            const __output = maincontent('div[class="output-specification"]').html()
            const output_format = __output == null ? "" : statementProcess(__output.substring(__output.indexOf("<p>")))


            const __note = maincontent('div[class="note"]').html()
            const limit_and_hint = __note == null ? "" : statementProcess(__note.substring(__note.indexOf("<p>")))


            const examplesInput = examplesProcess(maincontent, "input")
            const examplesOutput = examplesProcess(maincontent, "output")

            return {
                title,
                time_limit,
                memory_limit,
                description,
                input_format,
                output_format,
                limit_and_hint,
                example: basic.changeExampleArrToMarkDown(examplesInput, examplesOutput)
            }

        } catch (e) {
            if(!isGym) throw "题目不存在"
            try {
                const link  = $('div[class="datatable"] table td a').prop('href')
                if(link && link !== '') {
                    return {
                        title: '',
                        time_limit: 1000,
                        memory_limit: 128,
                        description: '题目文件: [problemset.pdf](' + this.req.baseURL + link + ')',
                        input_format: '',
                        output_format: '',
                        limit_and_hint: '',
                        example: ''
                    }
                } else throw ""
            } catch (e) {
                throw "题目不存在"
            }
        }
    }
}


class Codeforces {
    constructor() {
        this.handlers = basic.VjBasic.Codeforces.accounts.map(account => new Handler(account.handleOrEmail, account.password))
        this.select = -1
        this.base = this.handlers[0]
    }
    async getProblem(problemId) {
        return await this.base.getProblem(problemId)
    }
    async getSubmissionStatus(submissionId) {
        return await this.base.getSubmissionStatus(submissionId)
    }
    async submitCode(source, problemID, langId, callback) {
        if((++this.select) >= this.handlers.length) this.select = 0
        await this.handlers[this.select].submitCode(source, problemID, langId, callback)
    }
    getProblemLink(problemId) {
        return this.base.getProblemLink(problemId)
    }
    getLogInfo() {
        return basic.getJudgeInfo(this.handlers)
    }
}

module.exports = {
    Codeforces: new Codeforces(),
    statementProcess,
    examplesProcess,
    parseProblemId
}

// async function test() {
//     let h = new Handler( "AmurAdonisHerb", "nfls_002")
//     // console.log(await h.getProblem("1746C"))
//     const fs = require("fs-extra")
//     let source =  (await fs.readFile("./uploads/tmp/main.cpp")).toString()
//     // console.log(source)
//
//     const callback = {
//         onFail: (e, x) => {
//             console.log(`err:${e}, res:${x}`)
//         },
//         onSuccess: (id, x) => {
//             console.log(`sid:${id}, res:${x}`)
//         }
//     }
//
//     h.submitCode(source, "1746C", "54", callback )
//
//
//     // console.log(h.req.cookie.get_cookie_str())
// }
//
// test()