exports.cssFilePlugin = {
  name: 'css-file',
  setup(build) {
    const path = require('path')
    
    build.onResolve({
      filter: /\.css$/
    }, args => {
      //console.log('css--------',args)
      var _path = ''
      try{
        _path =require.resolve(args.path)
      }catch(e){
        _path = path.join(args.resolveDir ,args.path)
      }
      return {
        path:_path, //获取引用实际路径
        namespace: 'css-file'
      }
    })
    let fs = require('fs')
    build.onLoad({
      filter: /.*/,
      namespace: 'css-file'
    }, async(args) => {
      //console.log('cssplugin', args)
      const CleanCSS = require('clean-css')
      const cleanCss = new CleanCSS({})
      const {outdir} = build.initialOptions
      let content = await fs.promises.readFile(args.path, 'utf8')
      content = cleanCss.minify(content).styles
      
      fs.promises.appendFile(`${outdir}/main.css`,content, 'utf8')
      
      return {contents: content, loader: 'text'}
    })
  }

}