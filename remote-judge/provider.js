

const WebSocket = require("ws")
const {sleep} = require("./basic");
const basic = require("./basic")
const deque = require("./deque")

const ws_addr = `ws:${basic.RemoteJudgeServer.host}:${basic.RemoteJudgeServer.ws_port}/entry`
const judge_queue = new deque()
const maximumPoolSize = 10
let counter = 0

const submit_code_handle = async ()=> {

    if (counter >= maximumPoolSize) {
        return
    }
    counter += 1
    item = judge_queue.pop()
    if(!item) {
        counter -= 1
        return
    }

    await new Promise((resolve, reject) => {
        const {data, callback} = item
        const ws = new WebSocket(ws_addr)
        ws.on("open", () => {
            ws.send(JSON.stringify(data))
        })
        let ok = false
        try {
            ws.on("message", evt =>  {
                let resp = JSON.parse(evt)
                callback.report(resp);
                if (resp.error || resp.is_over) {
                    ok = true
                    ws.close()
                }
            })
            ws.on("close", ()=> {
                if(!ok) callback.report({"error": "执行失败"})
                resolve(1)
            })
        } catch (e) {
            if(!ok)  callback.report({"error": "执行失败"})
            resolve(1)
        }
    })
    counter -= 1
    submit_code_handle()
}

const submit_code =  (remote_judge, problem_id, source, langID, callback) => {
    judge_queue.push({
        data: {
            remote_judge,
            problem_id,
            source,
            lang: langID,
            request_type: "judge"
        },
        callback
    })
    submit_code_handle()
}


const get_problem = async (remote_judge, problem_id) => {
    const ws = new WebSocket(ws_addr)

    ws.on("open", () => {
        ws.send(JSON.stringify({
            remote_judge,
            "request_type": "get_problem",
            problem_id,
        }))
    })

    return await new Promise((resolve, reject) => {
        try {
            let sended = false
            ws.on("message", evt => {
                let problem = JSON.parse(evt);
                if(problem.error) reject(problem)
                else {
                    if(problem.examples_input) problem.example = basic.changeExampleArrToMarkDown(problem.examples_input, problem.examples_output)
                    resolve(problem)
                }
                sended = true
                ws.close()
            })
            ws.on("close", ()=> {
                if(!sended) reject({"error" : "未收到反馈"})
            })
        } catch (e) {
            reject({"error": e})
        }
    })
}

const get_problem_link = (remote_judge, problem_id) => {
    let s = remote_judge.toLowerCase()
    if(s === 'codeforces') {
        let pos = problem_id.search(/[A-Z]/)
        return `https://codeforces.com/contest/${problem_id.substring(0, pos)}/problem/${problem_id.substring(pos)}`
    } else if(s === 'gym') {
        let pos = problem_id.search(/[A-Z]/)
        return `https://codeforces.com/gym/${problem_id.substring(0, pos)}/problem/${problem_id.substring(pos)}`
    } else if(s === 'hdu') {
        return `http://acm.hdu.edu.cn/showproblem.php?pid=` + problem_id
    } else if(s === 'atcoder') {
        let pos = problem_id.indexOf("_")
        return `https://atcoder.jp/contests/${problem_id.substring(0, pos)}/tasks/${problem_id}`
    }
}

module.exports  = {
    submit_code,
    get_problem,
    get_problem_link
}

// const test = async () => {
//     let x = await get_problem("hdu", "1000")
//
//     console.log(x)
// }
//
// test()