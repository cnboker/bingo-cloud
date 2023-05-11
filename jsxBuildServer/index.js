const { postData } = require("./src/data");
const { make } = require("./src/httpserver/postHandler");
const { httpserver } = require("./src/httpserver/index");

// const username = "admin";

// make(username, postData).then((res) => {
//   console.log(res);
// });

 httpserver()
