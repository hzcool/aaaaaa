
const vj_config = require("../remote-judge-config.json")
const VjBasic = vj_config.VjBasic
const EnableVJs = vj_config.EnableVJs
module.exports = {
    VjBasic,
    EnableVJs,
    changeExampleArrToMarkDown:  (examplesInput, examplesOutput) => {
        let k = examplesInput.length
        if(k > examplesOutput.length) k = examplesOutput.length
        let md = ""
        for(let i = 0; i < k; ++i) {
            if (md !== "") md += "  \n  \n"
            md += "### 样例" + (i + 1) + "输入  \n```plain \n"
            md += examplesInput[i]
            md += "\n``` \n"

            md += "### 样例" + (i + 1) + "输出  \n```plain \n"
            md += examplesOutput[i]
            md += "\n``` \n"
        }
        return md
    },

    okLang:(lang, source) => {
        let pos = source.indexOf("-")
        if (pos === -1) return false
        return VjBasic[source.substring(0, pos)].enabled_languages.indexOf(lang) !== -1
    },

    getVjBasicFromSource:  (source) => { // Codeforces-1200A
        let pos = source.indexOf("-")
        if (pos === -1) return null
        return VjBasic[source.substring(0, pos)]
    },

    parseSource: (source) => {
        let pos = source.indexOf("-")

        return {
            vjName: source.substring(0, pos),
            problemId: source.substring(pos + 1)
        }
    },

    getLangId: (vjName, lang) => {
        return VjBasic[vjName].langMap[lang]
    },

    sleep: async (time) => {
        return new Promise((resolve) => setTimeout(resolve, time));
    },

    getJudgeInfo: handlers  => {
        let info = ""
        handlers.forEach(h => {
            info += "account: " + h.account +  "\n\n running tasks: [";
            let first = true
            h.running_mp.forEach((_, key) => {
                if(!first) info += ", "; else first = false
                info += key
            })
            first = true
            info += "]\n\n waiting tasks: ["
            h.waiting_mp.forEach((value, key) => {
                if(!first) info += ", "; else first = false
                info += key + ":" + value
            })
            info += "]\n\n"
        })
        return info
    }

}
