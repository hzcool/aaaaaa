
// Sat, 14-Oct-2023 02:23:55 GMT
// X-User-Sha1=489080dc9a804734744547afe1cf85e5615cb300; Max-Age=31536000; Expires=Sat, 14-Oct-2023 02:23:55 GMT; Path=/
const winston = require('winston')
const retry = require('async-retry')
const cookie = require("cookie")
const request = require('request')
const superagent = require("superagent")


class Cookie {

    constructor() {  // cookie 的结构是 key : cookie object
        this.cookies = {}
    }

    parse_cookie_str(cookie_str) {
        const key = cookie_str.substring(0, cookie_str.indexOf('='))
        const object = cookie.parse(cookie_str)
        this.cookies[key] = object[key]
    }

    parse_cookie_arr(cookies) {
        cookies.forEach(c => this.parse_cookie_str(c))
    }


    set_cookie_item(key, val) {
        this.cookies[key] = val
    }

    get_cookie_arr() {
        let res = []
        for(let key in this.cookies) {
            res.push(`${key}=${this.cookies[key]}`)
        }
        return res
    }

    get_cookie_value(key) {
        return this.cookies[key]
    }

    get_cookie_str() {
        let cookie_str = ""
        Object.keys(this.cookies).forEach(key => {
            let val = this.cookies[key]
            if(cookie_str !== "") cookie_str += "; "
            cookie_str += key + "=" + val
        })
        return cookie_str
    }


}


class Request {
    constructor(baseURL) {
        this.baseURL = baseURL
        if(this.baseURL[this.baseURL.length - 1] !== '/') this.baseURL += '/'
        this.userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36 Edg/108.0.1462.15"
        this.cookie = new Cookie()

        // 自动带上cookie 和 user-agent
        this.doRequestBeforeList = [(opts) => {
            // if(!opts.maxRedirects) opts.maxRedirects = 0
            if (opts.headers === undefined) opts.headers = {}

            if (opts.headers.cookie === undefined) {
                opts.headers.cookie= this.cookie.get_cookie_str()
            }

            if (opts.headers['User-Agent'] === undefined) {
                opts.headers['User-Agent'] = this.userAgent
            }

            // 添加baseurl
            if(opts.url) {
                if(opts.url.indexOf("http") === -1) {
                    if(opts.url[0] === '/') opts.url = this.baseURL + opts.url.substring(1)
                    else opts.url = this.baseURL + opts.url
                }
            } else opts.url = this.baseURL
        }]

        // 更新 cookie
        this.doRequestAfterList = [(res) => {
            const cookies = res.headers["set-cookie"]
            if (cookies) this.cookie.parse_cookie_arr(cookies)
        }]
    }


    addRequestBeforeFunc(func) {
        this.doRequestBeforeList.push(func)
    }

    addRequestAfterFunc(func) {
        this.doRequestAfterList.push(func)
    }


    async super_agent_request(opts) {
        this.doRequestBeforeList.forEach(func => func(opts))
        // console.log(opts)
        return await new Promise((resolve, reject) => {
            if(opts.method && opts.method.toUpperCase() === "POST") {
                superagent.post(opts.url)
                    .type('form')
                    .set("Cookie", opts.headers.cookie)
                    .send(opts.data)
                    .end((err, res) => {
                        if(err) {
                            reject(err)
                        } else {
                            this.doRequestAfterList.forEach(func => func(res))
                            resolve(res)
                        }
                    })
            } else {
                superagent.get(opts.url)
                    .set("Cookie", opts.headers.cookie)
                    .end((err, res) => {
                        if(err) {
                            reject(err)
                        } else {
                            this.doRequestAfterList.forEach(func => func(res))
                            resolve(res)
                        }
                    })
            }
        })
    }

    async doRequest(opts) {
        this.doRequestBeforeList.forEach(func => func(opts))
        return await new Promise((resolve, reject) => {
            try {
                request(opts, (e, r) => {
                    if(e) reject(e)
                    else {
                        this.doRequestAfterList.forEach(func => func(r))
                        resolve(r)
                    }
                })
            }catch (e) {
                reject(e)
            }
        })
    }
}


module.exports = {
    Request
}
