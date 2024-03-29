//npx http-server before run it
//Execute the current command: 
//node index.js &
//node test.js --sample
//Check is the encodings ervice is running properly

const process = require("process");
const http = require("http");
const fs = require("fs");

const myArgs = process.argv.slice(2);
console.log("myArgs: ", myArgs);

if (myArgs.length > 0) {
  //node test.js a b; example:node test.js --sample /home/scott/Documents/LG1080P.mp4 /home/scott/Documents/LG1080P1.mp4
  //first run node.index.js
  //source:a
  //target:b
  if (myArgs[0] === "--sample") {
    const source = myArgs[1]
    const target = myArgs[2];
    if (fs.existsSync(target)) {
      fs.unlink(target, (err) => {
        if (err) throw err;
        console.log(`${target} has deleted`);
      });
    }
    const file = fs.createWriteStream(target);
    const request = http.get(`http://localhost:9000?url=${source}`, (res) => {
      res.pipe(file);
      file
        .on("finish", () => {
          file.close();
          console.log("vide encode success!!!");
          process.exit();
          // fs.unlink(target, (err) => {
          //   if (err) throw err;
          //   //console.log(`${target} has deleted`);
          //   process.exit();
          // });
        })
        .on("error", (err) => {
          fs.unlink(target, (err) => {
            if (err) throw err;
            console.log(`${target} has deleted`);
            process.exit();
          });
        });
    });
    process.stdin.resume();
  }
} else {
  const target = "./tmp/4a.mp4";
  const file = fs.createWriteStream(target);
  const request = http.get(
    "http://localhost:9000?url=http://localhost:8080/tmp/4.mp4",
    (res) => {
      res.pipe(file);
      file
        .on("finish", () => {
          file.close();
          console.log("download finished");
        })
        .on("error", (err) => {
          fs.unlink(target);
        });
    }
  );
  process.stdin.resume();
}
