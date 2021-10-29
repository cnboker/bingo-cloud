//require("./fileLogger");

const message = {};
message.respond = result => {
  console.log('message->', result);
};


const ps = '{ "id" : "com.ioliz.dc.app"}'
const point = `/usr/bin/luna-send -n 1 -f luna://com.webos.service.applicationmanager/launch '${ps}'`;
console.log('point', point)
const serviceName = "dclient.service";
const appservice = require("./bootService");
const {install} = appservice
//appservice.uninstall(serviceName)
install(serviceName, point, message,'oneshot');

const point1 = `/usr/bin/node /media/developer/apps/usr/palm/services/com.ioliz.dc.app.bootservice/httpserver.js`;
const serviceName1 = "httpserver.service";
const httpservice = require("./bootService");
//appservice.uninstall(serviceName1)
install(serviceName1, point1, message);
