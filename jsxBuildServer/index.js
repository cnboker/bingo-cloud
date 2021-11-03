const { MetaMap } = require('./entry/data')
const { make } = require('./httpserver/postHandler')
const {httpserver} =require('./httpserver/index')
const username = 'scott';

make(username, MetaMap).then(res => {
  console.log(res)
})
var app =httpserver()
//reload(app)