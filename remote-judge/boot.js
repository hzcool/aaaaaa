


const basic = require("./basic")
const child_process = require("child_process");
const fs = require("fs")
const path = require('path')
const {sleep} = require("./basic");


// 递归创建目录
function mkdirPath(dirname) {
    if (fs.existsSync(dirname))
        return true
    if (mkdirPath(path.dirname(dirname))) {
        fs.mkdirSync(dirname)
        return true
    }
}
const boot_remote_judge_server = async () => {

    let config = {}
    Object.keys(basic.VjBasic).forEach(oj => {
        if(oj === "Gym") return
        let x = basic.VjBasic[oj]
        config[oj.toLowerCase()] = {
            "lang_map": x["langMap"],
            "accounts": x["accounts"].map(account => {
                return {
                    "password":  account["password"] ||  account["userpass"],
                    "handler": account["handleOrEmail"] || account["handler"] || account["username"]
                }
            })
        }
    })

    let dir = __dirname + "/generates";
    mkdirPath(dir);

    let server_path = dir + "/server.json"
    fs.writeFileSync(server_path, JSON.stringify(basic.RemoteJudgeServer, null, 4))
    let config_path = dir + "/config.json"
    fs.writeFileSync(config_path, JSON.stringify(config, null, 4))
    let logger_path = dir + "/a.log"

    await  new Promise((resolve, reject) => {
        child_process.exec(`lsof -i :${basic.RemoteJudgeServer.ws_port}`, (err, stdout, stderr) => {
            if(err || stdout.trim() === '') {
                resolve(1)
                return
            }
            stdout.split('\n').filter(line => {
                let p=line.trim().split(/\s+/);
                let address = p[1]
                if(address!=undefined && address!="PID") {
                    console.log(`kill PID ${address} of remote-judge server for rebooting`)
                    child_process.exec('kill ' + address, () => {})
                }
            })
            setTimeout(() => resolve(1), 6000)
        })
    })
    child_process.exec(`./bin/remote-judge ${server_path} ${config_path} ${logger_path}`)
}

module.exports = {
    boot_remote_judge_server
}