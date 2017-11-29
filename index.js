var prompt = require('prompt-sync')()
const bpApi = require('./beatport-api.js')

let { username, password } = require('minimist')(process.argv.slice(2));

if (!password) {
    password = prompt.hide(`Password for ${username} for Beatport: `);
}

bpApi.init(username, password, api => api.getMyBeatport().tap(data => console.log(data)))