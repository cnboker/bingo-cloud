//将视频文件转码1080p文件
//输入参数：-f  {finename}
//输出文件名为{filename}_1080p.mp4
//node ffmegConvertor.js -f filename


const fs = require('fs')
const child_process = require("child_process");

(async ()=>{
  var args = process.argv.splice(2)
  //console.log('argv=', process.argv,process.argv.splice(2))
  if(args[0] === '-f'){
    var filename = args[1]
    try{
      //check  file is exists
      await fs.promises.access(filename)
      var index = filename.lastIndexOf(".");
      var outputFileName = filename.slice(0,index) + '_1080p' + filename.slice(index)
      console.log('outfilename', outputFileName)
      ffmpegPipe(filename, outputFileName)
    }catch(error){
      console.log(`$${filename} isnot exists`)
    }
  }else{
    console.log('usage: node ffmpegConvertor.js -f filename')
  }
})()

const ffmpegPipe = (filename,outFileName) => {
  //https://gist.github.com/dvlden/b9d923cb31775f92fa54eb8c39ccd5a9
  //https://developers.google.com/media/vp9/settings/vod
  var ffmpeg = child_process.spawn("ffmpeg", [
    "-i",
    filename,
    '-f', 'mp4',
    // '-c:a', 'aac',
    // '-b:a', '128k',
    // '-codec:v','libx264',
    // '-pix_fmt', 'yuv420p',
    '-b:v', '1800k',//码率1800k
    '-minrate', '900k',
    '-maxrate', '2610k' ,
    '-c:a', 'libopus',
    '-r', '24', //30 frames/s
    '-vf', 'scale=1920x1080', //1080p
    outFileName,
  ])
  //fileStream.pipe(ffmpeg.stdin)
  console.log('stdout', ffmpeg.stdout)
  //ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on("data", data => {
    console.log("data->", new Buffer.from(data).toString())
  });

  ffmpeg.on("exit", code => {
    console.log("ffmpeg terminated with code " + code)
    
  });

  ffmpeg.on("error", error => {
    console.log("ffmpeg error:" + error)
    
  });

};
