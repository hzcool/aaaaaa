
const OrderBy = {
    PID: 0,
    Difficulty: 1,
    TotalAccepted: 2,
    TotalSubmit: 3,
};

const get_sort_func = (orderBy, asc) => {
    if(orderBy === OrderBy.Difficulty) {
        return (x, y) => {
            let dx = (x.difficulty == 0 && asc) ? 1000 : x.difficulty;
            let dy = (y.difficulty == 0 && asc) ? 1000 : y.difficulty;
            return asc ? (dx - dy) : (dy - dx)
        }
    } else if(orderBy === OrderBy.TotalAccepted) {
        return (x, y) => {
            return asc ? (x.totalAccepted - y.totalAccepted) :  (y.totalAccepted - x.totalAccepted)
        }
    } else if(orderBy === OrderBy.TotalSubmit) {
        return (x, y) => {
            return asc ? (x.totalSubmit - y.totalSubmit) : (y.totalSubmit - x.totalSubmit)
        }
    }
    return (x, y) => {
        return  asc ? (x.pid < y.pid ? -1 : 1) : (x.pid < y.pid ? 1 : -1)
    }
}

class LuoguHelper{
    constructor(type) {
        this.tags = require("./tags.json")
        this.problems = require(`./problems-${type}.json`)
        this.solutionsPath = `./solutions-${type}`
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

    findByTags(difficulty = [], tag_numbers = [], orderBy = OrderBy.PID, asc = true, page = 1, page_size = 50) {

        let res = this.problems
        if (difficulty.length > 0) res = res.filter(p => difficulty.indexOf(p.difficulty) > -1)
        if (tag_numbers.length > 0) {
            tag_numbers = Array.from(new Set(tag_numbers))
            tag_numbers.sort(function(a, b){return a - b})
            res = res.filter(p => this.contains(p.tags, tag_numbers))
        } else if (orderBy == OrderBy.PID) {
            if(asc)  return {
                total: res.length,
                problems: res.slice((page - 1) * page_size, page * page_size),
            }
            let res2 = []; let base = res.length - 1 - (page - 1) * page_size
            for(let i = 0; i < page_size && base - i >= 0; i++)
                res2.push(res[base - i])
            return {
                total: res.length,
                problems: res2
            }
        }

        let ids = res.map((_, idx) => idx)
        let cmp = get_sort_func(orderBy, asc)
        ids.sort((x, y) => {
            return cmp(res[x], res[y])
        })
        res = ids.map(id => res[id])

        return {
            total: res.length,
            problems: res.slice((page - 1) * page_size, page * page_size),
        }
    }

    getSolutions(pid) {
        try {
            let solutions = require(`${this.solutionsPath}/${pid}.json`);
            return solutions;
        } catch (e) {
            return [];
        }
    }
}

const newLuoguHelper = (() => {
    return (type) => {
        return new LuoguHelper(type)
    }
})()

module.exports = {
    newLuoguHelper
}



