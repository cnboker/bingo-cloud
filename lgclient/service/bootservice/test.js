require("./fileLogger");

const message = {};
message.respond = result => {
  console.log(result);
};

const point = `/usr/bin/luna-send -n 1 -f luna://com.webos.service.applicationmanager/launch '{ "id" : "com.ioliz.dc.app"}'`;
const serviceName = "dclient.service";
const appservice = require("./bootService");
appservice(serviceName, point, message);

const point1 = `/usr/bin/node /media/developer/apps/usr/palm/services/com.ioliz.dc.app.bootservice/httpserver.js`;
const serviceName1 = "httpserver.service";
const httpservice = require("./bootService");
httpservice(serviceName1, point1, message);
