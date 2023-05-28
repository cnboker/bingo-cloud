using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace FileServer.Models
{
    public class FileResultModel
    {
        //文件完整URL
        public string Path { get; set; }
        //文件名称
        public string FileName { get; set; }
        //如果上传的是视频文件，这里首先返回一个等待的图片
        public string ThumbnailUrl { get; set; }
        //如果是视频文件，编码后的文件存储位置
    }

    public class VideoFileResultModel : FileResultModel
    {
        [JsonIgnore]
        //视频未编码前的URL
        public string TmpUrl { get; set; }
        //视频未编码前存储物理路径
        [JsonIgnore]
        public string TmpPath {get;set;}
        [JsonIgnore]
        //视频编码后的存储物理路径
        public string SavePath { get; set; }
        //视频是否需要编码
        [JsonIgnore]
        public bool EncodeRequired { get; set; }
        //客户端查看视频编码进度路径
        public string TaskPercentRequestUrl
        {
           get;set;
        }
    }
}