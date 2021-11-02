import React from 'react'
import * as Server from 'react-dom/server'
import  ReactDOM  from 'react-dom'
import {Renderer} from './Renderer'

export const App = (metaData) =>{
  console.log(Server.renderToString(<Renderer metaData={metaData}/>))
  ReactDOM.render(<Renderer metaData={metaData}/>,document.getElementById('root'))
}
