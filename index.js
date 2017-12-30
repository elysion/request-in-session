const Promise = require("bluebird")
const requestAsync = Promise.promisify(require("request").defaults({ strictSSL: false }))
const Cookie = require("tough-cookie").Cookie
const _ = require("lodash")

const init = function (cookieUri, loginUri, username, password, csrfTokenKey, sessionKey, callback) {
  let cookieJar = requestAsync.jar()

  function login() {
    return loadLoginPage()
      .then(getCsrfTokenCookie)
      .then(csrftoken => submitLogin(csrftoken, username, password))
      .then(getSessionIdCookie)
      .tap(sessionid => {
        if (sessionid === undefined) {
          throw new Error("Login failed, please check credentials")
        }
      })
  }

  function loadLoginPage() {
    return requestAsync({ uri: loginUri, jar: cookieJar })
  }

  function submitLogin(csrftoken, username, password) {
    return requestAsync({
      method: "POST",
      headers: { "Referer": loginUri },
      jar: cookieJar,
      uri: loginUri,
      form: {
        [csrfTokenKey]: csrftoken,
        username: username,
        password: password
      }
    })
  }

  function getCsrfTokenCookie(res) {
    return getCookieFromRes(res, csrfTokenKey)
  }

  function getSessionIdCookie(res) {
    return getCookieFromRes(res, sessionKey)
  }

  function getCookieFromRes(res, cookiename) {
    var cookies
    if (res.headers["set-cookie"] instanceof Array) {
      cookies = res.headers["set-cookie"].map(c => Cookie.parse(c))
    } else {
      cookies = [Cookie.parse(res.headers["set-cookie"])]
    }

    const cookie = _.find(cookies, { "key": cookiename })
    return cookie ? cookie.value : undefined
  }

  function get(uri) {
    return requestAsync({
      method: "GET",
      jar: cookieJar,
      headers: {
        "Accept": "application/json"
      },
      uri
    })
      .tap(res => console.log({res}))
  }

  login()
    .catch(err => callback(err))
    .then(() => callback(null, {
      postJson: (uri, json, callback) => {
        const csrftoken = _(cookieJar.getCookies(cookieUri)).find(c => c.key === csrfTokenKey).value

        return requestAsync({
          method: "POST",
          headers: {
            "X-CSRFToken": csrftoken,
            "X-Requested-With": "XMLHttpRequest", // TODO: only needed for beatport?
            "Referer": cookieUri
          },
          jar: cookieJar,
          uri,
          json
        })
          .then(res => res.body)
          .tap(json => callback(null, json))
          .catch(err => callback(err))
      },

      get: (uri, callback) =>
        get(uri)
          .tap(res => callback(null, res.body))
          .catch(err => callback(err)),

      getJson: (uri, callback) => 
        get(uri)
          .then(res => res.body)
          .then(JSON.parse)
          .tap(json => callback(null, json))
          .catch(err => callback(err)),

      getCookieJar : () => {
        cookieJar
      }
    }))
}

module.exports = {
  init
}
