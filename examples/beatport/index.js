/* eslint-disable no-console */
const prompt = require("prompt-sync")()
const _ = require("lodash")
const bpApi = require("./beatport-api.js")

let { username, password } = require("minimist")(process.argv.slice(2))

if (!username) {
  username = prompt("Username: ")
}

if (!password) {
  password = prompt.hide(`Password for ${username} for Beatport: `)
}

const findCookie = (cookieJar, cookieUri, cookieKey) =>
  _(cookieJar.getCookies(cookieUri)).find(c => c.key === cookieKey).value

console.log("Initiating session with form login")
bpApi.initAsync(username, password)
  .tap(() => console.log("Logged in, fetching data"))
  .tap(api => api.getClipAsync(9989461).tap(data => console.log(data)))
  .tap(api => api.getMyBeatportAsync().tap(data => console.log(data)))
  .tap(() => console.log("Requesting data with cookie details from previous login"))
  .then(api => {
    const cookieJar = api.getCookieJar()
    const csrfToken = findCookie(cookieJar, api.cookieUri, api.csrfTokenKey)
    const sessionCookieValue = findCookie(cookieJar, api.cookieUri, "session")
    return bpApi.initWithSessionAsync(sessionCookieValue, csrfToken)
  })
  .tap(api => api.getClipAsync(9989461).tap(data => console.log(data)))
  .tap(api => api.getMyBeatportAsync().tap(data => console.log(data)))
  .catch(err => console.log(err))
