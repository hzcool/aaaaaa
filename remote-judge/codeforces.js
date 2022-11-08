const cheerio = require("cheerio")
const req = require("./request")
const basic = require("./basic")
const interfaces = require('../libs/judger_interfaces')
const Deque = require("./deque")

const TurndownService = require('turndown')
const {TaskStatus} = require("../libs/judger_interfaces");

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

class Handler {
    constructor(handleOrEmail="", password="") {
        this.req = new req.Request('https://codeforces.com/')
        this.xCsrfToken = ''
        this.handleOrEmail = handleOrEmail
        this.password = password
        this.deque = new Deque()
        // this.inPolling = false


        // 自动更新 xCsrfToken
        this.req.addRequestAfterFunc(res => {
            if (res.body && res.body !== '') {
                if(this.xCsrfToken !== '') return
                const $ = cheerio.load(res.body)
                let xCsrfToken = $('meta[name="X-Csrf-Token"]').prop('content')
                if (xCsrfToken && xCsrfToken !== '') this.xCsrfToken = xCsrfToken
            }
        })
    }

    async initXCsrfToken() {
        if (this.xCsrfToken !== '') return
        let opts = {
            url: "enter",
            method: 'GET',
        }
        await this.req.doRequest(opts)
    }

    async login() {
        await this.initXCsrfToken()
        let data = {
            handleOrEmail: this.handleOrEmail,
            password: this.password,
            action: 'enter',
            csrf_token: this.xCsrfToken,
            remember: "on"
        }
        let opts = {
            url: "enter",
            method: 'POST',
            form: data
        }
        await this.req.doRequest(opts)
    }

    async loginIfNotLogin() {
        if (!this.req.cookie.cookies.hasOwnProperty("X-User-Sha1") || this.xCsrfToken === '') await this.login()
    }

    // 获取 html 第一份代码的 id
    async getSubmissionID(contestId, isGym = false) {
        let opts = {
            url: (isGym ? 'gym/' : "contest/") + contestId + "/my",
        }
        const res = await this.req.doRequest(opts)
        const $ = cheerio.load(res.body)
        let submissionId = $('tr[data-submission-id]').prop("data-submission-id")
        if(submissionId === null || submissionId === undefined || submissionId === "") throw "获取失败 submission id fail"
        return submissionId
    }


    async getGymSubmissionUsage(gymId ,submissionId) {
        let opts = {
            url: 'gym/' + gymId + '/submission/' + submissionId,
        }
        const res = await this.req.doRequest(opts)
        const $ = cheerio.load(res.body)
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
        let opts = {
            url: 'gym/' + gymId,
            method: 'GET'
        }
        const res = await this.req.doRequest(opts)
        const $ = cheerio.load(res.body)
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
        let opts = {
            url: 'data/submitSource',
            method: 'POST',
            form: {
                submissionId,
                csrf_token: this.xCsrfToken,
            }
        }
        const res = await this.req.doRequest(opts)
        const result = JSON.parse(res.body)
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
    async polling() {
        while (true) {
            let item = undefined
            while (item = this.deque.shift()) {
                const {source, problemID, langId, callback, isGym} = item
                try {
                    await this.loginIfNotLogin()
                    const {contestId, submittedProblemIndex} =  parseProblemId(problemID)
                    let opts = {
                        url: (isGym ? 'gym/' : "contest/") + contestId + "/submit?csrf_token=" + this.xCsrfToken,
                        method: "POST",
                        form: {
                            csrf_token: this.xCsrfToken,
                            action: "submitSolutionFormSubmitted",
                            tabSize: 4,
                            source: source,
                            contestId,
                            submittedProblemIndex, //E2
                            programTypeId: langId, //C++20
                        }
                    }
                    const res = await this.req.doRequest(opts)
                    if (res.statusCode !== 302) {
                        await this.login()
                        throw '提交失败'
                    }
                    const submissionId = await this.getSubmissionID(contestId, isGym)
                    callback(null, submissionId, {account: this.handleOrEmail, submissionId})
                } catch (e) {
                    callback("执行失败", 0, {account: this.handleOrEmail})
                }
            }
            await basic.sleep(Math.floor(Math.random() * 5) * 1000 + 2000)
        }

        // this.inPolling = false
    }

    async submitCode(source, problemID, langId, callback, isGym = false){ //cb => function(err, submissionId)
        this.deque.push({source, problemID, langId, callback, isGym})
        // if(!this.inPolling) {
        //     this.inPolling = true
        //     this.polling()
        // }
    }

    async getProblem(problemId, isGym = false) {
        const {contestId, submittedProblemIndex} = parseProblemId(problemId)
        if(contestId === '') return null
        let opts = {
            url: (isGym ? 'gym/' : "contest/") + contestId + "/problem/" +  submittedProblemIndex,
        }
        const res = await this.req.doRequest(opts)
        const $ = cheerio.load(res.body)

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
        this.base = new Handler()
        this.handlers = basic.VjBasic.Codeforces.accounts.map(account => new Handler(account.handleOrEmail, account.password))
        this.handlers.forEach(h => h.polling())
        this.select = -1
    }
    async getProblem(problemId) {
        return await this.base.getProblem(problemId)
    }
    async getSubmissionStatus(submissionId) {
        return await this.base.getSubmissionStatus(submissionId)
    }
    async submitCode(source, problemID, langId, callback) {
        if((++this.select) >= this.handlers.length) this.select = 0
        this.handlers[this.select].submitCode(source, problemID, langId, callback)
    }
}

module.exports = {
    Codeforces: new Codeforces(),
    statementProcess,
    examplesProcess,
    parseProblemId
}

// const test = async() => {
//     // let account = basic.VjBasic.Codeforces.accounts[0]
//     // let cf  =  new Codeforces()
//     // // await cf.login()
//     // console.log(await cf.getSubmissionStatus('180031773'))
//
// }
//
// test()