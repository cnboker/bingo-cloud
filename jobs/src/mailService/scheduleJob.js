
import {sendFromRemoteAPI} from './mailJober';

var schedule = require("node-schedule");
var moment = require('moment')

//30 s
schedule.scheduleJob("*/30 * * * * *", function() {
  console.log('send ----',moment().format("HH:mm:ss"));
  sendFromRemoteAPI()
});



