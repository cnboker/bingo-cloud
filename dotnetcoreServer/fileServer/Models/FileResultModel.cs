using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace FileServer.Models
{
    public class FileResultModel
    {
        public string Path { get; set; }
        public string FileName { get; set; }
        [JsonIgnore]
        //完整的URL地址
        public string FullUrl { get; set; }

        //
        public string TaskPercentRequestUrl
        {
            get
            {
                if (!string.IsNullOrEmpty(FullUrl))
                {
                    return AppInstance.Instance.Config.FFMpegServer + "/dataProgress?url=" + FullUrl;
                }
                return null;
            }
        }
        //如果上传的是视频文件，这里首先返回一个等待的图片
        public string ThumbnailUrl { get; set; }
        //如果是视频文件，编码后的文件存储位置
        [JsonIgnore]
        public string SavePath { get; set; }
        //视频是否需要编码
        public bool EncodeRequired {get;set;}
      
    }
}