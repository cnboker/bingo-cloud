const BASHPATH = "/Users/scott/code/ioliz/staticServer";

const http = require("http");
const port = 8888;

const { stat, createReadStream, existsSync } = require("fs");
const { promisify } = require("util");
const { pipeline } = require("stream");
const url = require("url"),
  fileInfo = promisify(stat);
const path = require("path");
const mime = require("./mime");
const child_process = require("child_process");
http
  .createServer(async (req, res) => {
    var uri = url.parse(req.url).pathname,
      filename = path.join(BASHPATH, uri);

    if (!existsSync(filename)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.write("404 Not Found\n");
      //res.end();
      return;
    }
    var fileType = mime.lookup(filename);
    /** Calculate Size of file */
    const { size } = await fileInfo(filename);
    const range = req.headers.range;
    console.log("range", range, size, filename);
    /** Check for Range header */
    var ffmpeg;
    if (range) {
      /** Extracting Start and End value from Range Header */
      let [start, end] = range.replace(/bytes=/, "").split("-");
      start = parseInt(start, 10);
      end = end ? parseInt(end, 10) : size - 1;

      if (!isNaN(start) && isNaN(end)) {
        start = start;
        end = size - 1;
      }
      if (isNaN(start) && !isNaN(end)) {
        start = size - end;
        end = size - 1;
      }

      // Handle unavailable range request
      if (start >= size || end >= size) {
        // Return the 416 Range Not Satisfiable.
        res.writeHead(416, {
          "Content-Range": `bytes */${size}`
        });
        return res.end();
      }
      console.log("range-content", `bytes ${start}-${end}/${size}`);
      /** Sending Partial Content With HTTP Code 206 */
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": end - start + 1,
        "Content-Type": fileType,
        "Access-Control-Allow-Origin": "*"
      });

      let fileStream = createReadStream(filename, { start: start, end: end });
      if (
        [
          "video/ogg",
          "video/mp4",
          "video/webm",
          "application/x-mpegUR"
        ].indexOf(fileType) != -1
      ) {
        ffmpeg = ffmpegPipe(filename,res);
      } else {
        pipeline(fileStream, res, err => {});
      }

      // })
    } else {
      res.writeHead(200, {
        "Content-Length": size,
        "Content-Type": fileType,
        "Access-Control-Allow-Origin": "*"
      });

      let fileStream = createReadStream(filename);

      if (
        [
          "video/ogg",
          "video/mp4",
          "video/webm",
          "application/x-mpegUR"
        ].indexOf(fileType) != -1
      ) {
        ffmpeg = ffmpegPipe(filename, res);
      } else {
        pipeline(fileStream, res, err => {});
      }
    }

    req.on("end", () => {
      //kill ffmpeg
      if (ffmpeg) {
        ffmpeg.kill();
        ffmpeg = null;
      }
    })


  })
  .listen(port, () => console.log("Running on 8888 port"));

const ffmpegPipe = (filename, res) => {
  //https://gist.github.com/dvlden/b9d923cb31775f92fa54eb8c39ccd5a9
  //https://developers.google.com/media/vp9/settings/vod
  var ffmpeg = child_process.spawn("ffmpeg", [
    "-i",
    filename,
    '-f', 'mp4',
    '-preset', 'slow', 
    '-c:a', 'aac',
    '-b:a', '128k',
    '-codec:v','libx264',
    '-pix_fmt', 'yuv420p',
    '-b:v', '1800k',
    '-minrate', '900k',
    '-maxrate', '2610k' ,
    '-bufsize', '2610k',
    '-vf', 'scale=-1:1080',
    'pipe.mp4',
  ])
  //fileStream.pipe(ffmpeg.stdin)
  console.log('stdout', ffmpeg.stdout)
  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on("data", data => {
    console.log("data->", new Buffer.from(data).toString())
  });

  ffmpeg.on("exit", code => {
    console.log("ffmpeg terminated with code " + code)
    
  });

  ffmpeg.on("error", error => {
    console.log("ffmpeg error:" + error)
    
  });

  return ffmpeg;
};
