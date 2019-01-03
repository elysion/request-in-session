const prompt = require("prompt-sync")()
const bpApi = require("./beatport-api.js")

let { username, password } = require("minimist")(process.argv.slice(2))

if (!username) {
  username = prompt("Username: ")
}

if (!password) {
  password = prompt.hide(`Password for ${username} for Beatport: `)
}

bpApi.initAsync(username, password)
  .tap(api => api.getClipAsync(9989461).tap(data => console.log(data)))
  .tap(api => api.getMyBeatportAsync().tap(data => console.log(data))
  )
