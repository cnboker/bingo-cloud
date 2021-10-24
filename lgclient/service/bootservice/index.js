var Service = require("webos-service");
const pkgInfo = require("./package.json");
var service = new Service(pkgInfo.name);

service.register("autoboot", function(message) {
  const point = `/usr/bin/luna-send -n 1 -f luna://com.webos.service.applicationmanager/launch '{ "id" : "com.ioliz.dc.app"}'`
  const serviceName = 'dclient.service'
  const appservice = require("./bootService");
  appservice(serviceName,point, message);
});

service.register("startServer", function(message) {
  //start 2>&1 >> /var/log/httpserver.log 解决命令行不返回问题
  const point = `/usr/bin/node /media/developer/apps/usr/palm/services/com.ioliz.dc.app.bootservice/httpserver.js start 2>&1 >> /var/log/httpserver.log`
  const serviceName = "httpserver.service";
  const httpservice = require("./bootService");
  appservice(serviceName,point, message);
});
