//

module.exports = async function override(config) {
    //do stuff with the webpack config...
    //console.log(config);
    // config.mode = 'development';
    // config.optimization.runtimeChunk = false;
    // config.optimization.minimize = false; 
    //await cmd();
    return config;
};


async function  cmd(){
    const { exec } = require("child_process");
    
    var isWin = process.platform === "win32";
    var cmdLine = '@powershell -NoProfile -ExecutionPolicy Unrestricted -Command ./before_build_win.ps1'
    if(!isWin){
        cmdLine = 'bash ./before_build.sh'
    }
    console.log('cmd',cmdLine)
    return new Promise((resolve,reject)=>{
        exec(cmdLine, (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                reject(error.message)
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                reject(stderr)
            }
            console.log(`stdout: ${stdout}`);
            resolve(stdout)
        });
    })
 
}