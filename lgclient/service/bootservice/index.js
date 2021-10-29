var Service = require("webos-service");
const pkgInfo = require("./package.json");
var service = new Service(pkgInfo.name);
const appservice = require("./bootService");
const {install,uninstall} = appservice

service.register("appboot/install", function(message) {
  const point = `/usr/bin/luna-send -n 1 -f luna://com.webos.service.applicationmanager/launch '{ "id" : "com.ioliz.dc.app"}'`;
  const serviceName = "dclient.service"
  install(serviceName, point, message,'oneshot');
});

service.register("appboot/uninstall", function(message) {
  const serviceName = "dclient.service";
  uninstall(serviceName, message);
});

service.register("httpserver/install", function(message) {
  //start 2>&1 >> /var/log/httpserver.log 解决命令行不返回问题
  const point = `/usr/bin/node /media/developer/apps/usr/palm/services/com.ioliz.dc.app.bootservice/httpserver.js start 2>&1 >> /var/log/httpserver.log`;
  const serviceName = "httpserver.service";
  install(serviceName, point, message);
});

service.register("httpserver/uninstall", function(message) {
  const serviceName = "httpserver.service";
  uninstall(serviceName, message);
});
