"use strict";

var express = require("express");
var cors = require("cors");
var ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const { response } = require("express");
var port = 9000;
var host = "0.0.0.0";

const app = express();
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
  ffmpeg(req.query.url)
    // .inputFPS(30)
    //.format("webm")
    .size(req.query.size || "500x?")
    .duration(5)
    .screenshots({
      timemarks: ["50%"],
      filename,
      folder: "tmp",
      size: "500x?",
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

//http://address?url=
app.get("/", (req, res) => {
  res.contentType("video/mp4");
  let filename = req.query.url.split("/").pop();
  filename = filename.split(".").shift() + ".mp4";
  console.log("filename", filename);
  const urlHash = req.query.url.hashCode();

  res.set("progressKey", urlHash);
  res.attachment(filename);
  ffmpeg(req.query.url)
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
        filename
      };
    })
    .on("error", function (err) {
      /// error handling
      console.log("error", err);
      progressSet[urlHash] = { error: err.message };
      //res.sendStatus(500);
    })
    .videoCodec("libx264")
    .size("1920x1080")
    .outputOptions([
      //  '-vcodec libx264',
      "-pix_fmt yuv420p",
      "-movflags empty_moov+default_base_moof+frag_keyframe",
      "-profile:v baseline",
      "-b:v 3000k",
      "-minrate 1500k",
      "-maxrate 4350k",
      "-r 30",
    ])
    //.noAudio()
    .toFormat("mp4")
    .pipe(res, { end: true });
});

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

app.listen(port, host);
console.log("ffmpeg server start");
