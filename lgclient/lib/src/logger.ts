"use strict";

var logger = {
    info: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var output = '';
        for (var _a = 0, args_1 = args; _a < args_1.length; _a++) {
            var arg = args_1[_a];
            if (typeof arg === 'object') {
                output += ' ' + JSON.stringify(arg);
            }
            else {
                output += ' ' + arg;
            }
        }
        //https://shapeshed.com/writing-cross-platform-node/
        //Cross Platform Newline Characters
        //log_file.write(util.format(output) + EOL);
       console.log(output)
        //console.info(output)
    }
};
module.exports = logger;
