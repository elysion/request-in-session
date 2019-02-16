const Promise = require("bluebird")

const request = require("request").defaults({ strictSSL: false })
const requestAsync = Promise.promisify(request)
const Cookie = require("tough-cookie").Cookie
const _ = require("lodash")

const initWithSession = function (cookieProperties, cookieUri, callback) {
  let cookieJar = requestAsync.jar()

  Object.keys(cookieProperties).forEach(key => {
    cookieJar.setCookie(request.cookie(`${key}=${cookieProperties[key]}`), cookieUri)
  })

  return callback(null, createSessionRequestObject(cookieJar, cookieUri, ""))
}

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
    let cookies
    if (res.headers["set-cookie"] instanceof Array) {
      cookies = res.headers["set-cookie"].map(c => Cookie.parse(c))
    } else {
      cookies = [Cookie.parse(res.headers["set-cookie"])]
    }

    const cookie = _.find(cookies, { "key": cookiename })
    return cookie ? cookie.value : undefined
  }

  login()
    .catch(err => callback(err))
    .then(() => callback(null, createSessionRequestObject(cookieJar, cookieUri, csrfTokenKey)))
}

function createSessionRequestObject (cookieJar, cookieUri, csrfTokenKey) {
  return {
    postForm: (uri, formData, callback) => {
      return postFormData(cookieJar, cookieUri, uri, formData, callback)
    },
    postJson: (uri, json, callback) => {
      return requestWithMethod(cookieJar, cookieUri, csrfTokenKey, "POST", uri, json, callback)
    },

    deleteJson: (uri, json, callback) => {
      return requestWithMethod(cookieJar, cookieUri, csrfTokenKey, "DELETE", uri, json, callback)
    },

    get: (uri, callback) =>
      get(cookieJar, uri)
        .tap(res => callback(null, res.body))
        .catch(err => callback(err)),

    getJson: (uri, callback) =>
      get(cookieJar, uri)
        .then(res => res.body)
        .then(JSON.parse)
        .tap(json => callback(null, json))
        .catch(err => callback(err)),

    getBlob: (uri, callback) => {
      callback(null, request({
        method: "GET",
        headers: {
          "Referer": cookieUri
        },
        jar: cookieJar,
        uri
      }))
    },

    getCookieJar: () => cookieJar
  }
}

function get(cookieJar, uri) {
  return requestAsync({
    method: "GET",
    jar: cookieJar,
    headers: {
      "Accept": "application/json"
    },
    uri
  })
}

function postFormData(cookieJar, cookieUri, uri, data, callback) {
  console.log(JSON.stringify({cookieJar}, null, 2))
  return requestAsync({
    uri,
    method: "POST",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": cookieUri,
    "Origin": cookieUri,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    form: data,
    jar: cookieJar
  })
    .then(res => res.body)
    .tap(json => callback(null, json))
    .catch(err => callback(err))
}

function requestWithMethod(cookieJar, cookieUri, csrfTokenKey, method, uri, json, callback) {
  const csrftoken = _(cookieJar.getCookies(cookieUri)).find(c => c.key === csrfTokenKey).value

  return requestAsync({
    method: method,
    headers: {
      "X-CSRFToken": csrftoken, // TODO: only needed for beatport?
      "X-Requested-With": "XMLHttpRequest",
      "Referer": cookieUri
    },
    jar: cookieJar,
    uri,
    json
  })
    .then(res => res.body)
    .tap(json => callback(null, json))
    .catch(err => callback(err))
}

module.exports = {
  init,
  initWithSession
}
