//'use strict';
const nodemailer = require("nodemailer");

export default class SMTPClient {
  constructor(config) {
    var config = {
      pool: true,
      host: config.host,
      port: config.port,
      secure: config.secure, // true for 465, false for other ports
      auth: {
        user: config.user, // generated ethereal user
        pass: config.pass // generated ethereal password
      },
      tls: {
        rejectUnauthorized: false
      }
    };
    //console.log("config", config);
    this.smtpUser = config.user;
    this.transporter = nodemailer.createTransport(config);
  }

  send(mailOptions) {
    console.log("mailOptions", mailOptions);
    // send mail with defined transport object
    this.transporter.sendMail(mailOptions, (e, info) => {
      if (e) {
        throw e;
      }
    });
  }
}
