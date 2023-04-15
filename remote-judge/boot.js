


const basic = require("./basic")
const child_process = require("child_process");
const fs = require("fs")
const path = require('path')


// 递归创建目录
function mkdirPath(dirname) {
    if (fs.existsSync(dirname))
        return true
    if (mkdirPath(path.dirname(dirname))) {
        fs.mkdirSync(dirname)
        return true
    }
}
const boot_remote_judge_server = () => {

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

    child_process.exec(`./bin/remote-judge ${server_path} ${config_path} ${logger_path}`)
}

module.exports = {
    boot_remote_judge_server
}