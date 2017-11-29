const {init} = require('./form_login_session.js')

const loginUri = 'https://www.beatport.com/account/login'
const cookieUri = 'https://www.beatport.com/'

module.exports = {
    init: (username, password, callback) => 
    init(cookieUri, loginUri, username, password, '_csrf_token', 'session', session => callback({
        getMyBeatport: () => session.doGet('https://www.beatport.com/api/my-beatport'),
        addTrackToMainCart: trackId => session.doPostJson(('https://www.beatport.com/api/cart', { 
            "items": [{ "type": "track", "id": trackId }]
            // , "trackingData": { "type": "product", "id": "9915168", "name": "Contradictions", "position": "1", "brand": "Shogun Audio", "category": "Tracks", "variant": "track", "list": "Track Detail", "price": "1.56", "dimension1": "Alix Perez", "dimension2": null, "dimension3": "Drum & Bass", "dimension4": null, "dimension12": null } 
            }))
    }))
}
    