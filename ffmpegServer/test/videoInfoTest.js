
const  h264check  = require('../videoInfo')

async function test() {
    const homedir = require('os').homedir();
    var filename = `${homedir}/Documents/LG1080P1.mp4`
    const result = await h264check(filename);
    console.log('result', result)
}

(async () => {
    await test()
})()