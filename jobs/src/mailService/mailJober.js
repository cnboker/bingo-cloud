import { SmtpConfig } from "./stmpConfig";
import { mailQuery, mailStatusUpdate } from "./remoteAPI";
import EmailTemplate from "email-templates";
import SMTPClient from "./smtpClient";

const smtpClient = new SMTPClient(SmtpConfig);
const emailTemplate = new EmailTemplate();
const SendSuccess = 1;
const SendFailure = 2;

export const sendFromRemoteAPI = () => {
  mailQuery()
    .then((res) => {
      //console.log("mail data:", res.data);
      for (let i = 0; i < res.data.length; i++) {
        mailSend(res.data[i])
          .then((messageId) => {
            mailStatusUpdate(messageId, SendSuccess);
          })
          .catch((messageId) => {
            mailStatusUpdate(messageId, SendFailure);
          });
      }
    })
    .catch((e) => console.log(e.message));
};

export const templateHtml = async (msg) => {
  return await emailTemplate.render(msg.templateId, {
    title: msg.title,
    email: msg.emailAddress,
    p1: msg.parameter1,
    p2: msg.parameter2,
    p3: msg.parameter3,
    p4: msg.parameter4,
  });
};

export const mailSend = (msg) => {
  return new Promise(async (resolve, reject) => {
    var html = await templateHtml(msg);
    try {
      console.log("html", html);
      let mailOptions = {
        from: SmtpConfig.from, // sender address,必须是auth.user里面的邮箱
        to: msg.emailAddress, // list of receivers
        subject: msg.title, // Subject line
        html: html, // html body
      };
      // console.log(html);
      smtpClient.send(mailOptions);
      resolve(msg.id);
    } catch (e) {
      reject(msg.id);
    }
  });
};
