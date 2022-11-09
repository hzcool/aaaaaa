
const CF = require("./codeforces")
const {parseProblemId} = require("./codeforces");

class Gym {
    constructor() {
        this.base = CF.Codeforces.base
        this.handlers = CF.Codeforces.handlers
        this.select = -1
        this.records = {}
        setInterval(() => {
            const keys = Object.keys(this.records)
            if(keys.length < 500) return
            const now = new Date().getTime()
            keys.forEach(key => {
                if(now - this.records[key].submitTime > 1800000) delete this.records[key]
            })
        }, 1000 * 3600)
    }

    async getProblem(problemId) {
        const res =  await this.base.getProblem(problemId, true)
        if(res.title === '') {
            try {
                const info = parseProblemId(problemId)
                const arr = await this.base.getGymProblemSetInfo(info.contestId)
                for(let item of arr) {
                    if(item.label === info.submittedProblemIndex) {
                        res.title = item.title
                        res.time_limit = item.time_limit
                        res.memory_limit = item.memory_limit
                        break
                    }
                }
            } catch (e) {}
        }
        return res
    }

    async getSubmissionStatus(submissionId) {
        const r = this.records[submissionId]
        if (!r)  throw "not found submissionId : " + submissionId
        await this.handlers[r.idx].loginIfNotLogin()
        const ret = await this.handlers[r.idx].getSubmissionStatus(submissionId, true)
        if(ret.is_over) {
            const usage = await this.handlers[r.idx].getGymSubmissionUsage(r.gymID, submissionId)
            ret.time = usage.time
            ret.memory = usage.memory
            delete this.records[submissionId]
        }
        return ret
    }

    async submitCode(source, problemID, langId, callback) {
        if((++this.select) >= this.handlers.length) this.select = 0
        const idx = this.select
        const callbackTmp = (e, submissionId, vjInfo) => {
            if(e === null) this.records[submissionId] = {idx,  gymID: CF.parseProblemId(problemID).contestId, submitTime: new Date().getTime()}
            callback(e, submissionId, vjInfo)
        }
        this.handlers[idx].submitCode(source, problemID, langId, callbackTmp, true)
    }

    getProblemLink(problemId) {
        return this.base.getProblemLink(problemId, true)
    }
}

module.exports = {
    Gym: new Gym()
}