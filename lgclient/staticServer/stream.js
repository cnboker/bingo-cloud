//product
//import config from './config'
//development

//const {root, port} = require('./config.dev')
export const start = (root, port) =>{
  const http = require("http");
  const { stat, createReadStream, existsSync } = require("fs");
  const { promisify } = require("util");
  const { pipeline } = require("stream");
  const url = require("url"),
    fileInfo = promisify(stat);
  const path = require("path");
  const mime = require("./mime");
  
  http
    .createServer(async (req, res) => {
      var uri = url.parse(req.url).pathname,
        filename = path.join(root, uri);
  
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
        pipeline(fileStream, res, err => {});
  
        // })
      } else {
        res.writeHead(200, {
          "Content-Length": size,
          "Content-Type": fileType,
          "Access-Control-Allow-Origin": "*"
        });
  
        let fileStream = createReadStream(filename);
  
        pipeline(fileStream, res, err => {});
      }
    })
    .listen(port, () => console.log(`Running on ${port} port`));
}


