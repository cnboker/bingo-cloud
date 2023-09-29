"use strict";

var express = require("express");
var cors = require("cors");
var ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const h264check = require('./videoInfo')
var port = 9000;
var host = "0.0.0.0";
//var timeout = express.timeout;
//var timeout = require('connect-timeout')
const app = express();
//app.use(timeout(120000))
app.use(cors());

const progressSet = {};
//dataprogress?key={url->hash}
app.get("/dataProgress", (req, res) => {
  const hashCode = req.query.url.hashCode();
  res.status(200).jsonp(progressSet[hashCode] || { percent: 0 });
});

//scrapshot
app.get("/image", (req, res) => {
  let filename = req.query.url.split("/").pop();
  filename = Date.now() + ".png";
  console.log("req.query.size", req.query.size);
  ffmpeg(req.query.url)
    // .inputFPS(30)
    //.format("webm")
    //.size(req.query.size || "200x?")
    .duration(5)
    .screenshots({
      timemarks: ["00:00:05.000"],
      filename,
      folder: "tmp",
      size: req.query.size || "200x?",
    })
    .on("error", function (err) {
      console.log("error", err.message);
      res.sendStatus(500);
    })
    .on("end", function () {
      console.log("screensnap end...");
      var filePath = path.join(__dirname, "/tmp/" + filename);
      console.log("filePath", filePath);
      var stat = fs.statSync(filePath);
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": stat.size,
      });
      console.log("filePath", filePath, stat.size);
      fs.createReadStream(filePath)
        .pipe(res)
        .on("finish", function () {
          fs.rmSync(filePath);
        });
    });
});

app.get("/test", (req, res) => {
  videoEncode('./tmp/sample.webm', res);
})

app.get("/", (req, res) => {
  videoEncode(req.query.url, res);
});

//Check if the video requires encoding, video that meet 1080p and 30 fps do not require encoding
app.get('/h264', async (req, res) => {
  const result = await h264check(req.query.url);
  return res.send(200, { result })
})

//http://address?url=
//ffmpeg.exe -i input_file -movflags empty_moov+omit_tfhd_offset+frag_keyframe+default_base_moof+isml -c:a aac output_file
const videoEncode = (url, res) => {
  res.setTimeout(30 * 60 * 1000);
  res.contentType("video/mp4");
  let filename = url.split("/").pop();
  filename = filename.split(".").shift() + ".mp4";
  console.log("filename", filename);
  const urlHash = url.hashCode();

  res.set("progressKey", urlHash);
  res.attachment(filename);
  ffmpeg(url)
    .on("start", function (ffmpegCommand) {
      /// log something maybe
      progressSet[urlHash] = { percent: 0 };
    })
    .on("progress", function (data) {
      /// do stuff with progress data if you want
      console.log("progress", data);
      progressSet[urlHash] = { ...data, filename };
    })
    .on("end", function () {
      /// encoding is complete, so callback or move on at this point
      progressSet[urlHash] = {
        percent: 100,
        filename,
      };
      res.end();
    })
    .on("error", function (err) {
      /// error handling
      console.log("error", err);
      progressSet[urlHash] = { error: err.message };
      //res.sendStatus(500);
    })
    .videoCodec("libx264")
    .audioCodec("aac")
    .size("1920x1080")
    .outputOptions([
      "-map 0:0",
      "-map -0:a", //取消音频
      "-pix_fmt yuv420p",
      // "-movflags empty_moov+default_base_moof+frag_keyframe",
      "-movflags empty_moov+omit_tfhd_offset+frag_keyframe+default_base_moof+isml",
      "-profile:v baseline",
      "-b:v 3000k",
      "-minrate 1500k",
      "-maxrate 4350k",
      "-r 30",
    ])
    .noAudio()
    .toFormat("mp4")
    //.save('./tmp/test.mp4')
    .pipe(res, { end: true });
};

String.prototype.hashCode = function () {
  var hash = 0,
    i,
    chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

var server = app.listen(port, host);
server.setTimeout(30 * 60 * 1000);
console.log("ffmpeg server start");
