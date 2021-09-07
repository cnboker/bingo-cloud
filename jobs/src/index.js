// Transpile all code following this line with babel and use '@babel/preset-env' (aka ES6) preset.
require('./es6')

// Import the rest of our application.
module.exports = require("./mailService/scheduleJob");
