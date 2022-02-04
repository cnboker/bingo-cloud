/*
554 MI:SPB UserReject
535:authentication failed
553:Mail from must equal authorized user
501:501 Bad address syntax
*/
var errorCode = {
  "554": "MI:SPB UserReject",
  "535": "authentication failed",
  "553": "Mail from must equal authorized user",
  "501": "Bad address syntax",
  "000": "success",
  "ECONNECTION":"ECONNECTION"
};

const result = {sendCount:0};
const successKey = "000";
Object.keys(errorCode).forEach(x => {
  result[x] = [];
});

export function write(account, responseCode) {
  result.sendCount += 1;
  if(responseCode === 'ECONNECTION')process.exit();
  var target = Object.keys(errorCode).find(x => {
    return responseCode == x;
  });
  console.log("target,", target);
  if (!target) {
    target = successKey;
  }
  result[target].push(account);
}

export function stats() {
  var fs = require("fs");
  var outputFilename = "report.json";
  return new Promise((resovle, reject) => {
    result.success = result[successKey].length;
    result.failure = result.sendCount - result.success;
    fs.writeFile(outputFilename, JSON.stringify(result, null, 4), function(
      err
    ) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log("JSON saved to " + outputFilename);
        resovle();
      }
    });
  });
}
