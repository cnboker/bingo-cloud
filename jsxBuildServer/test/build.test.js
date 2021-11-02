const { MetaMap } = require('../entry/data')
const { make } = require('../httpserver/postHandler')
const username = 'scott';

make(username, MetaMap).then(res => {
  console.log(res)
})