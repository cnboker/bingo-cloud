import DSSvcClient from "../imps/ClientAPI";
import { expect } from "chai";
import "mocha";
require("../config");

const client = new DSSvcClient();

// describe('api notify', () => {
//   it('api notify return is not null', () => {
//     client.notify().then(x => {
//       //console.log(x.data)
//       expect(x.data).to.not.be.null;
//     })
//   });
// });

// describe('api getcontent', () => {
//   it('api notify return is not null', () => {
//     client.getContent(3).then(x => {
//       //console.log(x.data)
//       expect(x.data).to.not.be.null;
//     })
//   });
// });

describe("api getweather", async () => {
  it("api getweather return is not null", async () => {
    var x = await client.getWeather("深圳");
    console.log(x.data);
    expect(x.data).to.not.be.null;
  });
});
