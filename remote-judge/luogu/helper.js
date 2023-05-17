

class LuoguHelper{
    constructor() {
        this.tags = require("./tags.json")
        this.problems = require("./problems.json")
    }

    contains(t1, t2) {
        let i = 0, j = 0
        while(i < t1.length && j < t2.length) {
            if(t1[i] > t2[j]) return false
            else if(t1[i] === t2[j]) j++;
            i++;
        }
        return j === t2.length
    }

    findByTags(tag_numbers = [], page = 1, page_size = 50) {
        let res = this.problems
        if (tag_numbers.length > 0) {
            tag_numbers.sort(function(a, b){return a - b})
            res = this.problems.filter(p => this.contains(p.tags, tag_numbers))
        }
        return {
            total: res.length,
            problems: res.slice((page - 1) * page_size, page * page_size),
        }
    }
}

const newLuoguHelper = (() => {
    this.instance = null
    return () => {
        if(!this.instance) this.instance = new LuoguHelper()
        return this.instance
    }
})()

module.exports = {
    newLuoguHelper
}



