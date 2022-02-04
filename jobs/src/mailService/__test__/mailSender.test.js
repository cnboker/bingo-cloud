require("../../es6");
import { mailSend,templateHtml,sendFromRemoteAPI } from "../mailJober";

describe("Email send test", () => {
  beforeAll(() => {
    /* Runs before all tests */
    require('dotenv').config()
  });
  afterAll(() => {
    /* Runs after all tests */
  });
  beforeEach(() => {
    /* Runs before each test */
  });
  afterEach(() => {
    /* Runs after each test */
  });

  test("send mail is ok", async () => {
    await templateHtml({
      templateId: "mailConfirm",
      emailAddress: "6348816@qq.com",
      title: "Email Confirm",
      parameter1: "http://www.baidu.com",
    });
  });


  test("sendFromRemoteAPI test", async () => {
    await sendFromRemoteAPI();
  });

});
