var http = require("http"),
  url = require("url"),
  path = require("path"),
  fs = require("fs"),
  mime = require("./mime");
port = 8888;

http.createServer(function (request, response) {
  var uri = url
      .parse(request.url)
      .pathname,
    filename = path.join(process.cwd(), uri);

  fs.exists(filename, function (exists) {
    if (!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }
    var fileType = mime.lookup(filename);
    console.log(fileType);
    //
    if (fileType == "video/mp4") {
      bigVideoResponse(request, response, filename);
    } else {
      fileResponse(request, response, filename);
    }
  });
}).listen(parseInt(port, 10));

console.log("Static file server running at\n  => http://localhost:" + port + "/\nCTRL + C to shutdown");

function fileResponse(request, response, path) {
  if (fs.statSync(filename).isDirectory()) {
    filename += "/index.html";
  }

  fs
    .readFile(filename, "binary", function (err, file) {
      if (err) {
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      response.writeHead(200, {
        "Content-Type": mime.lookup(filename),
        'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
        'Access-Control-Allow-Origin': '*',
        "Access-Control-Allow-Headers": "X-Requested-With"
      });
      console.log('write binary file')
      response.write(file, "binary");
      response.end();
    });
}

function bigVideoResponse(req, res, path) {
  var stat = fs.statSync(path);
  var total = stat.size;
  console.log("range", req.headers["range"]);
  if (req.headers["range"]) {
    var range = req.headers.range;
    
    var parts = range
      .replace(/bytes=/, "")
      .split("-");
    var partialstart = parts[0];
    var partialend = parts[1];

    var start = parseInt(partialstart, 10);
    var end = partialend
      ? parseInt(partialend, 10)
      : total - 1;
    var chunksize = end - start + 1;
    // var maxChunk = 1024 * 1024; // 1MB at a time if (chunksize > maxChunk) {
    // end = start + maxChunk - 1;   chunksize = (end - start) + 1; }
    console.log("RANGE: " + start + " - " + end + " = " + chunksize);

    fileStream = fs.createReadStream(path, {start: start, end: end});
    res.writeHead(206, {
      "Content-Range": "bytes " + start + "-" + end + "/" + total,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
      'Access-Control-Allow-Origin': '*',
      "Access-Control-Allow-Headers": "X-Requested-With"
    });
    res.openedFile = fileStream;
    fileStream.pipe(res);
    fileStream.on("error", function (err) {
      res.end(err);
    });
  } else {
    fileStream = fs.createReadStream(path);
    console.log("ALL: " + total);
    res.openedFile = fileStream;
    res.writeHead(200, {
      "Content-Length": total,
      "Content-Type": "video/mp4",
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
      'Access-Control-Allow-Origin': '*',
      //"Access-Control-Allow-Headers": "X-Requested-With"
    });
    fileStream.pipe(res);
  }

  res
    .on("close", function () {
      console.log("response closed");
      if (res.openedFile) {
        res
          .openedFile
          .unpipe(this);
      
      }
    })

}

