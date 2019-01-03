const BPromise = require("bluebird")

const { init, initWithSession } = require("../../index.js")

const loginUri = "https://www.beatport.com/account/login"
const cookieUri = "https://www.beatport.com/"
const csrfTokenKey = "_csrf_token"
const sessionCookieKey = "session"

const getApi = function (session) {
  const api = {
    getMyBeatport: callback => session.getJson("https://www.beatport.com/api/my-beatport", callback),
    getTrack: (trackId, callback) => session.getJson(`https://embed.beatport.com/track?id=${trackId}`, callback),
    getClip: (trackId, callback) => api.getTrack(trackId, (err, res) =>
      err ? callback(err) : callback(null, res.results.preview)),
    addTrackToMainCart: (trackId, callback) => session.postJson(("https://www.beatport.com/api/cart", {
      "items": [{ "type": "track", "id": trackId }]
      // , "trackingData": { "type": "product", "id": "9915168", "name": "Contradictions", "position": "1", "brand": "Shogun Audio", "category": "Tracks", "variant": "track", "list": "Track Detail", "price": "1.56", "dimension1": "Alix Perez", "dimension2": null, "dimension3": "Drum & Bass", "dimension4": null, "dimension12": null }
    }), callback),
    getCookieJar: session.getCookieJar,
    cookieUri,
    csrfTokenKey,
  }
  return api
}

const handleCreateSessionResponse = callback => (err, session) => {
  if (err) {
    return callback(err)
  }

  return callback(null, getApi(session))
}

const initializers = {
  initWithSession: (sessionCookieValue, csrfToken, callback) => {
    return initWithSession(sessionCookieKey, sessionCookieValue, cookieUri, csrfTokenKey, csrfToken, handleCreateSessionResponse(callback))
  },
  init: (username, password, callback) => {
    return init(cookieUri, loginUri, username, password, csrfTokenKey, sessionCookieKey, handleCreateSessionResponse(callback))
  },
  initAsync: (username, password) =>
    BPromise.promisify(initializers.init)(username, password)
      .then(api => BPromise.promisifyAll(api)),
  initWithSessionAsync: (sessionCookieValue, csrfToken) =>
    BPromise.promisify(initializers.initWithSession)(sessionCookieValue, csrfToken)
      .then(api => BPromise.promisifyAll(api))
}

module.exports = initializers
