'use strict';

const {first} = require("cheerio/lib/api/traversing");
module.exports = class Dequeue {
    constructor() {
        this.first = null;
        this.last = null;
    }

    push(item) {
        const last = this.last;
        const element = { prev: last, next: null, item };
        if (last) {
            last.next = element;
            this.last = element;
        } else {
            this.first = element;
            this.last = element;
        }
    }

    pop() {
        const element = this.last;
        if (!element) return null;
        if (this.first === element) {
            this.first = null;
            this.last = null;
        } else {
            this.last = element.prev;
            this.last.next = null;
        }
        return element.item;
    }

    unshift(item) {
        const first = this.first;
        const element = { prev: null, next: first, item };
        if (first) {
            first.prev = element;
            this.first = element;
        } else {
            this.first = element;
            this.last = element;
        }
    }

    shift() {
        const element = this.first;
        if (!element) return null;
        if (this.last === element) {
            this.first = null;
            this.last = null;
        } else {
            this.first = element.next;
            this.first.prev = null;
        }
        return element.item;
    }

    visitAll() {
        let res = []
        let it = this.first;
        while (it) {
            res.push(it.item)
            it = it.next
        }
        return res
    }
}
