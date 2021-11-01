import React from 'react'
import * as Server from 'react-dom/server'
import  ReactDOM  from 'react-dom'
import {Renderer} from './Renderer'

export const App = (metaDeata) =>{
  console.log(Server.renderToString(<Renderer metaDeata={metaDeata}/>))
  ReactDOM.render(<Renderer metaDeata={metaDeata}/>,document.getElementById('root'))
}
