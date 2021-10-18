import React, {useEffect, useState} from 'react'
import {webosApis} from 'lgservice'

export default()=>{
  const root = '/media/interal/'
  const [existed,setExisted] = useState(false)
  const [existed1,setExisted1] = useState(false)
  const [error,setError] = useState('')
  const [writeOk,setWriteOk] = useState(false)
  const [removeOk,setRemoveOk]=useState(false)
  const [configContent,setConfigContent] =useState('')
  const {webosFileService} = webosApis
  const {exists,readFile,removeFile,writeFile}=webosFileService
  const path =`${root}config.txt`

  useEffect(()=>{
    exists(path)
    .then(res=>{
      setExisted(res)
      return writeFile(path,'hello world')
    })
    .then(res=>{
      setWriteOk(res)
      return readFile(path)
    })
    .then(res=>{
      setConfigContent(res)
      return removeFile(path)
    })
    .then((res)=>{
      setRemoveOk(res)
      return exists(path)
    })
    .then(res=>{
      setExisted1(res)
    })
    .catch(e=>{
      setError(e)
    })
  },[])

  return(
    <React.Fragment>
       <h3>IO test</h3>
    <div>
      config.txt is existed:{existed.toString()}
    </div>
    <div>
      write config.txt : {writeOk.toString()}
    </div>
    <div>
      read config.txt: {
        configContent
      }
    </div>
    <div>
      config.txt is  existed:{existed1.toString()}
    </div>
    <div>
      remove file:{removeOk.toString()}
    </div>
    <div>
      error:{error}
    </div>
    </React.Fragment>
   
  )
}