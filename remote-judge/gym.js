
const CF = require("./codeforces")
const {parseProblemId} = require("./codeforces");

records = new Map()
class Gym {
    constructor() {
        this.base = CF.Codeforces.base
        this.handlers = CF.Codeforces.handlers
        this.select = -1

        // setInterval(() => {
        //     const keys = Object.keys(records)
        //     if(keys.length < 500) return
        //     const now = new Date().getTime()
        //     keys.forEach(key => {
        //         if(now - this.records[key].submitTime > 1800000) this.records.delete(key)
        //     })
        // }, 1000 * 3600)
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
        if (!records.has(submissionId))  {
            return {
                status: 'Judgement Failed',
                info: "not found submissionId : " + submissionId,
                is_over: true,
                type: 'remote',
                score: 0,
                time: 0,
                memory: 0,
            }
        }
        const r = records.get(submissionId)
        let handler = this.handlers[r.idx];
        const ret = await handler.getSubmissionStatus(submissionId, true)
        if(ret.is_over) {
            try {
                const usage = await handler.getGymSubmissionUsage(r.gymID, submissionId)
                ret.time = usage.time
                ret.memory = usage.memory
            } catch (e) {}
            records.delete(submissionId)
        }
        return ret
    }

    async submitCode(source, problemID, langId, callback) {
        if((++this.select) >= this.handlers.length) this.select = 0
        const callbackTmp = {
            idx: this.select,
            callback: callback,
            records: records,
            onSuccess: async function (submissionId, vjInfo) {
                this.records.set(submissionId, {idx: this.idx,  gymID: CF.parseProblemId(problemID).contestId, submitTime: new Date().getTime()})
                this.callback.onSuccess(submissionId, vjInfo)
            },
            onFail: async function (error, vjInfo) {
                this.callback.onFail(error, vjInfo)
            }
        }
        this.handlers[this.select].submitCode(source, problemID, langId, callbackTmp, true)
    }

    getProblemLink(problemId) {
        return this.base.getProblemLink(problemId, true)
    }
}

module.exports = {
    Gym: new Gym()
}