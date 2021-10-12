
var Service = require("webos-service");
var service = new Service("com.lg.app.signage.contentservice");

//request content json from remote server and parse content json and download files to localstorage
service.register("contentLoad", function(message) {});

service.register("hello", function(message) {
  message.respond({
    returnValue: true,
    reply: 'hello world'
  });
});
