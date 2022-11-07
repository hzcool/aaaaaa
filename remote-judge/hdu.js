
const req = require("./request")
const basic = require("./basic")
const cheerio = require("cheerio");
const TurndownService = require('turndown')
const turndownService = new TurndownService()
const Deque = require("./deque")
const iconv = require('iconv-lite')

const hduStatementProcess = (statementHtml) => {
    let s = turndownService.turndown(statementHtml)
    let ret = ""
    let isLetter = /[A-Za-z]/
    for(let i = 0; i < s.length; i++) {
        if(s[i] !== '\\' || isLetter.test(s[i + 1])) ret += s[i]
    }
    ret = ret.replace(/\!\[\]\((\.\..*)\)/g, "![](http://acm.hdu.edu.cn/$1)")
    return ret
}

const hduStatusMapSyzOjStatus = {
    'Accepted': 'Accepted',
    'Wrong Answer': 'Wrong Answer',
    'Runtime Error': 'Runtime Error',
    'Time Limit Exceeded': 'Time Limit Exceeded',
    'Memory Limit Exceeded': 'Memory Limit Exceeded',
    'Presentation Error': 'Wrong Answer',
    'Output Limit Exceeded': 'Output Limit Exceeded',
    'Compilation Error': 'Compile Error',
    'Running': 'Running',
    'Queuing': 'Waiting',
    'Pending': 'Running',
    'Compiling': 'Running',
}

const inJudging= status => {
    return status.indexOf("Running") !== -1 || status.indexOf("Que") !== -1 || status.indexOf("Pending") !== -1
}
const changeToSyzOjStatus = (status) => {
    for(let key in hduStatusMapSyzOjStatus) {
        if(status.indexOf(key) === -1) continue
        return hduStatusMapSyzOjStatus[key]
    }
    return 'Runtime Error'
}


class HduHandler {
    constructor(username="", userpass="") {
        this.username = username
        this.userpass = userpass
        this.req = new req.Request('http://acm.hdu.edu.cn/')
        this.deque = new Deque()
        this.inPolling = false

        this.req.addRequestBeforeFunc((opts) => opts.encoding = null)
        this.req.addRequestAfterFunc(res => {
            if(res.body)  res.body = iconv.decode(res.body, 'gb2312')
        })
    }
    async initCookie() {
        if(Object.keys(this.req.cookie.cookies).length === 0) {
            await this.req.doRequest({})
        }

    }
    async login() {
        await this.initCookie()
        let data = {
            username: this.username,
            userpass: this.userpass,
            login: 'Sign In'
        }
        let opts = {
            url: 'userloginex.php?action=login',
            method: 'POST',
            form: data
        }
        let res = await this.req.doRequest(opts)
        if(res.statusCode !== 302) throw '登录失败'
    }

    async loginIfNotLogin() {
        if (!this.req.cookie.cookies.hasOwnProperty("PHPSESSID")) await this.login()
    }

    async getProblem(problemId) {
        const res = await this.req.doRequest({url: 'showproblem.php?pid=' + problemId})
        const $ = cheerio.load(res.body)
        try {
            let result = {
                title: '',
                time_limit: '',
                memory_limit: '',
                description: '',
                input_format: '',
                output_format: '',
                limit_and_hint: '',
                example: ''
            }
            let examplesInput = []
            let examplesOutput = []
            $('div[class="panel_content"]').each((idx, item) => {
                let x = $(item)
                let type = x.prev().text()
                if (type.indexOf("Problem Description") !== -1) {
                    result.description = hduStatementProcess($(x).html())
                } else if (type.indexOf("Sample Input") !== -1) {
                    examplesInput.push(x.text())
                } else if (type.indexOf("Sample Output") !== -1) {
                    examplesOutput.push(x.text())
                } else if (type.indexOf("Input") !== -1) {
                    result.input_format = hduStatementProcess($(x).html())
                } else if (type.indexOf("Output") !== -1) {
                    result.output_format = hduStatementProcess($(x).html())
                } else if (type.indexOf("Hint") !== -1) {
                    result.limit_and_hint = hduStatementProcess($(x).html())
                }
            })

            let titleEle = $('div[class="panel_content"]').parent().children('h1')
            result.title = titleEle.text()
            let info = titleEle.next().text()
            result.time_limit = info.match(/\d+/g)[1]
            result.memory_limit = parseInt(info.match(/\d+/g)[3]) / 1024
            result.example = basic.changeExampleArrToMarkDown(examplesInput, examplesOutput)
            return result
        }catch (e) {
            throw "题目不存在"
        }
    }
    async getCompileErrorInfo(submissionId) {
        const x = await this.req.doRequest({url: 'viewerror.php?rid=' + submissionId})
        const $ = cheerio.load(x.body)
        return $('pre').text()
    }
    async getRunInfo(url) {
        await this.loginIfNotLogin()
        const x = await this.req.doRequest({url})
        const $ = cheerio.load(x.body)
        let tr = $('#fixed_table table tbody').children().next()
        while (tr && !tr.is('tr') && tr.hasClass('')) tr = tr.next()
        let res = {
            submissionId: 0,
            status: '',
            info: '',
            is_over: false,
            type: 'remote',
            score: 0,
            time: 0,
            memory: 0,
        }
        tr.children().each((idx, item) => {
            let c = $(item).text()
            if(idx === 0) res.submissionId = c
            else if(idx === 2) {
                res.status =  changeToSyzOjStatus(c)
                res.info = res.status
                console.log(res.info)
                res.is_over = !inJudging(c)
                res.score = c === 'Accepted' ? 100 : 0
            }
            else if(idx === 4) res.time = parseInt(c.match(/\d+/g)[0])
            else if(idx === 5) res.memory = parseInt(c.match(/\d+/g)[0])
        })
        return res
    }
    async getSubmissionStatus(submissionId) {
        let res = await this.getRunInfo('status.php?first=' + submissionId)
        if(res.status === 'Compile Error') {
            res.compile = {
                message: await this.getCompileErrorInfo(submissionId)
            }
        }
        return res
    }
    async getSubmissionID(problemId) {
        await this.loginIfNotLogin()
        const info = await this.getRunInfo('status.php?user=' + this.username + '&pid=' + problemId)
        return info.submissionId
    }

    async polling() {

        let item
        while (item = this.deque.shift()) {
            const {source, problemID, langId, callback} = item
            let opts = {
                url: "submit.php?action=submit",
                method: "POST",
                form: {
                    check: 0,
                    _usercode: btoa(encodeURIComponent(source)),
                    problemid: problemID,
                    language: langId
                }
            }
            try {
                await this.loginIfNotLogin()
                const res = await this.req.doRequest(opts)
                if (res.statusCode !== 302) {
                    await this.login()
                    throw '提交失败'
                }
                const submissionId = await this.getSubmissionID(problemID)
                callback(null, submissionId, {account: this.username, submissionId})
            } catch (e) {
                callback("执行失败", 0, {account: this.username})
            }
        }
        this.inPolling = false
    }

    async submitCode(source, problemID, langId, callback){ //cb => function(err, submissionId)
        this.deque.push({source, problemID, langId, callback})
        if(!this.inPolling) {
            this.inPolling = true
            this.polling()
        }
    }
}


class HDU {
    constructor() {
        this.base = new HduHandler()
        this.handlers = basic.VjBasic.HDU.accounts.map(account =>  new HduHandler(account.username, account.userpass))
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
    HDU: new HDU(),
}

// const test = async() => {
//     const h = new HduHandler()
//     console.log(await h.getProblem(7260))
// }
// test()