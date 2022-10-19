
// Sat, 14-Oct-2023 02:23:55 GMT
// X-User-Sha1=489080dc9a804734744547afe1cf85e5615cb300; Max-Age=31536000; Expires=Sat, 14-Oct-2023 02:23:55 GMT; Path=/
const cookie = require("cookie")
const request = require('request')



class Cookie {

    constructor() {  // cookie 的结构是 key : cookie object
        this.cookies = {}
    }

    parse_cookie_str(cookie_str) {
        const key = cookie_str.substring(0, cookie_str.indexOf('='))
        const object = cookie.parse(cookie_str)
        if(object.Expires) object.Expires = new Date(object.Expires)
        else if(object["Max-Age"]) object.Expires = new Date(Date.now() + parseInt(object["Max-Age"]) * 1000)
        this.cookies[key] = object
    }

    parse_cookie_arr(cookies) {
        cookies.forEach(c => this.parse_cookie_str(c))
    }

    get_cookie_str() {
        let cookie_str = ""
        const now = new Date()
        Object.keys(this.cookies).forEach(key => {
            const c = this.cookies[key]
            if(c.Expires && c.Expires < now) {
                delete this.cookies[key]
            } else {
                if(cookie_str !== "") cookie_str += "; "
                cookie_str += key + "=" + c[key]
            }
        })
        return cookie_str
    }
}


class Request {
    constructor(baseURL) {
        this.baseURL = baseURL
        if(this.baseURL[this.baseURL.length - 1] !== '/') this.baseURL += '/'
        this.userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.56 Safari/537.36 Edg/100.0.1185.23`
        this.cookie = new Cookie()

        // 自动带上cookie 和 user-agent
        this.doRequestBeforeList = [(opts) => {
            if (opts.headers === undefined) opts.headers = {}

            if (opts.headers.cookie === undefined) {
                let c = this.cookie.get_cookie_str()
                if (c !== "") opts.headers.cookie = c
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

    async doRequest(opts) {
        this.doRequestBeforeList.forEach(func => func(opts))
        return new Promise((resolve, reject) => {
            try {
                request(opts, (e, r) => {
                    if(e != null) reject(e)
                    else {
                        this.doRequestAfterList.forEach(func => func(r))
                        resolve(r)
                    }
                })
            } catch (e) {
                reject(e)
            }
        })
    }
}


module.exports = {
    Request
}
