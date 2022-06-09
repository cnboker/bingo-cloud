using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Text;

namespace ImageThumbnail.AspNetCore.Middleware
{
    public class ThumbnailRequest
    {
        public PathString RequestedPath { get; set; }

        public string SourceImagePath { get; set; }

        public string ThumbnailImagePath { get; set; }
        public string ThumbnailImageUrl {get;set;}
        public Size? ThumbnailSize { get; set; }
    

    }

    public class VideoThumbnailRequest {
        //视频虚拟路径,比如http://file.ioliz.com/admin/video/test.mp4?size=500X?
        public string SourcePath {get;set;}
        //视频文件物理路径
        public string VideoSavePath {get;set;}
        //生成缩微图的存储路径
        public string ThumbnailSavePath {get;set;}
    }
}