import React from 'react'
import * as Server from 'react-dom/server'
import  ReactDOM  from 'react-dom'
import {Renderer} from './Renderer'
import './components/csscomponents/index.js'

export const App = (metaData) =>{
  console.log(Server.renderToString(<Renderer {...metaData}/>))
  ReactDOM.render(<Renderer {...metaData}/>,document.getElementById('root'))
}
