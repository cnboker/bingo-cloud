const { MetaMap } = require('./entry/data')
const { make } = require('./src/httpserver/postHandler')
//const {httpserver} =require('./src/httpserver/index')
const username = 'scott';

make(username, MetaMap).then(res => {
  console.log(res)
})
//var app =httpserver()
 