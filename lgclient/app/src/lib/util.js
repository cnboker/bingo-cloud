import { util } from "lgservice";
import config from "../config";
export function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export function guid(len) {
    var buf = [],
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        charlen = chars.length,
        length = len || 32;

    for (var i = 0; i < length; i++) {
        buf[i] = chars.charAt(Math.floor(Math.random() * charlen));
    }

    return buf.join("");
}

//获取磁盘存在的webos urls链接
export function fileExistWebOSUrls(urls){
    // if (!process.env.REACT_APP_DEBUG) {
    //   const fileInstance = config.configInstance.fileIOInstance;
    //   urls = await filter(urls, async url => {
    //     return await fileInstance.exists(url);
    //   });  
    // }
    urls = urls.map(x => {
        return webOSUrl(x);
    });
    return urls;
}

// async function filter(arr, callback) {
//   const fail = Symbol();
//   return (
//     await Promise.all(
//       arr.map(async item => ((await callback(item)) ? item : fail))
//     )
//   ).filter(i => i !== fail);
// }


//本地文件url
export function webOSUrl(url) {
    if (process.env.REACT_APP_STAGE === "dev") {
        return `${config.REACT_APP_LG_URL}${url}`;
    }
    return `${config.REACT_APP_LG_URL}${util.safeUrl(url)}`;
}
