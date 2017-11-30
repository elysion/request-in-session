const BPromise = require("bluebird")

const { init } = require("../../index.js")

const loginUri = "https://www.beatport.com/account/login"
const cookieUri = "https://www.beatport.com/"

const api = {
  init: (username, password, callback) => {
    return init(cookieUri, loginUri, username, password, "_csrf_token", "session", (err, session) => {
      if (err) {
        return callback(err)
      }

      const api = {
        getMyBeatport: callback => session.getJson("https://www.beatport.com/api/my-beatport", callback),
        getTrack: (trackId, callback) => session.getJson(`https://embed.beatport.com/track?id=${trackId}`, callback),
        getClip: (trackId, callback) => api.getTrack(trackId, (err, res) =>
          err ? callback(err) : callback(null, res.results.preview)),
        addTrackToMainCart: (trackId, callback) => session.postJson(("https://www.beatport.com/api/cart", {
          "items": [{ "type": "track", "id": trackId }]
          // , "trackingData": { "type": "product", "id": "9915168", "name": "Contradictions", "position": "1", "brand": "Shogun Audio", "category": "Tracks", "variant": "track", "list": "Track Detail", "price": "1.56", "dimension1": "Alix Perez", "dimension2": null, "dimension3": "Drum & Bass", "dimension4": null, "dimension12": null } 
        }), callback)

      }
      return callback(null, api)
    })
  },
  initAsync: (username, password) =>
    BPromise.promisify(api.init)(username, password)
      .then(api => BPromise.promisifyAll(api))
}

module.exports = api
