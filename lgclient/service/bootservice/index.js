var Service = require("webos-service");
const pkgInfo = require("./package.json");
var service = new Service(pkgInfo.name);
const { existsSync, writeFileSync } = require("fs");
const { spawn, exec } = require("child_process");
const serviceName = "dclient.service";
const dclientServicePath = `/lib/systemd/system/${serviceName}`;

const serviceRemoveScript = `
      systemctl stop ${serviceName} && 
      systemctl disable ${serviceName} && 
      rm /lib/systemd/system/webos-bd.target.wants/${serviceName}  && 
      rm /lib/systemd/system/${serviceName} && 
      systemctl daemon-reload && 
      systemctl reset-failed
`;

const serviceScript = `
      [Unit]
      Description=webos - "%n"

      [Service]
      Type=oneshot
      ExecStart=/usr/bin/luna-send -n 1 -f luna://com.webos.service.applicationmanager/launch '{ "id" : "com.ioliz.dc.app"}'
      `;

var fs = require("fs");
var util = require("util");
const { truncate } = require("fs/promises");
var log_file = fs.createWriteStream(__dirname + "/debug.log", { flags: "w" });
var log_stdout = process.stdout;

console.log = function(d) {
  //
  log_file.write(util.format(d) + "\n");
  log_stdout.write(util.format(d) + "\n");
};

service.register("autoboot", function(message) {
  if (existsSync(dclientServicePath)) {
    exec(serviceRemoveScript, (err, stdout, stderr) => {
      console.log("serviceRemoveScript err", err);
      if (err) {
        message.respond({ returnValue: false, errorText: err });
        return;
      }
      createboot(message.respond);
    });
  } else {
    createboot(message.respond);
  }
});

service.register("startServer", function(message) {
  // var ps = spawn("ps", ["aux"]);
  // var grep = spawn("grep", ["node ./stream.js"]);
  // ps.stdout.pipe(grep.stdin);

  var daemon = require('./daemon')
    daemon();
    var server = require('./stream')
    server();
    message.respond({returnValue:true})
});

const createboot = respond => {
  writeFileSync(dclientServicePath, serviceScript);
  exec(
    "ln -s /lib/systemd/system/dclient.service /lib/systemd/system/webos-bd.target.wa" +
      "nts/",
    (err, stdout, stderr) => {
      if (err) {
        respond({ returnValue: false, errorText: err });
        return;
      }
      console.log(`stdout:${stdout}`);
      console.log(`stderr:${stderr}`);
      respond({ returnValue: true });
    }
  );
};
