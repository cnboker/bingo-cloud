const { existsSync, writeFileSync } = require("fs");
const { exec } = require("child_process");
require('./fileLogger')
function install(serviceName, execStart, message, type='simple') {
  //const serviceName = "dclient.service";
  const servicePath = `/lib/systemd/system/${serviceName}`;
  //
  const serviceScript = `
      [Unit]
      Description=webos - "%n"

      [Service]
      Type=${type}
      ExecStart=${execStart}
      `;
  const enableAndStartScript = `
    ln -s /lib/systemd/system/${serviceName} /lib/systemd/system/webos-bd.target.wants/ &&
    systemctl enable ${serviceName} && 
    systemctl start ${serviceName}
  `;

  const _install = () => {
    writeFileSync(servicePath, serviceScript);
    exec(enableAndStartScript, (err, stdout, stderr) => {
      message.respond({ returnValue: true });
    });
  };

  if (existsSync(servicePath)) {
    uninstall(serviceName,message).finally(() => {
      _install();
    });
  } else {
    _install();
  }
}

function uninstall(serviceName,message) {
  const script = `
      systemctl stop ${serviceName} && 
      systemctl disable ${serviceName} && 
      rm /lib/systemd/system/webos-bd.target.wants/${serviceName}  && 
      rm /lib/systemd/system/${serviceName} && 
      systemctl daemon-reload && 
      systemctl reset-failed
`;
  return new Promise((resolve, reject) => {
    exec(script, (err, stdout, stderr) => {
      if (err && message) {
        //message.respond({ returnValue: false, errorText: err });
        reject(err);
      } else {
        resolve(stdout);
        if(message){
          //message.respond({ returnValue: true });
        }
      }
    });
  });
}

module.exports = {
  install,
  uninstall
};
