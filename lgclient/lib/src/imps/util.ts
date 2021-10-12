export function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    var r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function guid(len: number) {
  var buf = [],
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    charlen = chars.length,
    length = len || 32;

  for (var i = 0; i < length; i++) {
    buf[i] = chars.charAt(Math.floor(Math.random() * charlen));
  }

  return buf.join("");
}

/**
 * escape('/UploadFiles/file1013/images/timg (1).jpg')="/UploadFiles/file1013/images/timg%20%281%29.jpg"
 * encodeURI('/UploadFiles/file1013/images/timg (1).jpg')="/UploadFiles/file1013/images/timg%20(1).jpg"
 * encodeURIComponent('/UploadFiles/file1013/images/timg (1).jpg');"%2FUploadFiles%2Ffile1013%2Fimages%2Ftimg%20(1).jpg"
 * webos 含%的文件名称无法读取所有用"_"替换
 */
export function safeUrl(url: string) {
  //return url;
   return escape(url).replace(/%/g, "_");
  // var index = url.lastIndexOf("/");
  // var path = url.substr(0, index);
  // var file = url.substr(index + 1);
  // return path + "/" + encodeURIComponent(file);
}

