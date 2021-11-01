const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')

const app = express()

// defining an array to work as the database (temporary solution)
const ads = [
  {title: 'Hello, world (again)!'}
];


app.use(helmet())
app.use(cors())
app.use(bodyParser.json())
app.use(morgan('combined'))
app.use(express.static('../publish'))

app.get('/',(req,res)=>{
  res.send(ads)
})

app.post('/', async(req,res)=>{

})

app.delete('/:id',async(req,res)=>{

})

app.put('/:id',async(req,res)=>{

})

app.listen(8888,()=>{
  console.log('listening on port 8888')
})