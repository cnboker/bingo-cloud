
    import { App } from '../../src/compiler/app'
      import { transformData } from  '../../src/httpserver/postDataTransformer'
      const data = transformData({"sources":[{"type":"video","url":"http://file.ioliz.com/video/1.mp4","poster":"/"},{"type":"video","url":"http://file.ioliz.com/video/2.mp4","poster":"/"},{"type":"video","url":"http://file.ioliz.com/video/3.mp4","poster":"/"}],"duration":3000,"animation":"slider"})
      App(data)
    
    