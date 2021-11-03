const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const postHandler = require('./postHandler')
const app = express()

exports.httpserver = () => {
  // defining an array to work as the database (temporary solution)
  const ads = [
    {
      title: 'Hello, world (again)!'
    }
  ];

  app.use(helmet())
  app.use(cors())
  app.use(bodyParser.json())
  app.use(morgan('combined'))
  app.use(express.static(`${process.cwd()}/publish`))

  app.get('/', (req, res) => {
    res.send(ads)
  })

  app.post('/', async(req, res) => {
    const {username, data} = req.body
    postHandler
      .make(username, data)
      .then(res => {
        res.send(res)
      })
  }) 
 
  app.delete('/:id', async(req, res) => {})

  app.put('/:id', async(req, res) => {})

  app.listen(8888, () => {
    console.log('listening on port 8888')
  })
  return app
}