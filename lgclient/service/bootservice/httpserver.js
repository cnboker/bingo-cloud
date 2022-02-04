// var util = require("util");

// var spawn = require("child_process").spawn;
// var ps = spawn("ps", ["aux"]);
// var grep = spawn("grep", ["node ./stream.js"]);
// ps.stdout.pipe(grep.stdin);

// grep.stdout.on("data", function(data) {
//   console.log("stdout:" + data);
//   var found = data.indexOf("node ./stream.js");
  // if (found === -1) {
  //   var server = spawn("node", ["./stream.js"]);
  //   server.stdout.on("data", function(data) {
  //     console.log({ returnValue: true });
  //   });
  //   server.stderr.on("data", function(data) {
  //     console.log({ returnValue: false, errorText: data });
  //   });
  //   server.on("exit", function(code) {
  //     console.log({ returnValue: false, errorText: "server exit" });
  //   });
  // } else {
  //   console.log({ returnValue: false, errorText: "has started" });
  // }
//});

// grep.stderr.on("data", function(data) {
//   console.log("stderr: " + data);
// });

// grep.on("exit", function(code) {
//   console.log("child process exited with code " + code);
//   var server = spawn("node", ["./stream.js"]);
//   server.stdout.on("data", function(data) {
//     console.log({ returnValue: true, text:data.toString() });
//   });
//   server.stderr.on("data", function(data) {
//     console.log({ returnValue: false, errorText: data });
//   });
//   server.on("exit", function(code) {
//     console.log({ returnValue: false, errorText: "server exit" });
//   });
// });


// var daemon = require('./daemon')
//     daemon();
    var server = require('./stream')
    server();
