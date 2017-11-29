const Promise = require('bluebird')
const requestAsync = Promise.promisify(require('request').defaults({ strictSSL: false }))
const Cookie = require('tough-cookie').Cookie
const _ = require('lodash')
var prompt = require('prompt-sync')()

const init = function (cookieUri, loginUri, username, password, csrfTokenKey, sessionKey, callback) {
  let cookieJar = requestAsync.jar()

  function login() {
    return loadLoginPage()
      .then(getCsrfTokenCookie)
      .then(csrftoken => submitLogin(csrftoken, username, password))
      .then(getSessionIdCookie)
      .tap(sessionid => {
        if (sessionid === undefined) {
          throw new HttpError(401, "Tarkista käyttäjätunnus ja/tai salasana")
        }
      })
  }

  function loadLoginPage() {
    return requestAsync({ uri: loginUri, jar: cookieJar })
  }

  function submitLogin(csrftoken, username, password) {
    return requestAsync({
      method: 'POST',
      headers: { 'Referer': loginUri },
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
    if (res.headers['set-cookie'] instanceof Array) {
      cookies = res.headers['set-cookie'].map(c => Cookie.parse(c))
    } else {
      cookies = [Cookie.parse(res.headers['set-cookie'])]
    }

    const cookie = _.find(cookies, { 'key': cookiename })
    return cookie ? cookie.value : undefined
  }

  login().then(() => callback({
    doPostJson: (uri, json) => {
      const csrftoken = _(cookieJar.getCookies(cookieUri)).find(c => c.key === csrfTokenKey).value
      console.log(csrftoken)

      return requestAsync({
        method: 'POST',
        headers: {
          'X-CSRFToken': csrftoken,
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': cookieUri
        },
        jar: cookieJar,
        uri,
        json
      }).then(res => res.body)
    },

    doGet: (uri, referer) => {
      return requestAsync({
        method: 'GET',
        jar: cookieJar,
        headers: {
          'Accept': 'application/json'
        },
        uri
      }).then(res => res.body)
    }
  }))
}

module.exports = {
  init
}