const { existsSync, writeFileSync } = require("fs");
const { exec } = require("child_process");

module.exports = function(serviceName, execStart, message) {
  //const serviceName = "dclient.service";
  const servicePath = `/lib/systemd/system/${serviceName}`;

  const serviceRemoveScript = `
      systemctl stop ${serviceName} && 
      systemctl disable ${serviceName} && 
      rm /lib/systemd/system/webos-bd.target.wants/${serviceName}  && 
      rm /lib/systemd/system/${serviceName} && 
      systemctl daemon-reload && 
      systemctl reset-failed
`;
  //
  const serviceScript = `
      [Unit]
      Description=webos - "%n"

      [Service]
      Type=simple
      ExecStart=${execStart}
      `;
  if (existsSync(servicePath)) {
    exec(serviceRemoveScript, (err, stdout, stderr) => {
      console.log("serviceRemoveScript", err, stdout);
      // if (err) {
      //   message.respond({ returnValue: false, errorText: err });
      //   return;
      // }
      createBootService(serviceName, serviceScript, message);
    });
  } else {
    createBootService(serviceName, serviceScript, message);
  }
};

const createBootService = (serviceName, serviceScript, message) => {
  const servicePath = `/lib/systemd/system/${serviceName}`;
  writeFileSync(servicePath, serviceScript);
  exec(
    `ln -s /lib/systemd/system/${serviceName} /lib/systemd/system/webos-bd.target.wants/`,
    (err, stdout, stderr) => {
      // if (err) {
      //   message.respond({ returnValue: false, errorText: err });
      //   return;
      // }
      console.log(`stdout:${stdout}`);
      console.log(`stderr:${stderr}`);
      exec(`systemctl enable ${serviceName} && systemctl start ${serviceName}`,(err,stdout,stderr)=>{
        console.log(err,stdout)
      })
      message.respond({ returnValue: true });
    }
  );
};
