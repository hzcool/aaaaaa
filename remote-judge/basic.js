


const VjBasic = {
    // VJ 对象必须定义 handler enabled_languages 和 langMap
    Codeforces: {
        enabled_languages : ['cpp14-noi', 'python3'],
        langMap: {
            'c': '43',     // GNU GCC 5.1.0
            'cpp14': '50',   // GNU G++ 6.4.0
            'cpp-noilinux': '50',
            'cpp14-noi': '50',
            'cpp17': '54',   // GNU G++ 7.3.0
            'java': '60',    // Java 11.0.6
            'pascal': '4',   // Free Pascal 3.0.2
            'python2': '7',    // Python 2.7.18
            'python3': '31',       // Python 3.8.10
            'csharp': '79',  //.NET SDK 6.0
        },
        accounts: [{
            handleOrEmail: "nfls001@snapmail.cc",
            password: "nfls_001"
        },{
            handleOrEmail: "nfls002@snapmail.cc",
            password: "nfls_002"
        },{
            handleOrEmail: "nfls003@snapmail.cc",
            password: "nfls_003"
        },{
            handleOrEmail: "nfls004@snapmail.cc",
            password: "nfls_004"
        },{
            handleOrEmail: "nfls005@snapmail.cc",
            password: "nfls_005"
        }]
    },
}



module.exports = {
    VjBasic,
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
    }


}
