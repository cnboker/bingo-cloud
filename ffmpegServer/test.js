//npx http-server before run it

const process = require('process')
const http = require('http')
const fs = require('fs')

const target = './tmp/test.mp4'
const file = fs.createWriteStream(target)
const request = http.get('http://localhost:9000?url=http://localhost:8080/tmp/beach_4k.mp4',(res)=>{
    res.pipe(file);
    file.on('finish',()=>{
        file.close();
        console.log('download finished')
    })
    .on('error',(err)=>{
        fs.unlink(target)
    })
})
process.stdin.resume()
